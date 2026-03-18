# Slide 10 — Processing Protocol Output

**ISA-PHM hierarchy level:** Assay  
**Dependencies:** Studies (Slide 5) + Sensors in test setup + Processing Protocols in test setup

---

[SCREENSHOT: Slide 10 — Processing Protocol Output, empty/warning state]

[SCREENSHOT: Slide 10 — Processing Protocol Output, grid view with file names filled]

[SCREENSHOT: Slide 10 — Processing Protocol Output, simple view for one study]

---

## Purpose

Maps processed/derived output files (or values) to each study run and sensor. Also links each study to the processing protocol used to transform raw data into features. This is the Assay layer of the ISA hierarchy for processed data.

The structure and workflow are identical to Slide 9 — the only difference is that this slide references **processing protocols** and **processed output files** rather than raw acquisition.

---

## Grid structure

```
Rows:    Studies (and runs, for Prognostics template)
Columns: One per sensor in the selected test setup
Cells:   File name or path of the processed data file for that sensor/run
```

Each study also has a **Processing Protocol** selector.

---

## Step-by-step

### 1. Select a processing protocol per study

For each study, use the **Processing Protocol** dropdown to select which transformation pipeline was applied to the raw data.

[SCREENSHOT: Slide 10 — processing protocol dropdown open for a study]

If the dropdown is empty: add processing protocols in the test setup editor → **Processing** tab.

### 2. Fill processed output file names

For each study/run row and each sensor column, enter the filename of the processed output:

- `features_bearing_run1_ch1.csv`
- `fft_study2_vib.csv`

[SCREENSHOT: Slide 10 — grid filled with processed filenames]

> **Tip:** Same grid navigation as Slide 9 — Tab across sensor columns for each row, Ctrl+Z to undo the last edit.

### 3. File picker (optional)

Same as Slide 9 — if a dataset is configured, use the file picker to select files from the indexed list. The same root-folder, relative-path, and left-to-right column population rules apply. See [Slide 9 — File picker](./SLIDE_09_MEASUREMENT_OUTPUT.md#3-file-picker-optional-with-indexed-dataset) for the full explanation.

---

## Relationship to Slide 9

| | Slide 9 | Slide 10 |
|---|---|---|
| Protocol type | Measurement protocol | Processing protocol |
| Files represent | Raw sensor signals | Derived features / processed data |
| ISA assay type | Raw data acquisition | Derived data |

Both slides contribute assay entries to the output JSON. A complete project typically has entries on both slides.

If your dataset is raw-only (no feature extraction was done), Slide 10 can be left empty. The assay file will still be generated but will be blank.

---

## Downstream use

Same as Slide 9: generates `a_stXX_stYY.txt` assay files, but for the processed data assays. The processing protocol and its parameters appear at the top of the file.

---

## Final step after Slide 10

After completing Slide 10 (or at any point), click **Convert to ISA-PHM** to generate the output JSON.  
See [Export Guide](../guides/GUIDE_EXPORT.md) for what the output contains and how to use it.

---

[← Slide 9](./SLIDE_09_MEASUREMENT_OUTPUT.md) | [Export Guide →](../guides/GUIDE_EXPORT.md)
