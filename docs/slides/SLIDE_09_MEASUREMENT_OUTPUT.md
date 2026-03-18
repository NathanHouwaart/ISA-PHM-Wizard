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

- `bearing_1500rpm_vib_ch1.mat`
- `study1_run2_accelerometer.csv`

[SCREENSHOT: Slide 9 — grid view, several cells filled with filenames]

File names should match the actual filenames in your dataset deposit so the assay files link correctly.

### 3. File picker (optional, with indexed dataset)

If your project has a **dataset** configured, a file picker action lets you browse and select from the indexed file list instead of typing paths.

[SCREENSHOT: Slide 9 — file picker button visible in a cell/row]

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

Each populated cell in this grid generates an entry in `a_stXX_stYY.txt` (assay files), linking the raw data file to the sensor, run, and study. The measurement protocol and its parameters appear at the top of the assay file.

---

[← Slide 8](./SLIDE_08_TEST_MATRIX.md) | [Next: Slide 10 →](./SLIDE_10_PROCESSING_OUTPUT.md)
