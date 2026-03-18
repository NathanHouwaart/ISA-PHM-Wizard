# Slide 8 — Test Matrix

**ISA-PHM hierarchy level:** Study (sample factor values)  
**Dependencies:** Studies (Slide 5) + Study Variables (Slides 6–7)

---

[SCREENSHOT: Slide 8 — Test Matrix, empty state (no studies or variables yet — warning shown)]

[SCREENSHOT: Slide 8 — Test Matrix, grid view with studies as rows and variable columns filled]

[SCREENSHOT: Slide 8 — Test Matrix, simple view showing one study with its variable values]

---

## Purpose

The Test Matrix is where the experiment design becomes explicit. You assign a value for every study variable to every study (and every run, if using Prognostics template). This is what makes each study uniquely described in the ISA output.

---

## Grid structure

```
Rows:    Studies (and runs, for Prognostics template)
Columns: Fault Specifications | Operating Conditions
Cells:   The value of that variable for that study/run
```

For **Diagnostic Experiment** (single-run): each study appears once.

For **Prognostics Experiment** (multi-run): each study appears multiple times — once per run — labelled `Run 1`, `Run 2`, etc.

---

## Filling the grid

**Grid view:**
1. Click a cell to select it.
2. Type the value and press Enter or Tab.
3. Continue across the row.

[SCREENSHOT: Slide 8 — grid view with a cell being edited (cursor visible in cell)]

> **Tip:** Tab across a row to fill all variable values for one study, then move down to the next row. Ctrl+Z undoes the last cell edit within the session.

**Simple view:**
1. Select a study from the left panel.
2. For each variable, a field or input appears on the right.
3. Fill each value.
4. Move to the next study.

[SCREENSHOT: Slide 8 — simple view, one study selected showing its variables]

---

## File picker (Prognostics template with indexed dataset)

If your project has a **dataset** configured and the template is **Prognostics**, a file picker action may appear for run-level cells. This lets you browse the indexed dataset and assign file paths rather than typing them manually.

[SCREENSHOT: Slide 8 — file picker action button visible in a cell or row]

---

## Empty grid? Check these first

| Symptom | Fix |
|---|---|
| No rows | Add experiments on Slide 5 |
| No variable columns | Add fault specs (Slide 6) and/or operating conditions (Slide 7) |
| No run sub-rows | Check that the project template is set to Prognostics and `Number of runs` > 1 on Slide 5 |

---

## Tips

- Fill the matrix before moving to Slides 9–10. Output mapping slides show the same study/run rows.
- Values are free text — enter numbers, strings, or codes as they appear in your raw data filenames or experiment log.
- Constant operating conditions (same value for every study) are still filled for every row — copy-paste or grid undo/redo help here.

---

## Downstream use

Each row of the test matrix becomes a sample row in `s_study_XX.txt`. Variable values are written as Factor Values in the ISA Study file.

---

[← Slide 7](./SLIDE_07_OPERATING_CONDITIONS.md) | [Next: Slide 9 →](./SLIDE_09_MEASUREMENT_OUTPUT.md)
