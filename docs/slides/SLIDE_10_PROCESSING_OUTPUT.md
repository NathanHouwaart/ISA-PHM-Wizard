# Slide 11 - Processing Output

**ISA-PHM hierarchy level:** Processing Output *(ISA: Assay)*  
**Dependencies:** Experiments (Slide 5) + Study Output Mode (Slide 9) + Sensors in test setup + Processing Protocols in test setup

---

## Purpose

Maps processed/derived output files (or values) to each study run and sensor.  
This slide also links each study to the processing protocol used to transform raw data.

Rules:
- Processing protocol and processed files are required only when output mode includes processed data.
- Rows set to `Raw only` are shown as disabled for processing protocol and processed file cells.
- Measurement protocol on raw output slide is still mandatory even for `Processed only`.

---

## Grid structure

```
Rows:    Studies (and runs, for Prognostics template)
Columns: One per sensor in the selected test setup
Cells:   File name or relative path of the processed data file for that sensor/run
```

Each row also includes:
- A **Processing Protocol** selector (study-level, required only when processed output is enabled)

---

## Step-by-step

### 1. Set output mode first

Configure output mode on **Slide 9 - Study Output Mode**.

### 2. Select processing protocol for enabled studies

Pick the processing protocol for studies that include processed output.  
For multi-run studies, only the first run row is editable for this study-level field.

### 3. Fill processed output file names for enabled rows

For processed-enabled rows, fill one file per sensor cell:
- `features_bearing_run1_ch1.csv`
- `fft_experiment2_vib.csv`

Rows in `Raw only` mode are grayed out and not editable on this slide.

### 4. Use file picker (optional)

If a dataset is indexed, use **Assign files** for bulk mapping in selected cells.

---

## Relationship to raw output slide

| | Raw output slide | Processing output slide |
|---|---|---|
| Protocol type | Measurement protocol | Processing protocol |
| Files represent | Raw sensor signals | Derived features / processed data |
| Required by mode | Raw-enabled studies | Processed-enabled studies |

Both slides write into the same `study.assays[]` entries.

---

## Downstream use

Slide 11 fills the second process in each assay:
- `assays[].processSequence[1].executesProtocol.@id`
- `assays[].processSequence[1].outputs[]`

---

[<- Slide 10](./SLIDE_09_MEASUREMENT_OUTPUT.md) | [Export Guide ->](../guides/GUIDE_EXPORT.md)
