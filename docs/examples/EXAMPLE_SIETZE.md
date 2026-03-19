# Example — Single Run Sietze

The **Single Run Sietze** project is one of the two pre-loaded example projects in the wizard. It demonstrates a **diagnostic, single-run** ISA-PHM project based on a real published dataset: *Motor Current and Vibration Monitoring Dataset for various Faults in an E-motor-driven Centrifugal Pump* (DOI: [10.1016/j.dib.2023.109987](https://doi.org/10.1016/j.dib.2023.109987)).

Open it by loading the ISA Questionnaire and selecting **Single Run Sietze** from the Project Sessions modal.

---

## Project overview

| Property | Value |
|---|---|
| Template | Diagnostic Experiment (single-run) |
| Test setup | Techport |
| Experiments | 2 (BPFO Fault Severity 1 and Severity 2) |
| Sensors | 11 vibration channels + current channels |
| Fault specs | Fault Type, Fault Position, Fault Severity |
| Operating conditions | Motor Speed, Discharge Pressure, Flow |

---

## The Techport test setup

The linked test setup is called **Techport**, located in Amsterdam. It models an electric induction motor driving a centrifugal pump with replaceable bearing components.

[SCREENSHOT: Test Setups — Techport card on the overview page]

### Characteristics (Techport)

[SCREENSHOT: Techport Characteristics tab — categories like Motor, Motor Bearing, Pump, Pump Bearing visible]

Key characteristics:

| Category | Value |
|---|---|
| Motor | MG160MA4042-H3 |
| Motor Bearing | 6309.C4 |
| Pump | NK80–250/270 A2F2AE |
| Pump Bearing | 6308.2Z.C3.SYN |
| Motor Speed Accuracy | 5 RPM |

### Sensors

11 vibration accelerometer channels (`ch1`–`ch11`) plus a motor current channel.

### Configurations

One configuration per bearing fault state (healthy, BPFO severity 1, BPFO severity 2, etc.).

---

## ISA Questionnaire — slide by slide

### Slide 2 — Project Information

[SCREENSHOT: Slide 2 — Sietze project, showing the filled project title and description]

| Field | Value |
|---|---|
| Title | `Diagnostics on an E-motor-driven centrifugal pump set-up` |
| Description | `The complete set-up contains four centrifugal pumps, each driven by an induction motor. Two measurement methods, four motor speeds and 11 fault types can be induced at various severity levels.` |
| License | `MIT License` |
| Submission date | `2023-10-26` |
| Public release date | `2023-12-17` |

### Slide 3 — Contacts

Four contacts — Contact 1 through Contact 4 — with roles such as Conceptualization, Data curation, Supervision, Software.

### Slide 4 — Publications

One publication:
- Title: `Motor Current and Vibration Monitoring Dataset for various Faults in an E-motor-driven Centrifugal Pump`
- DOI: `10.1016/j.dib.2023.109987`
- Status: `Published`

### Slide 5 — Experiment Descriptions

Two experiments:

| Name | Configuration |
|---|---|
| BPFO Fault Severity 1 100% | (corresponding configuration) |
| BPFO Fault Severity 2 100% | (corresponding configuration) |

Each has a submission date (2023-10-26) and publication date (2023-12-17).

### Slides 6 & 7 — Experiment Variables

**Fault specifications:**

| Name | Type |
|---|---|
| Fault Type | Qualitative fault specification |
| Fault Position | Qualitative fault specification |
| Fault Severity | Quantitative fault specification |

**Operating conditions:**

| Name | Unit |
|---|---|
| Motor Speed | RPM |
| Discharge Pressure | bar |
| Flow | m³/h |

### Slide 8 — Test Matrix

[SCREENSHOT: Slide 8 grid view — Sietze project — BPFO, position, severity, and operating condition values filled for both experiments]

| Experiment | Fault Type | Fault Position | Fault Severity | Motor Speed | Discharge Pressure | Flow |
|---|---|---|---|---|---|---|
| BPFO Fault Severity 1 100% | BPFO | Center | 1 | 1300 | 120 | 1.4 |
| BPFO Fault Severity 2 100% | BPFO | Center | 2 | 1300 | 120 | 1.4 |

Note that operating conditions are the same for both experiments (same operating point), differing only in fault condition.

### Slide 9 — Raw Measurement Output

[SCREENSHOT: Slide 9 — Sietze project — measurement protocol selected, filenames filled across 11 sensor columns]

Each experiment row has the `Standard Measurement Protocol` selected. File names follow the pattern:
`Vibration_Motor-2_100_time-bearing bpfo X-chY.txt`

### Slide 10 — Processing Protocol Output

[SCREENSHOT: Slide 10 — Sietze project — processing protocol selected, processed filenames filled]

Processed filenames follow the same naming convention but point to the extracted feature files.

---

## Key lessons from this example

1. **Single-run = one row per experiment.** No run columns in the Test Matrix.
2. **Constant operating conditions** are still documented per experiment — both rows have the same values.
3. **File naming patterns** are often consistent: the filename encodes experiment identity (speed, fault type, severity).
4. **11 sensors** = 11 columns in Slides 9–10 — this is why sensors should be given short, descriptive aliases.

---

## Related

- [Example: Milling (multi-run)](./EXAMPLE_MILLING.md)
- [Example from scratch](./EXAMPLE_FROM_SCRATCH.md)
- [ISA-PHM Concepts — single vs. multi-run](../guides/GUIDE_CONCEPTS.md#single-run-vs-multi-run-templates)
