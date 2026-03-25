# Slide 10 - Raw Measurement Output

**ISA-PHM hierarchy level:** Measurement Output *(ISA: Assay)*  
**Dependencies:** Experiments (Slide 5) + Study Output Mode (Slide 9) + Sensors in test setup + Measurement Protocols in test setup

---

## Purpose

Maps raw measurement output files (or values) to each study run and sensor.  
This slide also links each study to the measurement protocol used for data acquisition.

Rules:
- Measurement protocol is always required.
- Raw file cells are required only when output mode includes raw data.
- Rows set to `Processed only` are shown as disabled for raw file cells.

---

## Grid structure

```
Rows:    Studies (and runs, for Prognostics template)
Columns: One per sensor in the selected test setup
Cells:   File name or relative path of the raw data file for that sensor/run
```

Each row also includes:
- A **Measurement Protocol** selector (study-level, required)

---

## Step-by-step

### 1. Set output mode first

Go to **Slide 9 - Study Output Mode** and set each study to:
- `Raw only`
- `Processed only`
- `Raw + processed`

### 2. Select measurement protocol per study

Choose the measurement protocol used for each study.  
For multi-run studies, only the first run row is editable for this study-level field.

### 3. Fill raw output file names for enabled rows

For rows where raw output is enabled, fill one file per sensor cell:
- `bearing_1500rpm_vib_ch1.csv`
- `study1_run2_accelerometer.csv`

Rows in `Processed only` mode are grayed out and not editable for raw file mappings.

### 4. Use file picker (optional)

If a dataset is indexed, use **Assign files** for bulk mapping in selected cells.  
Assignment order is natural filename order, left-to-right in selection.

---

## Simple view

Simple view shows one study/run at a time with:
- Measurement protocol selector
- One raw file field per sensor (disabled when raw output is not enabled)

---

## Downstream use

Slide 10 contributes the measurement process and raw data file references to `study.assays[]`.

| Slide element | JSON location | Example |
|---|---|---|
| Measurement output filename *(ISA assay filename)* | `assays[].filename` | `"se01"` |
| Raw data file name | `assays[].dataFiles[].name` | `"run01_sensor01.csv"` |
| Measurement protocol | `assays[].processSequence[0].executesProtocol.@id` | protocol id |

Assay filenames follow `se{sensor_index}` within each study (for example `se01`, `se02`).

---

[<- Slide 9](./SLIDE_09_OUTPUT_MODE.md) | [Next: Slide 11 ->](./SLIDE_10_PROCESSING_OUTPUT.md)
