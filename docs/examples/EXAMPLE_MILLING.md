# Example — Multi Run Milling

The **Multi Run Milling** project is the second pre-loaded example project. It demonstrates a **prognostics, multi-run** ISA-PHM project modelling a milling tool wear experiment where the same tool is measured multiple times as it degrades.

Open it by loading the ISA Questionnaire and selecting **Multi Run Milling** from the Project Sessions modal.

---

## Why this example is different from Sietze

| | Single Run Sietze | Multi Run Milling |
|---|---|---|
| Template | Diagnostic Experiment | Prognostics Experiment |
| Each experiment has | 1 run | Multiple sequential runs |
| Test Matrix | 1 column per experiment | N run-columns per experiment (N = run count) |
| Output Slides | 1 row per experiment | N rows per experiment |
| ISA-PHM equivalence | Independent tests | Repeated observations on same degrading specimen |

In the paper's terminology: milling tool wear is a **prognostic scenario**. The same tool is measured at regular intervals (e.g. every 10 passes), producing multiple runs per experiment that must remain grouped within one experiment.

---

## Project overview

| Property | Value |
|---|---|
| Template | Prognostics Experiment (multi-run) |
| Test setup | Milling Lab |
| Experiments | Several, each with multiple runs |
| Sensors | Multiple vibration/force channels |
| Fault specs | VB (wear land width in mm) |
| Operating conditions | Spindle Speed, Feed Rate, Depth of Cut |

---

## The Milling Lab test setup

[SCREENSHOT: Test Setups — Milling Lab card on overview page]

### Characteristics (Milling Lab)

[SCREENSHOT: Milling Lab Characteristics tab — categories like Milling Machine, Tool, Spindle Speed Range visible]

### Sensors

Force sensors and vibration channels instrumented at the spindle or workpiece.

[SCREENSHOT: Milling Lab Sensors tab — sensor rows listed]

---

## ISA Questionnaire — key differences vs. Sietze

### Slide 5 — Experiment Descriptions (multi-run)

[SCREENSHOT: Slide 5 — Milling project — experiments with "Number of runs" field visible and populated]

Each experiment includes a **Number of runs** field. This represents how many measurement intervals (tool inspections) were carried out for that experiment. For example:
- `Milling Run A` → 10 runs (10 inspection points)

### Slide 8 — Test Matrix (multi-run)

[SCREENSHOT: Slide 8 — Milling project — grid view showing experiment/run rows, VB column with increasing values]

The Test Matrix grid uses one column per run within each experiment. For readability, the values are summarized below as one row per run:

| Experiment | Run | VB (mm) | Spindle Speed | Feed Rate |
|---|---|---|---|---|
| Milling Run A | Run 1 | 0.0 | 710 | 1270 |
| Milling Run A | Run 2 | 0.08 | 710 | 1270 |
| Milling Run A | Run 3 | 0.15 | 710 | 1270 |
| ... | ... | ... | ... | ... |

The VB (wear land width) value increases across runs — this is the **degradation trajectory**. Operating conditions stay constant because the same settings were used throughout.

This contrasts with Sietze where operating conditions vary between experiments (different fault conditions) and each experiment has only one value.

### Slides 9 & 10 — Output Mapping (multi-run)

[SCREENSHOT: Slide 9 — Milling project, grid view showing experiment+run rows and sensor columns]

Each run gets its own row. For each run and each sensor, you provide the file recorded at that measurement interval.

---

## Key lessons from this example

1. **Multi-run = one row per run**, not per experiment. An experiment with 10 runs has 10 rows in the Test Matrix and output grids.
2. **Degradation is captured in the variable values per run.** VB increases across runs of the same experiment — this is what makes the data prognostic.
3. **Operating conditions are typically constant** across all runs of a prognostic experiment (same recipe, same machine settings). The degradation itself is the variable.
4. **File names per run** often encode the run number or inspection index: `milling_runA_pass4_ch1.csv`.
5. The **same experiment can be compared run-to-run** in the output files because runs stay grouped within one experiment.

---

## When to use multi-run vs. separate studies

| Scenario | Correct modelling |
|---|---|
| Same tool, measured 10 times as it wears | Multi-run: one experiment, 10 runs |
| 10 different tools each measured once | Single-run: 10 separate experiments |
| Same bearing, measured at 5 load conditions | Single-run: 5 separate experiments (different conditions = different experiments) |
| Same bearing, measured at intervals over a run-to-failure | Multi-run: one experiment, N runs |

If the **same specimen** is observed **over time** (degrading), that's multi-run. If **different specimens** or **different conditions** are tested, those are separate experiments.

---

## Related

- [Example: Sietze (single-run)](./EXAMPLE_SIETZE.md)
- [Example from scratch](./EXAMPLE_FROM_SCRATCH.md)
- [ISA-PHM Concepts — single vs. multi-run](../guides/GUIDE_CONCEPTS.md#single-run-vs-multi-run-templates)
- [Slide 5 — Experiment Descriptions](../slides/SLIDE_05_EXPERIMENTS.md)
- [Slide 8 — Test Matrix](../slides/SLIDE_08_TEST_MATRIX.md)
