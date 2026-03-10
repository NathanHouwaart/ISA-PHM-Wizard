from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from uuid import uuid4
from isatools.model import *
from isatools import isatab
# from isatools.isatab.dump.write import *
import argparse
import json
from isatools.isajson import ISAJSONEncoder
from copy import copy, deepcopy
import pandas as pd

# %%
#The following function creates units based on specified units in the input file. It prevents generation of duplicate units when the same unit occurs multiple times.
unit_list = [] #Initilize unit list
def get_or_create_unit(unit_term):
    if pd.notna(unit_term):
        # Check if the unit already exists
        for existing_unit in unit_list:
            if existing_unit.term == unit_term:
                return existing_unit  # Reuse
        # Create and store new unit
        new_unit = OntologyAnnotation(term=unit_term)
        unit_list.append(new_unit)
        return new_unit
    else:
        return None  # Nothing to assign

# %%
#The following function creates roles based on specified roles in the input file. It prevents generation of duplicate roles when the same role occurs multiple times.
role_list = [] #Initilize role list
def get_or_create_role(role_term):
    if pd.notna(role_term):
        # Check if the role already exists
        for existing_role in role_list:
            if existing_role.term == role_term:
                return existing_role  # Reuse
        # Create and store new role
        new_role = OntologyAnnotation(term=role_term)
        role_list.append(new_role)
        return new_role
    else:
        return None  # Nothing to assign


def add_unit_to_study(study_obj: Study, unit_term: str) -> OntologyAnnotation:
    """
    Adds a unit to the study's unit categories if it doesn't already exist.
    Returns the unit annotation object.
    
    Args:
        study_obj: The Study object to add the unit to
        unit_term: The unit term string (e.g., "RPM", "bar")
    
    Returns:
        OntologyAnnotation object for the unit, or None if unit_term is empty
    """
    if not unit_term:
        # print(f"DEBUG: add_unit_to_study called with EMPTY unit_term")
        return None
    
    # print(f"DEBUG: add_unit_to_study called with unit_term='{unit_term}'")
    unit = get_or_create_unit(unit_term)
    if unit and unit not in study_obj.units:
        study_obj.units.append(unit)
        # print(f"  ✅ Added unit '{unit_term}' to study.units (total: {len(study_obj.units)})")
    # elif unit:
    #     # print(f"  ⏭️  Unit '{unit_term}' already in study.units")
    
    return unit


def parse_numeric_if_possible(raw_value: Any) -> Tuple[Any, bool]:
    """
    Try to parse raw_value into an int or float.
    Returns a tuple (parsed_value, is_numeric).
    If parsing fails, returns (original_value, False).
    """
    if raw_value is None:
        return raw_value, False
    # If it's already a numeric type, keep it
    if isinstance(raw_value, (int, float)):
        return raw_value, True

    s = str(raw_value).strip()
    
    # Replace comma with dot for European decimal format (e.g., "5,71" -> "5.71")
    s_normalized = s.replace(',', '.')
    
    # Try integer
    try:
        iv = int(s_normalized)
        return iv, True
    except Exception:
        pass

    # Try float
    try:
        fv = float(s_normalized)
        return fv, True
    except Exception:
        pass

    return raw_value, False


def parse_processing_protocol_entry(processing_entry: Dict[str, Any], expected_source_id: Optional[str], processing_defs: Dict[str, Dict[str, Any]]) -> Optional[Tuple[Optional[str], str, Any, str]]:
    """
    Parse a single processing_protocol entry and return:
      (target_id, resolved_name, raw_value, raw_unit)
    Returns None if the entry should be skipped (wrong sourceId or empty value).
    """
    # If a specific sourceId is expected and this entry doesn't match, skip it
    if expected_source_id and processing_entry.get("sourceId") != expected_source_id:
        return None

    value_list = processing_entry.get("value", []) or []
    if not value_list or str(value_list[0]).strip() == "":
        return None

    target_id = processing_entry.get("targetId") or processing_entry.get("id") or None

    resolved_name = target_id
    if processing_defs and target_id in processing_defs:
        param_def = processing_defs.get(target_id, {})
        resolved_name = param_def.get("name") or param_def.get("title") or target_id

    raw_value = value_list[0]
    raw_unit = value_list[1] if len(value_list) > 1 else ""

    return (target_id, resolved_name, raw_value, raw_unit)


