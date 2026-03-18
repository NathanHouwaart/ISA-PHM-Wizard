# Slide 5 — Experiment Descriptions

**ISA-PHM hierarchy level:** Study  
**Dependencies:** Test setup selected + at least one configuration in that setup (for the configuration dropdown)

---

[SCREENSHOT: Slide 5 — Experiments, empty state (no experiments yet, empty state message)]

[SCREENSHOT: Slide 5 — Experiments, simple view with two experiment cards filled]

[SCREENSHOT: Slide 5 — Experiments, grid view with multiple rows]

---

## Purpose

Defines all experiments in the project. Each experiment becomes one ISA Study. The set of experiments you create here drives the rows in the Test Matrix (Slide 8) and the output mapping grids (Slides 9–10).

---

## Fields per experiment

| Field | Required | Description | Example |
|---|---|---|---|
| **Experiment Name** | Yes | Descriptive short name | `BPFO Fault Severity 1 100%` |
| **Description** | No | Free-text description of what was done | `Outer race fault, seeded at the 6 o'clock position` |
| **Submission Date** | No | When this study was submitted/recorded | `2023-10-26` |
| **Publication Date** | No | When this study was published | `2023-12-17` |
| **Configuration** | No | The test setup configuration that applies | `Faulted Bearing RC-002` |
| **Number of Runs** | Prognostics only | How many sequential runs this study contains | `5` |

---

## Adding experiments

**Simple view:** Click **+ Add** (or the empty-state button). A card appears for each experiment. Expand or edit inline.

**Grid view:** Each row is an experiment. Click a cell to edit. Use the trash column to delete a row.

[SCREENSHOT: Slide 5 — grid view with experiments, configuration column showing dropdown]

---

## Configuration dropdown

The **Configuration** dropdown is populated from the configurations defined in your selected test setup. If it is empty:
1. Go to your test setup editor.
2. Open the **Configurations** tab.
3. Add at least one configuration.
4. Return to Slide 5 — the dropdown will now be populated.

---

## Number of runs (Prognostics Experiment only)

This field only appears when the project template is set to **Prognostics Experiment**. Set it to the number of runs (measurement intervals) for each study. For example, a milling tool wear experiment with 5 tool inspections = 5 runs.

Each run gets its own column in the Test Matrix (Slide 8) and its own row in the output mapping grids.

[SCREENSHOT: Slide 5 — experiment card with Number of Runs field visible (prognostics template)]

---

## Downstream use

Each experiment here becomes a Study row in `s_study_XX.txt`. The experiment name becomes the Study Identifier. The configuration links to the test setup configuration metadata.

---

[← Slide 4](./SLIDE_04_PUBLICATIONS.md) | [Next: Slide 6 →](./SLIDE_06_FAULT_SPECIFICATIONS.md)
