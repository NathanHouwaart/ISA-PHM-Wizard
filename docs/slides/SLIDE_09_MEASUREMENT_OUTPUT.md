# Slide 9 — Raw Measurement Output

**ISA-PHM hierarchy level:** Measurement Output *(ISA: Assay)*  
**Dependencies:** Experiments (Slide 5) + Sensors in test setup + Measurement Protocols in test setup

---

<table><tr>
  <td><img src="../images/annotated/isa-questionnaire-slide-9-empty.png" alt="Slide 9 — empty state" /></td>
  <td><img src="../images/annotated/isa-questionnaire-slide-9-simple-filled.png" alt="Slide 9 — simple view" /></td>
  <td><img src="../images/annotated/isa-questionnaire-slide-9-grid-filled.png" alt="Slide 9 — grid view with filenames filled" /></td>
</tr>
<tr>
  <td align="center"><em>Empty state</em></td>
  <td align="center"><em>Simple view</em></td>
  <td align="center"><em>Grid view</em></td>
</tr></table>

---

## Purpose

Maps raw measurement output files (or values) to each experiment run and sensor. Also links each experiment to the measurement protocol that was used to acquire the data. This is the measurement output layer (ISA: Assay) of the ISA hierarchy for raw data.

---

## Grid structure

```
Rows:    Experiments (and runs, for Prognostics template)
Columns: One per sensor in the selected test setup
Cells:   File name or path of the raw data file for that sensor/run
```

Additionally, each experiment has a **Measurement Protocol** selector (a dropdown or visible column) that links the experiment to one of the measurement protocol variants defined in the test setup.

---

## Step-by-step

### 1. Select a measurement protocol per experiment

For each experiment, use the **Measurement Protocol** dropdown to select which protocol was used during that experiment.

![Slide 9 — measurement protocol dropdown for an experiment row](../images/annotated/isa-questionnaire-slide-9-grid-protocol.png)

If the dropdown is empty: the test setup has no measurement protocols. Add them in the test setup editor → **Measurement** tab.

### 2. Fill raw output file names

For each experiment/run row and each sensor column, enter the filename or relative path of the raw data file collected by that sensor:

- `bearing_1500rpm_vib_ch1.csv`
- `study1_run2_accelerometer.csv`

> **Expected file format:** Two-column delimited file (CSV or TXT) — a `time` column followed by the sensor measurement column:
>
> ```
> time,vib_ch1
> 0.0,0.0015
> 0.0001,0.0023
> 0.0002,-0.0011
> ```

![Slide 9 — grid view with filenames filled across sensor columns](../images/annotated/isa-questionnaire-slide-9-grid-filled.png)

> **Tip:** Tab across sensor columns to fill each file name for an experiment row in one pass. Ctrl+Z undoes the last cell edit.


File names should match the actual filenames in your dataset deposit so the measurement output files link correctly.

### 3. File picker (optional, with indexed dataset)

If your project has a dataset indexed, a file picker button appears when you select cells in a row. Click it to browse the indexed file list and assign paths without typing.

![Slide 9 — file picker button visible in the grid toolbar](../images/annotated/isa-questionnaire-slide-9-file-picker-button.png)

The file picker supports **bulk assignment**: select multiple sensor-column cells for an experiment/run row, then open the picker. Files are assigned left to right in the order that they appear in the file picker (alphabetical filename order). Picking fewer files than cells leaves the remaining cells blank; picking more files than cells truncates the extras.

For full details on fill behaviour, file naming conventions, and root-folder relative paths — see **[Working with the Grid](../guides/GUIDE_GRID.md#assign-files-file-picker)**.

---

## Simple view

Simple view shows one experiment at a time. Select an experiment from the left panel to see:
- Its measurement protocol selector
- A field for each sensor's raw output file/value

![Slide 9 — simple view with one experiment selected and sensor fields visible](../images/annotated/isa-questionnaire-slide-9-simple-filled.png)

---

## Empty sensor columns? No experiments?

| Symptom | Fix |
|---|---|
| No sensor columns | Add sensors to the test setup → Sensors tab |
| No protocol options | Add measurement protocols to the test setup → Measurement tab |
| No experiment rows | Add experiments on Slide 5 |

---

## Downstream use

Each sensor column for an experiment generates one measurement output entry (`study.assays[]` in the output JSON). Slides 9 and 10 together fill in the **same assay output objects** — Slide 9 supplies the measurement process and the raw data file; Slide 10 adds the processing process and processed output file.

| Slide 9 element | JSON location | Example |
|---|---|---|
| Measurement output filename *(ISA: Assay filename)* | `assays[].filename` | `"a_st01_se01"` (experiment 1, sensor 1) |
| Raw data file name | `assays[].dataFiles[].name` | `"Vibration_Motor-2_100_time-bearing bpfo 3-ch1.txt"` |
| File type | `assays[].dataFiles[].type` | `"Derived Data File"` |
| Measurement type | `assays[].measurementType.annotationValue` | `"Vibration"` |
| Sensor model | `assays[].technologyPlatform` | `"Wilcoxon 786B-10"` |
| Measurement protocol | `assays[].processSequence[0].executesProtocol.@id` | references the measurement protocol |

Measurement output filenames (ISA: assay filenames) follow the pattern `a_st{experiment_index}_se{sensor_index}` — e.g. experiment 1 / sensor 3 → `a_st01_se03`. The `st` prefix is the ISA abbreviation for "study".

> **Multi-axis sensors** (e.g., a tri-axis accelerometer) should each be entered as separate sensors in the test setup (`acc_x`, `acc_y`, `acc_z`). Each axis then has its own column in this grid and generates its own measurement output file.

---

[← Slide 8](./SLIDE_08_TEST_MATRIX.md) | [Next: Slide 10 →](./SLIDE_10_PROCESSING_OUTPUT.md) | [Troubleshooting](../guides/TROUBLESHOOTING.md)