def build_processing_parameters_for_sensor(
    study: Dict[str, Any],
    sensor: Dict[str, Any],
    processing_defs: Dict[str, Dict[str, Any]],
) -> List[ProtocolParameter]:
    """
    Build a list of ProtocolParameter objects for a sensor by scanning all assays
    in the provided study for processing_protocols where value[0] is non-empty.

    processing_defs is a mapping id -> definition (may contain 'name' or 'title').
    Returns parameters in the order of processing_defs when available; otherwise arbitrary order.
    """
    params: List[ProtocolParameter] = []
    target_ids = set()

    sensor_id = sensor.get("id")
    # collect referenced targetIds where the first value is non-empty
    for assay in study.get("assay_details", []):
        for processing_entry in assay.get("processing_protocols", []):
            parsed_entry = parse_processing_protocol_entry(processing_entry, sensor_id, processing_defs)
            if not parsed_entry:
                continue
            target_id, _, _, _ = parsed_entry
            if target_id:
                target_ids.add(target_id)

    # Preserve a stable ordering: prefer the order from processing_defs when present
    if processing_defs:
        for pid in processing_defs.keys():
            if pid in target_ids:
                pdef = processing_defs.get(pid, {})
                pname = pdef.get("name") or pdef.get("title") or pid
                params.append(ProtocolParameter(parameter_name=OntologyAnnotation(pname)))
    else:
        for pid in target_ids:
            params.append(ProtocolParameter(parameter_name=OntologyAnnotation(pid)))

    return params

@dataclass
class IsaPhmInfo:
    """
    Top-level container for investigation metadata,
    including studies, contacts, and publications.
    Any dates should be in ISO 8601 format.
    """
    identifier: str = "i0"
    title: str = ""
    description: str = ""
    submission_date: str = ""
    public_release_date: str = ""
    publication: Publication = None
    contacts: List[Person] = field(default_factory=list)
    # study_details: List[StudyInfo] = field(default_factory=list)

