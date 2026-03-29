#!/usr/bin/env python3
"""
Transform the Sietze dataset into ISA-PHM-ready 2-column files.

Features:
- Splits wide channel CSV files (time + many captures) into many 2-column files (time,value).
- Writes an ISA-oriented folder layout under an output root.
- Builds fresh studies/configurations/sensors overviews from dataset folders (not legacy examples).
- Builds a file mapping manifest for direct wizard population on Slides 9/10.

Default source:
    E:\\DatasetSietze\\Dataset\\Dataset
Default output:
    E:\\DatasetSietze\\ISA_PHM_ready
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import shutil
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple
from zipfile import ZipFile
import xml.etree.ElementTree as ET


DEFAULT_SOURCE_ROOT = Path(r"E:\DatasetSietze\Dataset\Dataset")
DEFAULT_OUTPUT_ROOT = Path(r"E:\DatasetSietze\ISA_PHM_ready")
DEFAULT_MEASUREMENT_OVERVIEW_XLSX = Path(r"E:\DatasetSietze\Appendices\Other\measurement overview.xlsx")
DEFAULT_VIBRATION_CHUNKS_PER_RUN = 5
DEFAULT_VIBRATION_CHUNK_SECONDS = 12.0


NS_MAIN = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"
RID_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


VIBRATION_SENSORS = {
    1: ("vib_ch_1", "Vibration", "Accelerometer", "Wilcoxon 786B-10", "Electric motor NDE bearing horizontal"),
    2: ("vib_ch_2", "Vibration", "Accelerometer", "Wilcoxon 786B-10", "Electric motor DE bearing vertical"),
    3: ("vib_ch_3", "Vibration", "Accelerometer", "Wilcoxon 786B-10", "Electric motor DE bearing axial"),
    4: ("vib_ch_4", "Vibration", "Accelerometer", "Wilcoxon 786B-10", "Pump DE bearing horizontal"),
    5: ("vib_ch_5", "Vibration", "Accelerometer", "Wilcoxon 786B-10", "Pump NDE bearing vertical"),
}

ELECTRIC_SENSORS = {
    1: ("curr_ph_1", "Current", "Current Clamp", "CR Magnetics CR3110", "Current phase 1"),
    2: ("curr_ph_2", "Current", "Current Clamp", "CR Magnetics CR3110", "Current phase 2"),
    3: ("curr_ph_3", "Current", "Current Clamp", "CR Magnetics CR3110", "Current phase 3"),
    4: ("volt_ph_1", "Voltage", "Voltage Tap", "Wago 855", "Voltage phase 1"),
    5: ("volt_ph_2", "Voltage", "Voltage Tap", "Wago 855", "Voltage phase 2"),
    6: ("volt_ph_3", "Voltage", "Voltage Tap", "Wago 855", "Voltage phase 3"),
}

SENSOR_MAP = {
    "Vibration": VIBRATION_SENSORS,
    "Electric": ELECTRIC_SENSORS,
}


CONFIGURATIONS = [
    {
        "configuration_id": "RC-001",
        "name": "Motor + Pump 2",
        "motor_id": "Motor-2",
        "motor_model": "MG160MA4042-H3",
        "motor_bearing": "6309.C4",
        "pump_model": "NK80-250/270 A2F2AE-SBQQE",
        "pump_bearing": "6308.2Z.C3.SYN",
    },
    {
        "configuration_id": "RC-002",
        "name": "Motor + Pump 4",
        "motor_id": "Motor-4",
        "motor_model": "MG180MB2-48-F1",
        "motor_bearing": "6310.C4",
        "pump_model": "NK80-160/167 A2F2AE-SBQQE",
        "pump_bearing": "6306.2Z.C3.SYN",
    },
]

CONFIG_BY_MOTOR = {cfg["motor_id"]: cfg for cfg in CONFIGURATIONS}


@dataclass(frozen=True)
class SourceRecord:
    method: str
    motor: str
    speed: str
    condition: str
    source_file: Path
    channel_number: int
    sensor_alias: str
    run_count: int

    @property
    def study_key(self) -> Tuple[str, str, str]:
        return (self.motor, self.speed, self.condition)


def normalize_text(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value or "unknown"


def parse_channel_number(file_name: str) -> int:
    match = re.search(r"-ch(\d+)\.csv$", file_name, flags=re.IGNORECASE)
    if not match:
        raise ValueError(f"Could not parse channel number from filename: {file_name}")
    return int(match.group(1))


def compute_run_count(
    method: str,
    signal_count: int,
    vibration_chunks_per_run: int,
) -> int:
    if signal_count <= 0:
        return 0
    if method == "Vibration":
        return math.ceil(signal_count / max(1, vibration_chunks_per_run))
    return signal_count


def parse_condition(condition: str) -> Tuple[str, str]:
    condition = condition.strip()
    match = re.match(r"^(.*?)(?:\s+([0-9]+[A-Za-z]*))?$", condition)
    if not match:
        return condition, ""
    base = (match.group(1) or "").strip()
    suffix = (match.group(2) or "").strip()
    if base and suffix and base.lower().endswith("healthy"):
        return condition, ""
    return base or condition, suffix


def as_float(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    text = text.replace(",", ".")
    text = re.sub(r"[^0-9.\-]+", "", text)
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def parse_speed_percent(raw: Optional[str]) -> Optional[int]:
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    if "/" in text:
        return None
    text = text.replace("%", "").replace(",", ".").strip()
    try:
        value = float(text)
    except ValueError:
        return None
    if value <= 1.0:
        value *= 100.0
    return int(round(value))


def parse_workbook_rows(xlsx_path: Path) -> List[dict]:
    if not xlsx_path.exists():
        return []

    with ZipFile(xlsx_path) as archive:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        rel_map = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in rels.findall(f"{REL_NS}Relationship")
        }

        shared_strings: List[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for si in shared.findall("m:si", NS_MAIN):
                txt = "".join(t.text or "" for t in si.findall(".//m:t", NS_MAIN))
                shared_strings.append(txt)

        sheet = workbook.find("m:sheets/m:sheet", NS_MAIN)
        if sheet is None:
            return []

        rid = sheet.attrib[RID_NS + "id"]
        target = rel_map[rid]
        sheet_path = "xl/" + target if not target.startswith("xl/") else target
        sheet_xml = ET.fromstring(archive.read(sheet_path))

    def col_index(cell_ref: str) -> int:
        letters = "".join(ch for ch in cell_ref if ch.isalpha())
        value = 0
        for ch in letters:
            value = value * 26 + (ord(ch.upper()) - 64)
        return value

    rows: List[Tuple[int, dict]] = []
    for row in sheet_xml.findall(".//m:sheetData/m:row", NS_MAIN):
        rnum = int(row.attrib["r"])
        values = {}
        for cell in row.findall("m:c", NS_MAIN):
            cidx = col_index(cell.attrib.get("r", "A1"))
            ctype = cell.attrib.get("t")
            v_el = cell.find("m:v", NS_MAIN)
            if v_el is None:
                is_t = cell.find("m:is/m:t", NS_MAIN)
                cell_value = is_t.text if is_t is not None else None
            else:
                raw = v_el.text
                if ctype == "s" and raw is not None:
                    cell_value = shared_strings[int(raw)]
                else:
                    cell_value = raw
            values[cidx] = cell_value
        rows.append((rnum, values))

    if len(rows) < 2:
        return []

    headers = [rows[1][1].get(i) for i in range(1, 11)]
    expected = [
        "Order",
        "Setup",
        "Failure description",
        "Severity",
        "Speed (%)",
        "Speed (RPM) +- 5",
        "Pressure (bar) +- 0.1",
        "Flow (m3/h) +- 5",
        "Alignment report",
        "Comments",
    ]
    if headers != expected:
        return []

    records: List[dict] = []
    for _, values in rows[2:]:
        record = {headers[i - 1]: values.get(i) for i in range(1, 11)}
        order_raw = str(record.get("Order") or "").strip()
        if not order_raw.isdigit():
            continue
        records.append(record)
    return records


def build_workbook_lookup(records: List[dict]) -> Dict[Tuple[str, str, str], dict]:
    """
    Build a lookup by (motor, speed, condition).
    """
    lookup: Dict[Tuple[str, str, str], dict] = {}
    by_condition_fallback: Dict[Tuple[str, str], dict] = {}

    for rec in records:
        setup = normalize_text(rec.get("Setup"))
        desc = normalize_text(rec.get("Failure description"))
        severity = normalize_text(rec.get("Severity"))
        speed_percent = parse_speed_percent(rec.get("Speed (%)"))

        if not desc:
            continue

        if severity and severity not in {"n/a", "na", "-"}:
            condition = f"{desc} {severity}".strip()
        else:
            condition = desc

        condition = condition.replace("  ", " ").strip()

        pressure = as_float(rec.get("Pressure (bar) +- 0.1"))
        flow = as_float(rec.get("Flow (m3/h) +- 5"))
        rpm = as_float(rec.get("Speed (RPM) +- 5"))

        payload = {
            "order": rec.get("Order"),
            "setup": rec.get("Setup"),
            "failure_description": rec.get("Failure description"),
            "severity": rec.get("Severity"),
            "speed_percent_raw": rec.get("Speed (%)"),
            "speed_rpm": rpm,
            "pressure_bar": pressure,
            "flow_m3h": flow,
            "alignment_report": rec.get("Alignment report"),
            "comments": rec.get("Comments"),
        }

        if setup in {"motor 2", "motor 4"} and speed_percent is not None:
            motor = "Motor-2" if setup == "motor 2" else "Motor-4"
            lookup[(motor, str(speed_percent), condition)] = payload
            by_condition_fallback[(motor, condition)] = payload

    # fallback for rows that are speed-ambiguous in workbook (e.g. "motor 2 & 4")
    for rec in records:
        setup = normalize_text(rec.get("Setup"))
        if setup != "motor 2 & 4":
            continue

        desc = normalize_text(rec.get("Failure description"))
        severity = normalize_text(rec.get("Severity"))
        if severity and severity not in {"n/a", "na", "-"}:
            condition = f"{desc} {severity}".strip()
        else:
            condition = desc
        condition = condition.replace("  ", " ").strip()

        payload = {
            "order": rec.get("Order"),
            "setup": rec.get("Setup"),
            "failure_description": rec.get("Failure description"),
            "severity": rec.get("Severity"),
            "speed_percent_raw": rec.get("Speed (%)"),
            "speed_rpm": as_float(rec.get("Speed (RPM) +- 5")),
            "pressure_bar": as_float(rec.get("Pressure (bar) +- 0.1")),
            "flow_m3h": as_float(rec.get("Flow (m3/h) +- 5")),
            "alignment_report": rec.get("Alignment report"),
            "comments": rec.get("Comments"),
        }
        for motor in ("Motor-2", "Motor-4"):
            by_condition_fallback[(motor, condition)] = payload

    # Promote fallback into specific speed keys where explicit record is missing.
    additional: Dict[Tuple[str, str, str], dict] = {}
    for (motor, condition), payload in by_condition_fallback.items():
        for speed in ("50", "75", "100", "70"):
            if motor == "Motor-4" and speed != "70":
                continue
            if motor == "Motor-2" and speed == "70":
                continue
            key = (motor, speed, condition)
            if key not in lookup:
                additional[key] = payload
    lookup.update(additional)
    return lookup


def discover_source_records(
    source_root: Path,
    vibration_chunks_per_run: int,
) -> List[SourceRecord]:
    records: List[SourceRecord] = []
    for source_file in sorted(source_root.rglob("*.csv")):
        rel = source_file.relative_to(source_root)
        if len(rel.parts) < 5:
            continue

        method, motor, speed, condition = rel.parts[0], rel.parts[1], rel.parts[2], rel.parts[3]
        if method not in SENSOR_MAP:
            continue

        channel = parse_channel_number(source_file.name)
        sensor_info = SENSOR_MAP[method].get(channel)
        if not sensor_info:
            raise ValueError(f"Unknown channel {channel} for method {method}: {source_file}")
        sensor_alias = sensor_info[0]

        with source_file.open("r", encoding="utf-8", errors="ignore", newline="") as fh:
            reader = csv.reader(fh)
            try:
                header = next(reader)
            except StopIteration:
                header = []
            signal_count = max(0, len(header) - 1)
            run_count = compute_run_count(method, signal_count, vibration_chunks_per_run)

        records.append(
            SourceRecord(
                method=method,
                motor=motor,
                speed=speed,
                condition=condition,
                source_file=source_file,
                channel_number=channel,
                sensor_alias=sensor_alias,
                run_count=run_count,
            )
        )
    return records


def write_csv(path: Path, rows: Iterable[Iterable[object]], header: Optional[List[str]] = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        if header:
            writer.writerow(header)
        for row in rows:
            writer.writerow(list(row))


def build_study_id(motor: str, speed: str, condition: str) -> str:
    return f"st_{slugify(motor)}_{slugify(speed)}_{slugify(condition)}"


def parse_numeric_time(value: str) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def format_time_value(value: float) -> str:
    text = f"{value:.8f}"
    text = text.rstrip("0").rstrip(".")
    return text or "0"


def split_source_file(
    record: SourceRecord,
    output_root: Path,
    file_mapping_rows: List[List[object]],
    vibration_chunks_per_run: int,
    vibration_chunk_seconds: float,
) -> None:
    study_id = build_study_id(record.motor, record.speed, record.condition)
    out_dir = (
        output_root
        / "raw"
        / study_id
        / record.method.lower()
        / record.sensor_alias
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    with record.source_file.open("r", encoding="utf-8", errors="ignore", newline="") as in_fh:
        reader = csv.reader(in_fh)
        try:
            header = next(reader)
        except StopIteration:
            return

        signal_headers = header[1:]
        signal_count = len(signal_headers)
        if signal_count == 0:
            return

        if record.method != "Vibration":
            handles = []
            writers = []
            output_files: List[Path] = []
            try:
                for run_idx, _ in enumerate(signal_headers, start=1):
                    out_file = out_dir / f"run_{run_idx:04d}.csv"
                    out_fh = out_file.open("w", encoding="utf-8", newline="")
                    writer = csv.writer(out_fh)
                    writer.writerow(["time", "value"])
                    handles.append(out_fh)
                    writers.append(writer)
                    output_files.append(out_file)

                for row in reader:
                    if not row:
                        continue
                    time_value = row[0] if len(row) > 0 else ""
                    for i, writer in enumerate(writers, start=1):
                        value = row[i] if i < len(row) else ""
                        writer.writerow([time_value, value])
            finally:
                for fh in handles:
                    fh.close()

            rel_source = record.source_file.as_posix()
            for run_idx, out_file in enumerate(output_files, start=1):
                source_col = str(run_idx - 1)
                file_mapping_rows.append(
                    [
                        study_id,
                        record.method,
                        record.motor,
                        record.speed,
                        record.condition,
                        record.channel_number,
                        record.sensor_alias,
                        run_idx,
                        source_col,
                        rel_source,
                        out_file.relative_to(output_root).as_posix(),
                    ]
                )
            return

        # Vibration:
        # 5 columns of 12s each represent one 60s run.
        chunks_per_run = max(1, vibration_chunks_per_run)
        run_count = compute_run_count(record.method, signal_count, chunks_per_run)

        # Write each chunk to a temporary per-run/per-chunk file in a single pass.
        temp_handles: Dict[Tuple[int, int], object] = {}
        temp_writers: Dict[Tuple[int, int], csv.writer] = {}
        temp_paths: Dict[Tuple[int, int], Path] = {}
        try:
            for signal_idx in range(signal_count):
                run_idx = (signal_idx // chunks_per_run) + 1
                chunk_idx = signal_idx % chunks_per_run
                key = (run_idx, chunk_idx)
                if key in temp_writers:
                    continue
                tmp = out_dir / f".tmp_run_{run_idx:04d}_chunk_{chunk_idx:02d}.csv"
                fh = tmp.open("w", encoding="utf-8", newline="")
                writer = csv.writer(fh)
                temp_handles[key] = fh
                temp_writers[key] = writer
                temp_paths[key] = tmp

            for row in reader:
                if not row:
                    continue
                raw_time = row[0] if len(row) > 0 else ""
                base_time = parse_numeric_time(raw_time)
                max_col = min(len(row) - 1, signal_count)
                for signal_idx in range(max_col):
                    value = row[signal_idx + 1]
                    run_idx = (signal_idx // chunks_per_run) + 1
                    chunk_idx = signal_idx % chunks_per_run
                    key = (run_idx, chunk_idx)
                    if base_time is None:
                        time_out = raw_time
                    else:
                        adjusted = base_time + (chunk_idx * vibration_chunk_seconds)
                        time_out = format_time_value(adjusted)
                    temp_writers[key].writerow([time_out, value])
        finally:
            for fh in temp_handles.values():
                fh.close()

        # Merge chunk temp files into monotonic 60s run files in chunk order.
        rel_source = record.source_file.as_posix()
        for run_idx in range(1, run_count + 1):
            out_file = out_dir / f"run_{run_idx:04d}.csv"
            with out_file.open("w", encoding="utf-8", newline="") as out_fh:
                writer = csv.writer(out_fh)
                writer.writerow(["time", "value"])
                for chunk_idx in range(chunks_per_run):
                    key = (run_idx, chunk_idx)
                    tmp = temp_paths.get(key)
                    if not tmp or not tmp.exists():
                        continue
                    with tmp.open("r", encoding="utf-8", newline="") as tmp_fh:
                        for raw_line in tmp_fh:
                            out_fh.write(raw_line)
                    tmp.unlink(missing_ok=True)

            start_col = (run_idx - 1) * chunks_per_run
            end_col = min(start_col + chunks_per_run - 1, signal_count - 1)
            source_cols = f"{start_col}-{end_col}" if start_col != end_col else f"{start_col}"
            file_mapping_rows.append(
                [
                    study_id,
                    record.method,
                    record.motor,
                    record.speed,
                    record.condition,
                    record.channel_number,
                    record.sensor_alias,
                    run_idx,
                    source_cols,
                    rel_source,
                    out_file.relative_to(output_root).as_posix(),
                ]
            )


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Transform Sietze dataset to ISA-PHM-ready 2-column files.")
    parser.add_argument("--source-root", type=Path, default=DEFAULT_SOURCE_ROOT, help="Root containing Electric/ and Vibration/ folders.")
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT, help="Output root for transformed dataset + overview files.")
    parser.add_argument("--overview-xlsx", type=Path, default=DEFAULT_MEASUREMENT_OVERVIEW_XLSX, help="Path to measurement overview workbook.")
    parser.add_argument("--split", action="store_true", help="Perform wide->2-column file split.")
    parser.add_argument("--limit-source-files", type=int, default=0, help="For validation runs only: split first N source files.")
    parser.add_argument(
        "--methods",
        nargs="+",
        choices=sorted(SENSOR_MAP.keys()),
        default=sorted(SENSOR_MAP.keys()),
        help="Methods to split (default: Electric Vibration). Overviews are still generated from all methods unless --limit-source-files is used.",
    )
    parser.add_argument(
        "--clean-selected-methods",
        action="store_true",
        help="Before splitting, delete existing output method folders for selected methods to avoid stale run files.",
    )
    parser.add_argument(
        "--vibration-chunks-per-run",
        type=int,
        default=DEFAULT_VIBRATION_CHUNKS_PER_RUN,
        help="How many vibration source columns make one run (default: 5).",
    )
    parser.add_argument(
        "--vibration-chunk-seconds",
        type=float,
        default=DEFAULT_VIBRATION_CHUNK_SECONDS,
        help="Duration of one vibration chunk column in seconds (default: 12).",
    )
    args = parser.parse_args(argv)

    source_root: Path = args.source_root
    output_root: Path = args.output_root
    overview_xlsx: Path = args.overview_xlsx
    split_enabled: bool = args.split
    limit_source_files: int = max(0, args.limit_source_files)
    selected_methods = set(args.methods)
    clean_selected_methods: bool = args.clean_selected_methods
    vibration_chunks_per_run: int = max(1, args.vibration_chunks_per_run)
    vibration_chunk_seconds: float = float(args.vibration_chunk_seconds)

    if not source_root.exists():
        print(f"[ERROR] Source root does not exist: {source_root}", file=sys.stderr)
        return 1

    print(f"[INFO] Source root: {source_root}")
    print(f"[INFO] Output root: {output_root}")
    print(f"[INFO] Split enabled: {split_enabled}")
    print(f"[INFO] Selected split methods: {', '.join(sorted(selected_methods))}")
    if limit_source_files:
        print(f"[INFO] Source file limit: {limit_source_files}")
    print(f"[INFO] Vibration chunks per run: {vibration_chunks_per_run}")
    print(f"[INFO] Vibration chunk seconds: {vibration_chunk_seconds}")

    source_records_all = discover_source_records(source_root, vibration_chunks_per_run)
    if not source_records_all:
        print("[ERROR] No CSV source files found.", file=sys.stderr)
        return 1

    split_records = [rec for rec in source_records_all if rec.method in selected_methods]
    if not split_records:
        print("[ERROR] No CSV files matched selected methods.", file=sys.stderr)
        return 1

    if limit_source_files:
        split_records = split_records[:limit_source_files]
        source_records_for_overview = split_records
    else:
        source_records_for_overview = source_records_all

    print(f"[INFO] Source CSV files discovered (all methods): {len(source_records_all)}")
    print(f"[INFO] Source CSV files selected for split: {len(split_records)}")

    workbook_rows = parse_workbook_rows(overview_xlsx)
    workbook_lookup = build_workbook_lookup(workbook_rows)
    print(f"[INFO] Measurement overview rows parsed: {len(workbook_rows)}")

    # Build study aggregates.
    study_agg: Dict[Tuple[str, str, str], dict] = {}
    for rec in source_records_for_overview:
        key = rec.study_key
        if key not in study_agg:
            study_agg[key] = {
                "study_id": build_study_id(*key),
                "motor": rec.motor,
                "speed_percent": rec.speed,
                "condition": rec.condition,
                "condition_base": parse_condition(rec.condition)[0],
                "severity_token": parse_condition(rec.condition)[1],
                "configuration_id": CONFIG_BY_MOTOR.get(rec.motor, {}).get("configuration_id", ""),
                "has_vibration": 0,
                "has_electric": 0,
                "vibration_sensor_count": 0,
                "electric_sensor_count": 0,
                "vibration_run_count": "",
                "electric_run_count": "",
            }
        s = study_agg[key]
        if rec.method == "Vibration":
            s["has_vibration"] = 1
            s["vibration_sensor_count"] += 1
            s["vibration_run_count"] = rec.run_count
        elif rec.method == "Electric":
            s["has_electric"] = 1
            s["electric_sensor_count"] += 1
            s["electric_run_count"] = rec.run_count

    studies_rows: List[List[object]] = []
    for key, study in sorted(study_agg.items(), key=lambda item: item[1]["study_id"]):
        wb = workbook_lookup.get(key)
        speed_rpm = wb.get("speed_rpm") if wb else ""
        pressure_bar = wb.get("pressure_bar") if wb else ""
        flow_m3h = wb.get("flow_m3h") if wb else ""
        alignment_report = wb.get("alignment_report") if wb else ""
        comments = wb.get("comments") if wb else ""
        studies_rows.append(
            [
                study["study_id"],
                study["configuration_id"],
                study["motor"],
                study["speed_percent"],
                study["condition"],
                study["condition_base"],
                study["severity_token"],
                study["has_vibration"],
                study["has_electric"],
                study["vibration_sensor_count"],
                study["electric_sensor_count"],
                study["vibration_run_count"],
                study["electric_run_count"],
                speed_rpm,
                pressure_bar,
                flow_m3h,
                alignment_report,
                comments,
            ]
        )

    overview_dir = output_root / "overview"
    overview_dir.mkdir(parents=True, exist_ok=True)

    write_csv(
        overview_dir / "studies.csv",
        studies_rows,
        header=[
            "study_id",
            "configuration_id",
            "motor",
            "speed_percent",
            "condition",
            "condition_base",
            "severity_token",
            "has_vibration",
            "has_electric",
            "vibration_sensor_count",
            "electric_sensor_count",
            "vibration_run_count",
            "electric_run_count",
            "speed_rpm",
            "pressure_bar",
            "flow_m3h",
            "alignment_report",
            "comments",
        ],
    )

    write_csv(
        overview_dir / "configurations.csv",
        [
            [
                cfg["configuration_id"],
                cfg["name"],
                cfg["motor_id"],
                cfg["motor_model"],
                cfg["motor_bearing"],
                cfg["pump_model"],
                cfg["pump_bearing"],
            ]
            for cfg in CONFIGURATIONS
        ],
        header=[
            "configuration_id",
            "name",
            "motor_id",
            "motor_model",
            "motor_bearing",
            "pump_model",
            "pump_bearing",
        ],
    )

    sensors_rows: List[List[object]] = []
    for method, channel_map in SENSOR_MAP.items():
        for channel_no, sensor in sorted(channel_map.items()):
            alias, measurement_type, technology_type, technology_platform, description = sensor
            sensors_rows.append(
                [
                    method,
                    channel_no,
                    alias,
                    measurement_type,
                    technology_type,
                    technology_platform,
                    description,
                ]
            )
    write_csv(
        overview_dir / "sensors.csv",
        sensors_rows,
        header=[
            "method",
            "channel_number",
            "sensor_alias",
            "measurement_type",
            "technology_type",
            "technology_platform",
            "description",
        ],
    )

    # Save summary JSON for quick machine consumption.
    summary_payload = {
        "source_root": str(source_root),
        "output_root": str(output_root),
        "source_csv_files_all_methods": len(source_records_all),
        "source_csv_files_selected_for_split": len(split_records),
        "studies_count": len(study_agg),
        "configurations_count": len(CONFIGURATIONS),
        "split_enabled": split_enabled,
        "selected_methods": sorted(selected_methods),
        "vibration_chunks_per_run": vibration_chunks_per_run,
        "vibration_chunk_seconds": vibration_chunk_seconds,
    }
    (overview_dir / "summary.json").write_text(json.dumps(summary_payload, indent=2), encoding="utf-8")

    print(f"[INFO] Wrote overviews to: {overview_dir}")
    print(f"[INFO] Studies discovered: {len(study_agg)}")

    if not split_enabled:
        print("[INFO] Split step skipped (use --split to generate two-column files).")
        return 0

    if clean_selected_methods:
        clean_dirs = {
            output_root / "raw" / build_study_id(rec.motor, rec.speed, rec.condition) / rec.method.lower()
            for rec in split_records
        }
        for clean_dir in sorted(clean_dirs):
            if clean_dir.exists():
                shutil.rmtree(clean_dir)
        print(f"[INFO] Cleaned {len(clean_dirs)} existing method folders before split.")

    file_mapping_rows: List[List[object]] = []
    total_files = len(split_records)
    for idx, rec in enumerate(split_records, start=1):
        split_source_file(
            rec,
            output_root,
            file_mapping_rows,
            vibration_chunks_per_run=vibration_chunks_per_run,
            vibration_chunk_seconds=vibration_chunk_seconds,
        )
        if idx % 25 == 0 or idx == total_files:
            print(f"[INFO] Split progress: {idx}/{total_files} source files")

    existing_mappings_path = overview_dir / "file_mappings.csv"
    merged_rows: List[List[object]] = []
    if existing_mappings_path.exists() and len(selected_methods) < len(SENSOR_MAP):
        with existing_mappings_path.open("r", encoding="utf-8", newline="") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                if row.get("method") in selected_methods:
                    continue
                merged_rows.append(
                    [
                        row.get("study_id", ""),
                        row.get("method", ""),
                        row.get("motor", ""),
                        row.get("speed_percent", ""),
                        row.get("condition", ""),
                        row.get("channel_number", ""),
                        row.get("sensor_alias", ""),
                        row.get("run_index", ""),
                        row.get("source_columns", ""),
                        row.get("source_file", ""),
                        row.get("split_file_relpath", ""),
                    ]
                )
    merged_rows.extend(file_mapping_rows)

    write_csv(
        existing_mappings_path,
        merged_rows,
        header=[
            "study_id",
            "method",
            "motor",
            "speed_percent",
            "condition",
            "channel_number",
            "sensor_alias",
            "run_index",
            "source_columns",
            "source_file",
            "split_file_relpath",
        ],
    )
    print(f"[INFO] Wrote file mapping manifest: {existing_mappings_path}")
    print(f"[INFO] Split files generated this run: {len(file_mapping_rows)}")
    if len(selected_methods) < len(SENSOR_MAP):
        print(f"[INFO] Total file mappings after merge: {len(merged_rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
