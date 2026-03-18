# Slide 9 — Raw Measurement Output

**ISA-PHM hierarchy level:** Assay  
**Dependencies:** Studies (Slide 5) + Sensors in test setup + Measurement Protocols in test setup

---

[SCREENSHOT: Slide 9 — Raw Measurement Output, empty/warning state (no protocols or sensors)]

[SCREENSHOT: Slide 9 — Raw Measurement Output, grid view with study rows, sensor columns, and file names filled]

[SCREENSHOT: Slide 9 — Raw Measurement Output, simple view showing one study card with protocol selected and sensor file fields]

---

## Purpose

Maps raw measurement output files (or values) to each study run and sensor. Also links each study to the measurement protocol that was used to acquire the data. This is the Assay layer of the ISA hierarchy for raw data.

---

## Grid structure

```
Rows:    Studies (and runs, for Prognostics template)
Columns: One per sensor in the selected test setup
Cells:   File name or path of the raw data file for that sensor/run
```

Additionally, each study has a **Measurement Protocol** selector (a dropdown or visible column) that links the study to one of the measurement protocol variants defined in the test setup.

---

## Step-by-step

### 1. Select a measurement protocol per study

For each study, use the **Measurement Protocol** dropdown to select which protocol was used during that experiment.

[SCREENSHOT: Slide 9 — measurement protocol dropdown open for a study row]

If the dropdown is empty: the test setup has no measurement protocols. Add them in the test setup editor → **Measurement** tab.

### 2. Fill raw output file names

For each study/run row and each sensor column, enter the filename or relative path of the raw data file collected by that sensor:

- `bearing_1500rpm_vib_ch1.csv`
- `study1_run2_accelerometer.csv`

[SCREENSHOT: Slide 9 — grid view, several cells filled with filenames]

> **Tip:** Tab across sensor columns to fill each file name for a study row in one pass. Ctrl+Z undoes the last cell edit.

File names should match the actual filenames in your dataset deposit so the assay files link correctly.

### 3. File picker (optional, with indexed dataset)

If your project has a **dataset** configured, a file picker action lets you browse and select from the indexed file list instead of typing paths.

[SCREENSHOT: Slide 9 — file picker button visible in a cell/row]

#### Root folder and relative paths

Index the **root folder** of your dataset — not a subfolder. All file paths written into the output JSON are **relative to the folder you indexed**. After downloading the JSON, you place it manually in that same root folder. When the dataset is zipped and shared, the JSON sits at the root and its relative paths correctly resolve to the data files beneath it.

If you index a subfolder, the relative paths will be wrong once the JSON is placed at the true dataset root.

| Dataset root | File location | Path written in JSON |
|---|---|---|
| `pump_bench/` | `pump_bench/vibration/run1_ch1.csv` | `vibration/run1_ch1.csv` |
| `pump_bench/` | `pump_bench/run1_vib_ch1.csv` | `run1_vib_ch1.csv` |

#### Left-to-right column population

When you use the file picker for a study row, selected files are assigned to sensor columns **from left to right** in the order they appear in the file browser (typically alphabetical by filename).

For this to work correctly on large datasets, **your filenames must sort alphabetically in the same order as your sensor columns.** If your sensor columns are (left to right) `acc_x`, `acc_y`, `acc_z`, your files should sort in that same order:

```
study01_acc_x_run1.csv   → assigned to acc_x column
study01_acc_y_run1.csv   → assigned to acc_y column
study01_acc_z_run1.csv   → assigned to acc_z column
```

> **Tip:** Design your file naming convention before collecting data. A consistent pattern like `{study}_{sensor}_{run}.{ext}` sorts predictably and maps cleanly to the sensor columns defined in the test setup.

---

## Simple view

Simple view shows one study at a time. Select a study from the left panel to see:
- Its measurement protocol selector
- A field for each sensor's raw output file/value

[SCREENSHOT: Slide 9 — simple view, one study selected, sensor fields visible]

---

## Empty sensor columns? No studies?

| Symptom | Fix |
|---|---|
| No sensor columns | Add sensors to the test setup → Sensors tab |
| No protocol options | Add measurement protocols to the test setup → Measurement tab |
| No study rows | Add experiments on Slide 5 |

---

## Downstream use

Each populated cell in this grid generates one assay entry in the output JSON, linking a raw data file to a specific sensor channel, run, and study. The expected data file format per assay is a two-column file (timestamp + one measurement value). The measurement protocol and its per-sensor parameter values are recorded alongside the assay.

> **Multi-axis sensors** (e.g., a tri-axis accelerometer) should each be entered as separate sensors in the test setup (`acc_x`, `acc_y`, `acc_z`). Each axis then has its own column in this grid and generates its own assay.

---

[← Slide 8](./SLIDE_08_TEST_MATRIX.md) | [Next: Slide 10 →](./SLIDE_10_PROCESSING_OUTPUT.md)