def create_isa_data(IsaPhmInfo: dict, output_path: str = None) -> Investigation:
    """
    Builds the full ISA investigation object from the IsaPhmInfo metadata.
    """
    investigation = Investigation()
    investigation.filename = output_path if output_path else "isa_phm.json"
    # Use standard hyphenated UUID format (e.g., efaa741b-b04c-4fe5-9787-6bc3c99dd52a)
    investigation.identifier = str(uuid4())
    investigation.title = IsaPhmInfo.get("title", "")
    investigation.description = IsaPhmInfo.get("description", "")
    investigation.submission_date = IsaPhmInfo.get("submission_date", "")
    investigation.public_release_date = IsaPhmInfo.get("public_release_date", "")
    investigation.comments.append(Comment(name="ud_identifier", value=IsaPhmInfo.get("identifier", "")))
    investigation.comments.append(Comment(name="experiment_type", value=IsaPhmInfo.get("experiment_type", "")))
    investigation.comments.append(Comment(name="license", value=IsaPhmInfo.get("license", "")))
    
    
    # INVESTIGATION CONTACTS
    contacts: List[Dict[str, Any]] = IsaPhmInfo.get("contacts", [])
    for contact in contacts:
        person = Person()
        person.first_name   = contact.get("firstName", "")
        person.mid_initials = contact.get("midInitials", "")
        person.last_name    = contact.get("lastName", "")
        person.email        = contact.get("email", "")
        person.phone        = contact.get("phone", "")
        person.fax          = contact.get("fax", "")
        person.address      = contact.get("address", "")
        person.affiliation  = "; ".join(contact.get("affiliations", []))
        person.roles.extend([get_or_create_role(role) for role in contact.get("roles", [])])
        person.comments.append(Comment(name="orcid", value=contact.get("orcid", "")))
        person.comments.append(Comment(name="author_id", value=contact.get("id", "")))
        
        investigation.contacts.append(person)

    # INVESTIGATION PUBLICATIONS
    publications: List[Dict[str, Any]] = IsaPhmInfo.get("publications", [])
    for publication in publications:
        publication_obj = Publication()
        publication_obj.title = publication.get("title", "")
        publication_obj.author_list = "; ".join(["#" + author for author in publication.get("contactList", [])])
        publication_obj.status = OntologyAnnotation(publication.get("publicationStatus", "unknown"))
        publication_obj.doi = publication.get("doi", "")
        publication_obj.comments.append(Comment(name="Corresponding author ID", value=publication.get("correspondingContactId", "")))
        investigation.publications.append(publication_obj)


    # Precompute processing definitions lookup (id -> def) for the whole investigation
    measurement_protocol_defs = {p.get("id"): p for p in IsaPhmInfo.get("measurement_protocols", [])} if IsaPhmInfo.get("measurement_protocols") else {}
    processing_defs = {p.get("id"): p for p in IsaPhmInfo.get("processing_protocols", [])} if IsaPhmInfo.get("processing_protocols") else {}
    

    # INVESTIGATION STUDIES
    studies: List[Dict[str, Any]] = IsaPhmInfo.get("studies", [])
    for study_index, study in enumerate(studies, start=1):
        study_obj = Study()
        study_obj.filename = f"s{study_index:02d}_.txt"
        study_obj.identifier = study.get("id", "")
        study_obj.title = study.get("name", "")
        study_obj.description = study.get("description", "")
        study_obj.submission_date = study.get("submissionDate", "")
        study_obj.public_release_date = study.get("publicationDate", "")
        study_obj.publications.extend(investigation.publications)   # ID REFERENCE OR FULL REFERENCE?
        study_obj.contacts.extend(investigation.contacts)           # ID REFERENCE OR FULL REFERENCE?
        #TODO: Add experiment type in online form
        study_obj.design_descriptors.append(OntologyAnnotation(study.get("experimentType", "Diagnostics")))
        
        study_total_runs = study.get("total_runs", 1)
        study_obj.comments.append(Comment(name="total_runs", value=study_total_runs))


        # Test Setup (used as Source and Sample)
        test_setup_obj: Dict[str, Any] = study.get("used_setup", {})

        # Experiment preparation Protocol
        experiment_prep_protocol = Protocol(name=test_setup_obj.get("experimentPreparationProtocolName", "Experiment Preparation"))
        experiment_prep_protocol.protocol_type = OntologyAnnotation("Experiment Preparation Protocol")
        study_obj.protocols.append(experiment_prep_protocol)

        # Measurement Protocols
        for sensor in test_setup_obj.get("sensors", []):
            # Include sensor ID or name to make protocol names unique
            sensor_id = sensor.get("id", "") or sensor.get("name", "") or sensor.get("sensorLocation", "") or f"sensor_{len(study_obj.protocols)}"
            measurement_type = sensor.get("measurementType", "") or "Unknown"
            
            protocol = Protocol(
                name=f'{measurement_type} measurement ({sensor_id})', 
                description=sensor.get("description", "no description provided")
            )
            protocol.protocol_type = OntologyAnnotation("Measurement Protocol")
            protocol.comments.append(Comment(name="Sensor id", value=sensor.get("id", "")))
            
            # Measurement Protocols
            for measurement_protocol in IsaPhmInfo.get("measurement_protocols", []):
                measurement_protocol_name = measurement_protocol.get("name", "")
                if measurement_protocol_name:
                    parameter = ProtocolParameter(parameter_name= OntologyAnnotation(
                                                      measurement_protocol_name,
                                                      comments=[
                                                          Comment(name="description", value=measurement_protocol.get("description", ""))
                                                      ]
                                                  ))
                    protocol.parameters.append(parameter)

            # Add protocol to study
            study_obj.protocols.append(protocol)
        
        # Processing Protocols
        for sensor in test_setup_obj.get("sensors", []):
            # Use the same sensor ID logic
            sensor_id = sensor.get("id", "") or sensor.get("name", "") or sensor.get("sensorLocation", "") or f"sensor_{len(study_obj.protocols)}"
            measurement_type = sensor.get("measurementType", "") or "Unknown"
            
            protocol = Protocol(
                name=f'{measurement_type} processing ({sensor_id})', 
                description=sensor.get("description", "")
            )
            protocol.protocol_type = OntologyAnnotation("Processing Protocol")
            protocol.comments.append(Comment(name="Sensor id", value=sensor.get("id", "")))
            
            # Dynamically build processing parameters for this sensor (helper handles ordering)
            protocol.parameters.extend(build_processing_parameters_for_sensor(study, sensor, processing_defs))
       
            study_obj.protocols.append(protocol)
        
        # Adds Material -> Source to ISA
        # The source represents the test setup with its fixed hardware characteristics
        source = Source(name=test_setup_obj.get("name", "Test Setup"))
        source.comments.append(Comment(name="description", value=test_setup_obj.get("description", "")))
        for characteristic in test_setup_obj.get("characteristics", []):
            category = OntologyAnnotation(term=characteristic.get("category", "unknown"))
            study_obj.characteristic_categories.append(category)

            unit = add_unit_to_study(study_obj, characteristic.get("unit", ""))

            characteristic_obj = Characteristic()
            characteristic_obj.category = category
            characteristic_obj.value = characteristic.get("value", "")
            characteristic_obj.unit = unit

            source.characteristics.append(characteristic_obj)
        study_obj.sources.append(source)

        # Resolve the active configuration for this study (may be None if not specified)
        configuration_id = study.get("configurationId")
        active_config = next(
            (c for c in test_setup_obj.get("configurations", []) if c.get("id") == configuration_id),
            None
        )

        # Adds Material -> Sample to ISA
        # The sample represents the source + the active configuration (e.g. which bearing is installed)
        if active_config:
            sample_name = f"{test_setup_obj.get('name', 'Test Setup')} - {active_config.get('name', 'Configuration')}"
        else:
            sample_name = f"{test_setup_obj.get('name', 'Test Setup')} - No Configuration"
        dummy_sample = Sample(name=sample_name, derives_from=[source])

        # Add configuration fields as characteristics on the sample
        if active_config:
            for config_cat, config_val in [
                ("Configuration Name", active_config.get("name", "")),
                ("Replaceable Component", active_config.get("replaceableComponentId", "")),
            ]:
                cat_annotation = OntologyAnnotation(term=config_cat)
                study_obj.characteristic_categories.append(cat_annotation)
                config_char = Characteristic(category=cat_annotation, value=config_val)
                dummy_sample.characteristics.append(config_char)

            # Add any detail entries from the configuration (future-proof)
            for detail in active_config.get("details", []):
                detail_cat = OntologyAnnotation(term=detail.get("name", "Configuration Detail"))
                study_obj.characteristic_categories.append(detail_cat)
                detail_char = Characteristic(
                    category=detail_cat,
                    value=detail.get("value", "")
                )
                dummy_sample.characteristics.append(detail_char)
        
        
        # Study Factors - Create factor definitions (no values yet)
        for variable in IsaPhmInfo.get("study_variables", []):
            
            # Create Study Factor for each study variable
            study_factor_obj = StudyFactor(name=variable.get("name", ""), factor_type=OntologyAnnotation(variable.get("type", "unknown")))

            study_factor_obj.comments.append(Comment(name="description", value=variable.get("description", "")))
            study_factor_obj.comments.append(Comment(name="unit", value=variable.get("unit", "")))
            study_factor_obj.comments.append(Comment(name="min", value=variable.get("min", "")))
            study_factor_obj.comments.append(Comment(name="max", value=variable.get("max", "")))
            study_factor_obj.comments.append(Comment(name="step", value=variable.get("step", "")))
            
            study_obj.factors.append(study_factor_obj)
        
        # Create samples WITHOUT factor values first
        study_obj.samples = batch_create_materials(dummy_sample, n=study_total_runs)
        # batch_create_materials copies the template UUID to all clones (library bug).
        # Reset each clone's @id so every sample gets a unique identifier in the JSON output.
        for s in study_obj.samples:
            s.id = ''
        
        # Now assign factor values to each sample based on run number
        for run_number in range(1, study_total_runs + 1):
            sample = study_obj.samples[run_number - 1]
            
            # For each study variable, find the mapping for THIS specific run
            for variable in IsaPhmInfo.get("study_variables", []):
                variable_name = variable.get("name", "")
                
                # Find the study factor object we created earlier
                study_factor_obj = next((f for f in study_obj.factors if f.name == variable_name), None)
                if not study_factor_obj:
                    print(f"Warning: Could not find factor {variable_name} in study factors.")
                    continue
                
                # Find the mapping for this specific run AND variable
                mapping = next(
                    (m for m in study.get("study_to_study_variable_mapping", [])
                     if m.get("variableName") == variable_name and m.get("runNumber") == run_number),
                    None
                )
                
                if mapping:
                    factor_value = FactorValue()
                    factor_value.factor_name = study_factor_obj
                    factor_value.value = mapping.get("value", "unknown")
                    factor_value.unit = add_unit_to_study(study_obj, variable.get("unit", ""))
                    sample.factor_values.append(factor_value)
                else:
                    print(f"Warning: No mapping found for factor {variable_name} at run {run_number}. Skipping.")
        
        # Study Process Sequence to get from source (test setup) to sample (test setup characteristics)
        experiment_prerparation_process = Process(executes_protocol=experiment_prep_protocol)
        experiment_prerparation_process.inputs.append(source)
        experiment_prerparation_process.outputs.append(dummy_sample)
        study_obj.process_sequence.append(experiment_prerparation_process)
        
        
        # Assays
        for assay in study.get("assay_details", []):
            assay_obj = Assay(filename=assay.get("assay_file_name", "unknown"))
            
            # Get the sensor for THIS specific assay
            assay_sensor = assay.get("used_sensor", {})
            assay_measurement_type = assay_sensor.get("measurementType", "") or "Unknown"
            
            assay_obj.measurement_type = OntologyAnnotation(assay_measurement_type)
            assay_obj.technology_type = OntologyAnnotation(assay_sensor.get("technologyType", "unknown"))
            assay_obj.technology_platform = assay_sensor.get("technologyPlatform", "unknown")
            
            for sample in study_obj.samples:
                assay_obj.samples.append(sample)
            
            # Build per-run data file lists.
            # Both raw_file_name and processed_file_name may be empty for a given run.
            # We only create a DataFile node when the filename is non-empty, so no
            # unnamed placeholder nodes ever appear in the ISA graph.
            # Possible graphs per run:
            #   raw + processed:  Sample → [measurement] → RawFile → [processing] → ProcessedFile
            #   processed only:   Sample → [measurement] → ProcessedFile → [processing] → ProcessedFile
            #   raw only:         Sample → [measurement] → RawFile  (no processing step)
            #   neither:          run is skipped entirely
            runs = assay.get("runs", [])
            run_has_raw = []        # parallel bool list
            run_has_processed = []  # parallel bool list
            run_raw_df_index = {}          # run index -> position in assay_obj.data_files
            run_processed_df_index = {}    # run index -> position in assay_obj.data_files

            for run_idx, run in enumerate(runs):
                raw_name = (run.get("raw_file_name") or "").strip()
                proc_name = (run.get("processed_file_name") or "").strip()
                has_raw = bool(raw_name)
                has_proc = bool(proc_name)
                run_has_raw.append(has_raw)
                run_has_processed.append(has_proc)

                if has_raw:
                    run_raw_df_index[run_idx] = len(assay_obj.data_files)
                    assay_obj.data_files.append(DataFile(
                        filename=raw_name,
                        label="Raw Data File",
                        generated_from=dummy_sample
                    ))
                if has_proc:
                    run_processed_df_index[run_idx] = len(assay_obj.data_files)
                    assay_obj.data_files.append(DataFile(
                        filename=proc_name,
                        label="Processed Data File",
                        generated_from=dummy_sample
                    ))

            # Build processes for each run.
            # Only create measurement/processing steps when the corresponding DataFile exists.
            # The sensor ID and alias are constant across all runs in this assay.
            assay_sensor_id = assay_sensor.get("id", "") or assay_sensor.get("name", "") or assay_sensor.get("sensorLocation", "")
            sensor_alias = assay_sensor.get("alias", "") or assay_sensor.get("id", "sensor")
            expected_measurement_name = f'{assay_measurement_type} measurement ({assay_sensor_id})' if assay_sensor_id else f'{assay_measurement_type} measurement'
            expected_processing_name  = f'{assay_measurement_type} processing ({assay_sensor_id})'  if assay_sensor_id else f'{assay_measurement_type} processing'

            # Pre-build parameter lists once per assay (they are the same for every run)
            measurement_params = []
            processing_params  = []
            measurement_protocol_obj = None
            processing_protocol_obj  = None
            for protocol in study_obj.protocols:
                if protocol.name == "Experiment Preparation":
                    continue
                is_meas = (protocol.name == expected_measurement_name or
                           (not assay_sensor_id and protocol.name.startswith(f'{assay_measurement_type} measurement')))
                is_proc = (protocol.name == expected_processing_name or
                           (not assay_sensor_id and protocol.name.startswith(f'{assay_measurement_type} processing')))
                if is_meas:
                    measurement_protocol_obj = protocol
                    for entry in assay.get("measurement_protocols", []):
                        parsed = parse_processing_protocol_entry(entry, assay_sensor_id, measurement_protocol_defs)
                        if not parsed:
                            continue
                        target_id, pname, raw_value, raw_unit = parsed
                        matching_param = next((p for p in protocol.parameters if getattr(p.parameter_name, "term", None) in (pname, target_id)), None)
                        category_param = matching_param or ProtocolParameter(parameter_name=OntologyAnnotation(pname))
                        parsed_value, is_numeric = parse_numeric_if_possible(raw_value)
                        raw_unit_str = str(raw_unit) if raw_unit is not None else ""
                        clean_unit = raw_unit_str.strip().replace('\xa0', '').replace('\u00a0', '')
                        if clean_unit and is_numeric:
                            unit_obj = add_unit_to_study(study_obj, clean_unit)
                        else:
                            if clean_unit and not is_numeric:
                                print(f"Warning: not attaching unit '{clean_unit}' to non-numeric measurement value '{raw_value}' (parameter {pname})")
                            unit_obj = None
                        measurement_params.append(ParameterValue(category=category_param, value=parsed_value, unit=unit_obj))
                elif is_proc:
                    processing_protocol_obj = protocol
                    for entry in assay.get("processing_protocols", []):
                        parsed = parse_processing_protocol_entry(entry, assay_sensor_id, processing_defs)
                        if not parsed:
                            continue
                        target_id, pname, raw_value, raw_unit = parsed
                        matching_param = next((p for p in protocol.parameters if getattr(p.parameter_name, "term", None) in (pname, target_id)), None)
                        category_param = matching_param or ProtocolParameter(parameter_name=OntologyAnnotation(pname))
                        parsed_value, is_numeric = parse_numeric_if_possible(raw_value)
                        raw_unit_str = str(raw_unit) if raw_unit is not None else ""
                        clean_unit = raw_unit_str.strip().replace('\xa0', '').replace('\u00a0', '')
                        if clean_unit and is_numeric:
                            unit_obj = add_unit_to_study(study_obj, clean_unit)
                        else:
                            if clean_unit and not is_numeric:
                                print(f"Warning: not attaching unit '{clean_unit}' to non-numeric processing value '{raw_value}' (parameter {pname})")
                            unit_obj = None
                        processing_params.append(ParameterValue(category=category_param, value=parsed_value, unit=unit_obj))

            for index, run in enumerate(runs):
                run_number = run.get("run_number", index + 1)
                has_raw  = run_has_raw[index]
                has_proc = run_has_processed[index]

                # Skip run entirely if it produced no files at all
                if not has_raw and not has_proc:
                    print(f"Warning: run {run_number} has no raw or processed file; skipping.")
                    continue

                raw_df  = assay_obj.data_files[run_raw_df_index[index]]       if has_raw  else None
                proc_df = assay_obj.data_files[run_processed_df_index[index]] if has_proc else None

                meas_process = None
                proc_process = None

                # Measurement process: always created when there is at least one output file
                if measurement_protocol_obj:
                    meas_out = raw_df if has_raw else proc_df
                    meas_process = Process(executes_protocol=measurement_protocol_obj, parameter_values=measurement_params)
                    meas_process.name = f"{sensor_alias}_run_{run_number}_measurement"
                    meas_process.inputs.append(study_obj.samples[index])
                    meas_process.outputs.append(meas_out)
                    assay_obj.process_sequence.append(meas_process)

                # Processing process: only created when a processed file exists
                if processing_protocol_obj and has_proc:
                    proc_in = raw_df if has_raw else proc_df
                    proc_process = Process(executes_protocol=processing_protocol_obj, parameter_values=processing_params)
                    proc_process.name = f"{sensor_alias}_run_{run_number}_processing"
                    proc_process.inputs.append(proc_in)
                    proc_process.outputs.append(proc_df)
                    assay_obj.process_sequence.append(proc_process)

                # Link measurement → processing within this run only
                if meas_process and proc_process:
                    plink(meas_process, proc_process)

            study_obj.assays.append(assay_obj)
        
        
        investigation.studies.append(study_obj)
        
        

    return investigation

def main(args):

    with open(args.file, "r", encoding="utf-8") as infile:
        json_data = json.load(infile)
    print(f"Loading ISA-PhM JSON file: {args.file}")
    print(type(json_data))
    investigation = create_isa_data(IsaPhmInfo=json_data, output_path=args.outfile)

    
    with open(investigation.filename, "w", encoding="utf-8", newline="\n") as f:
        json.dump(investigation, f, cls=ISAJSONEncoder, sort_keys=True,
                  indent=4, separators=(',', ': '))

    print(f"ISA-PhM JSON file created: {investigation.filename}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("file",
                        help="input a json file that contains the necessary" +
                        " information to create the isa-phm")
    parser.add_argument("outfile", default="isa_phm.json",
                        help="output file name for the isa-phm json file")
    args = parser.parse_args()
    main(args)

