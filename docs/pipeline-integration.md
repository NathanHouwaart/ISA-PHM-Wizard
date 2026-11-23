# Pipeline integration status

This is a development checkpoint, not an ISA-PHM conformance statement.

## Integration

1. The Wizard describes the test setup and investigation and sends a conversion
   payload to the Backend. Its unit and quantity catalogues come from the
   pinned Specification submodule.
2. The Backend creates ISA-JSON and packages referenced attachments. It includes
   a report from selected draft Specification checks; it does not receive or
   validate measurement CSVs during conversion.
3. The Wrapper reads the ISA-JSON and dataset files and offers the shared draft
   Specification validator separately via `validate_specification()`.
4. The Agent uses its pinned Wrapper submodule to inspect and analyse datasets.

The Wizard, Backend and Wrapper pin the same Specification revision. The Agent
pins the Wrapper. Update these dependencies deliberately and test the resulting
pipeline before publishing changes.

## Local checkpoint: 2026-11-23

The existing XJTU-SY raw/mean-removed Wizard project was used in an opt-in local
check. The check built the Wizard conversion payload, called the Backend
converter directly, ran selected draft protocol, measurement metadata, sensor
metadata and experiment-type checks, and loaded data through the Wrapper. It
found two studies with two sensor assays each; the first raw and processed file
for each assay loaded successfully. The selected checks reported no errors or
unchecked findings. The processed file means were approximately zero, as
expected for this example.

This check did not exercise the browser export, attachment upload, all files,
or every Specification requirement. The Wizard's backend integration tests
separately exercised the HTTP conversion endpoint with bundled example projects.
Agent metadata tools were checked against the already-exported local XJTU
raw/processed JSON. A later live Agent check listed the two studies and compared
the first raw and processed RMS values for Bearing 1_1 / Accel_Axial; the
reported values agreed with an independent calculation. This was a limited
check, not a general evaluation of Agent reliability.

## Remaining work

- Repeat the end-to-end browser export with the redesigned sensor workflow and
  inspect exported attachments and sensor/device grouping in the Wrapper.
- Complete the Specification's first-release rules, validation coverage,
  fixtures and versioning before claiming full compliance. See the
  Specification repository's first-release audit and backlog.
- Decide how to migrate the Wrapper's `strict_validation` option: currently it
  controls ISA-tools loading and is not the complete shared validator.
