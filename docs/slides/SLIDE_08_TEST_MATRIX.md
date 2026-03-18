# Slide 8 — Test Matrix

**ISA-PHM hierarchy level:** Study (sample factor values)  
**Dependencies:** Studies (Slide 5) + Study Variables (Slides 6–7)

---

<table><tr>
  <td><img src="../images/annotated/isa-questionnaire-slide-8.png" alt="Slide 8 — Test Matrix in Diagnostics mode" /></td>
  <td><img src="../images/annotated/isa-questionnaire-slide-8-prognostics.png" alt="Slide 8 — Test Matrix in Prognostics mode" /></td>
</tr>
<tr>
  <td align="center"><em>Diagnostics — one column per study</em></td>
  <td align="center"><em>Prognostics — one column  per run per study</em></td>
</tr></table>

---

## Purpose

The Test Matrix is where the experiment design becomes explicit. You assign a value for every study variable to every study or run.

The experiment type determines **how many columns appear per study**:

- **Diagnostics**: one column per study
- **Prognostics**: one column per run per study

> **Note — fixed values vs. time series:** The number of columns is separate from what kind of value goes in each cell. Any factor row — in both diagnostics and prognostics — can hold either a **fixed scalar** (e.g. `"BPFO"`, `1300`) or a **file path to a time-series CSV** (e.g. `.../run_01_settings.csv`). Use file paths when that factor's value changes over time within a run and is recorded as a separate file.

---

## Grid structure

```
Rows:    Fault Specifications | Operating Conditions
Columns: Studies (Diagnostics) or runs per study (Prognostics)
Cells:   Factor value for that variable / study or run
```

### Diagnostics experiment

Each study appears as **one column**. Values are typically fixed scalars — the fault type, severity, speed, etc. for that experiment.

```
| Variable           | Motor + Pump 1 | Motor + Pump 2 |
|--------------------|----------------|----------------|
| Fault Type         | BPFO           | BPFI           |
| Fault Position     | Center         | Left           |
| Motor Speed        | 1300 RPM       | 1300 RPM       |
| Discharge Pressure | 120 bar        | 100 bar        |
```

![Slide 8 — Test Matrix in Diagnostics mode, one column per study](../images/annotated/isa-questionnaire-slide-8.png)

A diagnostics study can also use file paths if a fixed value cannot be guaranteed — for example, when a factor varies during a run and is logged to a file rather than captured as a single number.

### Prognostics experiment

Each study appears as **multiple columns** — one per run — labelled `Run 1`, `Run 2`, etc. (determined by *Number of runs* on Slide 5). Values are often **file paths** when each run's factor is logged to a separate CSV file, but fixed scalars work too when a factor doesn't change between runs.

```
| Variable              | Run 1                       | Run 2                       | … |
|-----------------------|-----------------------------|-----------------------------|-…-|
| Feed Rate (file path) | .../Case_01_feed_run_01.csv | .../Case_01_feed_run_02.csv | … |
| Material (fixed)      | Steel                       | Steel                       | … |
```

![Slide 8 — Test Matrix in Prognostics mode, one column per run](../images/annotated/isa-questionnaire-slide-8-prognostics.png)

The **file picker** (see below) helps you assign file paths without typing them manually.

## Filling the grid

**Grid view:**
1. Click a cell to select it.
2. Type the value and press Enter or Tab.
3. Continue across the row.

![SCREENSHOT: Slide 8 — grid view with a cell being edited (cursor visible in cell)](../images/annotated/isa-questionnaire-slide-8-edit-cell.png)

> **Tip:** Tab down a column to fill all variable values for one study, then move to the next column. Ctrl+Z undoes the last cell edit within the session.

**Simple view:**
1. Select a study from the left panel.
2. For each variable, a field or input appears on the right.
3. Fill each value.
4. Move to the next study.

![SCREENSHOT: Slide 8 — simple view, one study selected showing its variables](../images/annotated/isa-questionnaire-slide-8-edit-simple.png)

---

## File picker (Prognostics template)

For prognostic experiments, factor values in the Test Matrix are often **file paths** to per-run settings files. If your project has a dataset indexed, a file picker button appears when you select cells — click it to browse and assign files instead of typing paths.

![SCREENSHOT: Slide 8 — file picker action button visible in a cell or row](../images/annotated/isa-questionnaire-slide-8-file-picker-button.png)

> For diagnostics experiments, cell values are plain text or numbers — the file picker does not appear.

The file picker supports **bulk assignment**: select multiple cells first, then pick files. Files are assigned left to right in alphabetical filename order. If you pick fewer files than cells the remainder stay blank; if you pick more than cells the extras are ignored.

For full details on selection behaviour, file naming conventions, and root-folder paths — see **[Working with the Grid](../guides/GUIDE_GRID.md#assign-files-file-picker)**.

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

Each row of the test matrix becomes one entry in `study.materials.samples[]`. The sample's factor values are written into `samples[].factorValues[]`, one per variable column.

| Test Matrix concept | JSON key |
|---|---|
| One row (study or run) | `study.materials.samples[]` |
| Cell value | `samples[].factorValues[].value` |
| Which factor | `samples[].factorValues[].category.@id` (references `study_factor` entry) |
| Unit (if set) | `samples[].factorValues[].unit.@id` (references `unitCategories` entry) |
| Sample name | `samples[].name` (auto-generated) |

### Diagnostics (Sietze example)

One `samples[]` entry per study. Factor values are direct scalars.

```json
"samples": [
  {
    "name": "Techport - Motor + Pump 2-0",
    "factorValues": [
      { "category": { "@id": "#study_factor/..." }, "value": "BPFO" },
      { "category": { "@id": "#study_factor/..." }, "value": "Center" },
      { "category": { "@id": "#study_factor/..." }, "value": "1" },
      { "category": { "@id": "#study_factor/..." }, "unit": { "@id": "#unit/..." }, "value": "1300" },
      { "category": { "@id": "#study_factor/..." }, "unit": { "@id": "#unit/..." }, "value": "120" }
    ]
  }
]
```

- Sample name pattern: `"{study name}-0"` (single sample, always index `0`)
- Values: plain strings or numbers (fault type, severity, speed, pressure, etc.)

### Prognostics (Milling example)

Multiple `samples[]` entries per study — one per run. Factor values are **file paths** to per-run settings files.

```json
"samples": [
  {
    "name": "Milling Lab - Dril Bit 1-0",
    "factorValues": [
      { "category": { "@id": "#study_factor/..." }, "value": ".../Case_01_time_run_01.csv" },
      { "category": { "@id": "#study_factor/..." }, "value": ".../Case_01_CS_run_01.csv" }
    ]
  },
  {
    "name": "Milling Lab - Dril Bit 1-1",
    "factorValues": [
      { "category": { "@id": "#study_factor/..." }, "value": ".../Case_01_time_run_02.csv" },
      { "category": { "@id": "#study_factor/..." }, "value": ".../Case_01_CS_run_02.csv" }
    ]
  }
  // ... 15 more entries (17 runs total)
]
```

- Sample name pattern: `"{study name}-{run index}"` (e.g. `-0`, `-1`, ..., `-16` for 17 runs)
- Values: file paths, not scalars — each run's settings file path per factor column

---

[← Slide 7](./SLIDE_07_OPERATING_CONDITIONS.md) | [Next: Slide 9 →](./SLIDE_09_MEASUREMENT_OUTPUT.md)
