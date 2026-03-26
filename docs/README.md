# ISA-PHM Wizard — Documentation

Reference for *ISA-PHM - a Standardized Format for Storing and Utilizing Metadata of Diagnostic and Prognostic Tests* ([paper PDF](./references/ISA-PHM_paper_final.pdf)).

---

## New here? Start in order

1. [ISA-PHM Concepts](./guides/GUIDE_CONCEPTS.md) — understand the Project/Experiment/Measurement Output hierarchy *(ISA: Investigation/Study/Assay)*, test setups, and the dependency chain before touching the app
2. [Quick Start](./guides/GUIDE_QUICKSTART.md) — blank screen to first export, step by step with example values
3. [Project Management](./guides/GUIDE_PROJECT_MANAGEMENT.md) — create, configure, import, export, and switch projects

---

## Main workflow guides

| Guide | What it covers |
|---|---|
| [Project Sessions](./guides/GUIDE_PROJECT_MANAGEMENT.md) | Create, configure, import, export, and switch projects from the Project Sessions modal |
| [Test Setups](./guides/GUIDE_TEST_SETUPS.md) | Build your lab bench description (sensors, configurations, protocols) |
| [Questionnaire](./guides/GUIDE_QUESTIONNAIRE.md) | Navigate the 11-slide ISA questionnaire (assumes project and test setup are ready) |
| [Working with the Grid](./guides/GUIDE_GRID.md) | Grid navigation, Fill Row / Row+ / Row−, and the file picker for bulk file assignment |
| [Export](./guides/GUIDE_EXPORT.md) | What "Convert to ISA-PHM" produces and how to use the output |
| [Troubleshooting](./guides/TROUBLESHOOTING.md) | Empty dropdowns, missing rows, conversion failures |

---

## Slide-by-slide reference

Each slide has its own page with field tables, dependency notes, and screenshot placeholders.

| Slide | Guide |
|---|---|
| 1 — Introduction | [SLIDE_01_INTRODUCTION.md](./slides/SLIDE_01_INTRODUCTION.md) |
| 2 — Project Information | [SLIDE_02_PROJECT_INFORMATION.md](./slides/SLIDE_02_PROJECT_INFORMATION.md) |
| 3 — Contacts | [SLIDE_03_CONTACTS.md](./slides/SLIDE_03_CONTACTS.md) |
| 4 — Publications | [SLIDE_04_PUBLICATIONS.md](./slides/SLIDE_04_PUBLICATIONS.md) |
| 5 — Experiment Descriptions | [SLIDE_05_EXPERIMENTS.md](./slides/SLIDE_05_EXPERIMENTS.md) |
| 6 — Fault Specifications | [SLIDE_06_FAULT_SPECIFICATIONS.md](./slides/SLIDE_06_FAULT_SPECIFICATIONS.md) |
| 7 — Operating Conditions | [SLIDE_07_OPERATING_CONDITIONS.md](./slides/SLIDE_07_OPERATING_CONDITIONS.md) |
| 8 — Test Matrix | [SLIDE_08_TEST_MATRIX.md](./slides/SLIDE_08_TEST_MATRIX.md) |
| 9 — Study Output Mode | [SLIDE_09_OUTPUT_MODE.md](./slides/SLIDE_09_OUTPUT_MODE.md) |
| 10 — Raw Measurement Output | [SLIDE_09_MEASUREMENT_OUTPUT.md](./slides/SLIDE_09_MEASUREMENT_OUTPUT.md) |
| 11 — Processing Output | [SLIDE_10_PROCESSING_OUTPUT.md](./slides/SLIDE_10_PROCESSING_OUTPUT.md) |

---

## Test setup tab reference

| Tab | Guide |
|---|---|
| Basic Info | [TAB_BASIC_INFO.md](./test-setup-tabs/TAB_BASIC_INFO.md) |
| Characteristics | [TAB_CHARACTERISTICS.md](./test-setup-tabs/TAB_CHARACTERISTICS.md) |
| Sensors | [TAB_SENSORS.md](./test-setup-tabs/TAB_SENSORS.md) |
| Configurations | [TAB_CONFIGURATIONS.md](./test-setup-tabs/TAB_CONFIGURATIONS.md) |
| Measurement Protocols | [TAB_MEASUREMENT_PROTOCOLS.md](./test-setup-tabs/TAB_MEASUREMENT_PROTOCOLS.md) |
| Processing Protocols | [TAB_PROCESSING_PROTOCOLS.md](./test-setup-tabs/TAB_PROCESSING_PROTOCOLS.md) |

---

## Worked examples

| Example | Description |
|---|---|
| [From scratch](./examples/EXAMPLE_FROM_SCRATCH.md) | Invented simple bearing diagnostics — complete walkthrough from nothing to export |
| [Single Run Sietze](./examples/EXAMPLE_SIETZE.md) | Pre-loaded real-world diagnostic example (single-run template) |
| [Multi Run Milling](./examples/EXAMPLE_MILLING.md) | Pre-loaded real-world prognostics example (multi-run template) |
