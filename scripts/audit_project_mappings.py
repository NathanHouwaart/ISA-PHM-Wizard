#!/usr/bin/env python3
"""
Audit ISA-PHM exported project mapping integrity and effective usage.

Usage:
  python scripts/audit_project_mappings.py src/data/project-sietze-new.json
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple


def as_array(value: Any) -> List[Any]:
    return value if isinstance(value, list) else []


def parse_json_value(value: Any, fallback: Any) -> Any:
    if value is None:
        return fallback
    if not isinstance(value, str):
        return value
    try:
        parsed = json.loads(value)
        return parsed if parsed is not None else fallback
    except Exception:
        return fallback


@dataclass
class AuditIssue:
    mapping: str
    index: int
    reason: str
    value: Any


def read_project_value(local_storage: Dict[str, Any], project_id: str, key: str, fallback: Any) -> Any:
    candidates = [
        f"globalAppData_{project_id}_{key}",
        f"globalAppData_default_{key}",
        f"globalAppData_{key}",
    ]
    if key == "investigation":
        candidates.append(f"globalAppData_{project_id}_investigations")
        candidates.append("globalAppData_default_investigations")

    for storage_key in candidates:
        if storage_key in local_storage:
            return parse_json_value(local_storage[storage_key], fallback)
    return fallback


def iter_runs(studies: List[Dict[str, Any]]) -> Iterable[Tuple[str, str]]:
    for study in studies:
        study_id = study.get("id")
        if not study_id:
            continue
        run_count = study.get("runCount", study.get("total_runs", 1))
        try:
            run_count = int(run_count)
        except Exception:
            run_count = 1
        for run_number in range(1, max(run_count, 1) + 1):
            run_id = f"{study_id}::run-{run_number:02d}"
            yield (study_id, run_id)


def selection_lookup(entries: List[Dict[str, Any]]) -> Dict[str, str]:
    result: Dict[str, str] = {}
    for entry in entries:
        study_id = entry.get("studyId")
        if study_id:
            result[study_id] = entry.get("protocolId") or ""
    return result


def first_match_usage(
    mappings: List[Dict[str, Any]],
    studies: List[Dict[str, Any]],
    sensors: List[Dict[str, Any]],
) -> Tuple[Set[int], List[int]]:
    used: Set[int] = set()
    ordered_runs = [{"studyId": sid, "runId": rid} for sid, rid in iter_runs(studies)]

    for run in ordered_runs:
        for sensor in sensors:
            sensor_id = sensor.get("id")
            for idx, mapping in enumerate(mappings):
                if mapping.get("sensorId") != sensor_id:
                    continue
                if mapping.get("studyRunId"):
                    if mapping.get("studyRunId") == run["runId"]:
                        used.add(idx)
                        break
                elif mapping.get("studyId") == run["studyId"]:
                    used.add(idx)
                    break

    shadowed = [idx for idx in range(len(mappings)) if idx not in used]
    return used, shadowed


def audit(file_path: Path) -> Dict[str, Any]:
    root = json.loads(file_path.read_text(encoding="utf-8"))
    local_storage = root.get("localStorage", {})
    project_id = root.get("projectId", "default")

    studies = as_array(read_project_value(local_storage, project_id, "studies", []))
    study_variables = as_array(read_project_value(local_storage, project_id, "studyVariables", []))

    study_to_study_variable_mapping = as_array(
        read_project_value(local_storage, project_id, "studyToStudyVariableMapping", [])
    )
    study_to_sensor_measurement_mapping = as_array(
        read_project_value(local_storage, project_id, "studyToSensorMeasurementMapping", [])
    )
    study_to_sensor_processing_mapping = as_array(
        read_project_value(local_storage, project_id, "studyToSensorProcessingMapping", [])
    )
    study_to_measurement_protocol_selection = as_array(
        read_project_value(local_storage, project_id, "studyToMeasurementProtocolSelection", [])
    )
    study_to_processing_protocol_selection = as_array(
        read_project_value(local_storage, project_id, "studyToProcessingProtocolSelection", [])
    )
    global_sensor_to_measurement_protocol_mapping = as_array(
        read_project_value(local_storage, project_id, "sensorToMeasurementProtocolMapping", [])
    )
    global_sensor_to_processing_protocol_mapping = as_array(
        read_project_value(local_storage, project_id, "sensorToProcessingProtocolMapping", [])
    )

    selected_setup = root.get("selectedTestSetup", {})
    sensors = as_array(selected_setup.get("sensors", []))
    measurement_protocol_variants = as_array(selected_setup.get("measurementProtocols", []))
    processing_protocol_variants = as_array(selected_setup.get("processingProtocols", []))
    sensor_to_measurement_protocol_mapping = as_array(
        selected_setup.get("sensorToMeasurementProtocolMapping", [])
    )
    sensor_to_processing_protocol_mapping = as_array(
        selected_setup.get("sensorToProcessingProtocolMapping", [])
    )

    study_ids = {study.get("id") for study in studies if study.get("id")}
    run_ids = {run_id for _, run_id in iter_runs(studies)}
    study_variable_ids = {item.get("id") for item in study_variables if item.get("id")}
    sensor_ids = {sensor.get("id") for sensor in sensors if sensor.get("id")}

    measurement_protocol_ids = {
        item.get("id") for item in measurement_protocol_variants if item.get("id")
    }
    processing_protocol_ids = {
        item.get("id") for item in processing_protocol_variants if item.get("id")
    }
    measurement_parameter_ids = {
        parameter.get("id")
        for protocol in measurement_protocol_variants
        for parameter in as_array(protocol.get("parameters", []))
        if parameter.get("id")
    }
    processing_parameter_ids = {
        parameter.get("id")
        for protocol in processing_protocol_variants
        for parameter in as_array(protocol.get("parameters", []))
        if parameter.get("id")
    }

    issues: List[AuditIssue] = []

    def add_issue(mapping: str, index: int, reason: str, value: Any) -> None:
        issues.append(AuditIssue(mapping=mapping, index=index, reason=reason, value=value))

    for index, mapping in enumerate(study_to_study_variable_mapping):
        variable_id = mapping.get("studyVariableId")
        study_id = mapping.get("studyId")
        study_run_id = mapping.get("studyRunId")
        if variable_id not in study_variable_ids:
            add_issue("studyToStudyVariableMapping", index, "unknown studyVariableId", variable_id)
        if study_run_id:
            if study_run_id not in run_ids:
                add_issue("studyToStudyVariableMapping", index, "unknown studyRunId", study_run_id)
        elif study_id:
            if study_id not in study_ids:
                add_issue("studyToStudyVariableMapping", index, "unknown studyId", study_id)
        else:
            add_issue("studyToStudyVariableMapping", index, "missing studyId/studyRunId", None)

    for name, mappings in (
        ("studyToSensorMeasurementMapping", study_to_sensor_measurement_mapping),
        ("studyToSensorProcessingMapping", study_to_sensor_processing_mapping),
    ):
        for index, mapping in enumerate(mappings):
            sensor_id = mapping.get("sensorId")
            study_id = mapping.get("studyId")
            study_run_id = mapping.get("studyRunId")
            if sensor_id not in sensor_ids:
                add_issue(name, index, "unknown sensorId", sensor_id)
            if study_run_id:
                if study_run_id not in run_ids:
                    add_issue(name, index, "unknown studyRunId", study_run_id)
            elif study_id:
                if study_id not in study_ids:
                    add_issue(name, index, "unknown studyId", study_id)
            else:
                add_issue(name, index, "missing studyId/studyRunId", None)

    for name, mappings, protocol_ids, parameter_ids in (
        (
            "sensorToMeasurementProtocolMapping",
            sensor_to_measurement_protocol_mapping,
            measurement_protocol_ids,
            measurement_parameter_ids,
        ),
        (
            "sensorToProcessingProtocolMapping",
            sensor_to_processing_protocol_mapping,
            processing_protocol_ids,
            processing_parameter_ids,
        ),
    ):
        for index, mapping in enumerate(mappings):
            source_id = mapping.get("sourceId") or mapping.get("sensorId")
            target_id = mapping.get("targetId")
            protocol_id = mapping.get("protocolId")
            if source_id not in sensor_ids:
                add_issue(name, index, "unknown source sensorId", source_id)
            if target_id and target_id not in parameter_ids:
                add_issue(name, index, "unknown targetId", target_id)
            if protocol_id and protocol_id not in protocol_ids:
                add_issue(name, index, "unknown protocolId", protocol_id)

    for name, mappings, protocol_ids in (
        ("studyToMeasurementProtocolSelection", study_to_measurement_protocol_selection, measurement_protocol_ids),
        ("studyToProcessingProtocolSelection", study_to_processing_protocol_selection, processing_protocol_ids),
    ):
        for index, mapping in enumerate(mappings):
            study_id = mapping.get("studyId")
            protocol_id = mapping.get("protocolId")
            if study_id not in study_ids:
                add_issue(name, index, "unknown studyId", study_id)
            if protocol_id not in protocol_ids:
                add_issue(name, index, "unknown protocolId", protocol_id)

    measurement_selection = selection_lookup(study_to_measurement_protocol_selection)
    processing_selection = selection_lookup(study_to_processing_protocol_selection)

    selected_measurement_by_study = {
        study.get("id"): (study.get("measurementProtocolId") or measurement_selection.get(study.get("id")) or "")
        for study in studies
        if study.get("id")
    }
    selected_processing_by_study = {
        study.get("id"): (study.get("processingProtocolId") or processing_selection.get(study.get("id")) or "")
        for study in studies
        if study.get("id")
    }

    used_measurement_mapping_indexes: Set[int] = set()
    unused_measurement_mapping_indexes: Set[int] = set()
    for index, mapping in enumerate(sensor_to_measurement_protocol_mapping):
        source_id = mapping.get("sourceId") or mapping.get("sensorId")
        protocol_id = mapping.get("protocolId") or ""
        if source_id not in sensor_ids:
            unused_measurement_mapping_indexes.add(index)
            continue
        used = False
        for selected_protocol in selected_measurement_by_study.values():
            if not selected_protocol or selected_protocol == protocol_id:
                used = True
                break
        if used:
            used_measurement_mapping_indexes.add(index)
        else:
            unused_measurement_mapping_indexes.add(index)

    used_processing_mapping_indexes: Set[int] = set()
    unused_processing_mapping_indexes: Set[int] = set()
    for index, mapping in enumerate(sensor_to_processing_protocol_mapping):
        source_id = mapping.get("sourceId") or mapping.get("sensorId")
        protocol_id = mapping.get("protocolId") or ""
        if source_id not in sensor_ids:
            unused_processing_mapping_indexes.add(index)
            continue
        used = False
        for selected_protocol in selected_processing_by_study.values():
            if not selected_protocol or selected_protocol == protocol_id:
                used = True
                break
        if used:
            used_processing_mapping_indexes.add(index)
        else:
            unused_processing_mapping_indexes.add(index)

    used_raw_indexes, shadowed_raw_indexes = first_match_usage(
        study_to_sensor_measurement_mapping, studies, sensors
    )
    used_processed_indexes, shadowed_processed_indexes = first_match_usage(
        study_to_sensor_processing_mapping, studies, sensors
    )

    ignored_measurement_selection_indexes = []
    for index, entry in enumerate(study_to_measurement_protocol_selection):
        study_id = entry.get("studyId")
        matching_study = next((study for study in studies if study.get("id") == study_id), None)
        if matching_study and matching_study.get("measurementProtocolId"):
            ignored_measurement_selection_indexes.append(index)

    ignored_processing_selection_indexes = []
    for index, entry in enumerate(study_to_processing_protocol_selection):
        study_id = entry.get("studyId")
        matching_study = next((study for study in studies if study.get("id") == study_id), None)
        if matching_study and matching_study.get("processingProtocolId"):
            ignored_processing_selection_indexes.append(index)

    return {
        "projectId": project_id,
        "summary": {
            "studies": len(studies),
            "studyVariables": len(study_variables),
            "sensors": len(sensors),
            "measurementProtocolVariants": len(measurement_protocol_variants),
            "processingProtocolVariants": len(processing_protocol_variants),
            "mappings": {
                "studyToStudyVariableMapping": len(study_to_study_variable_mapping),
                "studyToSensorMeasurementMapping": len(study_to_sensor_measurement_mapping),
                "studyToSensorProcessingMapping": len(study_to_sensor_processing_mapping),
                "sensorToMeasurementProtocolMapping": len(sensor_to_measurement_protocol_mapping),
                "sensorToProcessingProtocolMapping": len(sensor_to_processing_protocol_mapping),
                "studyToMeasurementProtocolSelection": len(study_to_measurement_protocol_selection),
                "studyToProcessingProtocolSelection": len(study_to_processing_protocol_selection),
            },
            "localStorageFallbackMappings": {
                "sensorToMeasurementProtocolMapping": len(global_sensor_to_measurement_protocol_mapping),
                "sensorToProcessingProtocolMapping": len(global_sensor_to_processing_protocol_mapping),
            },
        },
        "validationIssues": [
            {
                "mapping": issue.mapping,
                "index": issue.index,
                "reason": issue.reason,
                "value": issue.value,
            }
            for issue in issues
        ],
        "effectiveUsage": {
            "sensorToMeasurementProtocolMapping": {
                "used": len(used_measurement_mapping_indexes),
                "unused": len(unused_measurement_mapping_indexes),
                "unusedIndexes": sorted(unused_measurement_mapping_indexes),
            },
            "sensorToProcessingProtocolMapping": {
                "used": len(used_processing_mapping_indexes),
                "unused": len(unused_processing_mapping_indexes),
                "unusedIndexes": sorted(unused_processing_mapping_indexes),
            },
            "studyToSensorMeasurementMapping": {
                "used": len(used_raw_indexes),
                "unusedOrShadowed": len(shadowed_raw_indexes),
                "unusedOrShadowedIndexes": shadowed_raw_indexes,
            },
            "studyToSensorProcessingMapping": {
                "used": len(used_processed_indexes),
                "unusedOrShadowed": len(shadowed_processed_indexes),
                "unusedOrShadowedIndexes": shadowed_processed_indexes,
            },
            "studyToMeasurementProtocolSelection": {
                "ignoredByStudyField": len(ignored_measurement_selection_indexes),
                "ignoredIndexes": ignored_measurement_selection_indexes,
            },
            "studyToProcessingProtocolSelection": {
                "ignoredByStudyField": len(ignored_processing_selection_indexes),
                "ignoredIndexes": ignored_processing_selection_indexes,
            },
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit mapping integrity for an exported ISA-PHM project JSON.")
    parser.add_argument("file", type=Path, help="Path to project export JSON file.")
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print machine-readable JSON output only.",
    )
    args = parser.parse_args()

    report = audit(args.file)
    issues = report["validationIssues"]

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"Project: {report['projectId']}")
        print("Summary:")
        summary = report["summary"]
        print(f"  studies={summary['studies']} studyVariables={summary['studyVariables']} sensors={summary['sensors']}")
        print(
            "  protocolVariants="
            f"measurement:{summary['measurementProtocolVariants']} processing:{summary['processingProtocolVariants']}"
        )
        print("  mappings:")
        for key, count in summary["mappings"].items():
            print(f"    - {key}: {count}")
        print(
            "  localStorageFallbackMappings:"
            f" measurement={summary['localStorageFallbackMappings']['sensorToMeasurementProtocolMapping']}"
            f" processing={summary['localStorageFallbackMappings']['sensorToProcessingProtocolMapping']}"
        )

        print(f"Validation issues: {len(issues)}")
        for issue in issues:
            print(
                f"  - {issue['mapping']}[{issue['index']}]: "
                f"{issue['reason']} ({issue['value']})"
            )

        usage = report["effectiveUsage"]
        print("Effective usage:")
        print(
            "  - sensorToMeasurementProtocolMapping: "
            f"used={usage['sensorToMeasurementProtocolMapping']['used']} "
            f"unused={usage['sensorToMeasurementProtocolMapping']['unused']}"
        )
        print(
            "  - sensorToProcessingProtocolMapping: "
            f"used={usage['sensorToProcessingProtocolMapping']['used']} "
            f"unused={usage['sensorToProcessingProtocolMapping']['unused']}"
        )
        print(
            "  - studyToSensorMeasurementMapping: "
            f"used={usage['studyToSensorMeasurementMapping']['used']} "
            f"unusedOrShadowed={usage['studyToSensorMeasurementMapping']['unusedOrShadowed']}"
        )
        print(
            "  - studyToSensorProcessingMapping: "
            f"used={usage['studyToSensorProcessingMapping']['used']} "
            f"unusedOrShadowed={usage['studyToSensorProcessingMapping']['unusedOrShadowed']}"
        )
        print(
            "  - studyToMeasurementProtocolSelection ignoredByStudyField="
            f"{usage['studyToMeasurementProtocolSelection']['ignoredByStudyField']}"
        )
        print(
            "  - studyToProcessingProtocolSelection ignoredByStudyField="
            f"{usage['studyToProcessingProtocolSelection']['ignoredByStudyField']}"
        )

    return 1 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main())

