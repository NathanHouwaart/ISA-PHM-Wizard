# Slide 7 — Operating Conditions

**ISA-PHM hierarchy level:** Study (factor variables)  
**Dependencies:** None

---

[SCREENSHOT: Slide 7 — Operating Conditions, empty state]

[SCREENSHOT: Slide 7 — Operating Conditions, several condition rows filled via suggestions]

---

## Purpose

Defines the environmental and operational variables that were controlled or recorded during the experiments. Like fault specifications (Slide 6), these become factor columns in the Study files and Test Matrix columns (Slide 8, right section).

All variables on this slide have the type **Operating condition** — this is fixed and cannot be changed.

---

## Fields per variable

| Field | Description | Example |
|---|---|---|
| **Variable Name** | Short identifier | `Rotational Speed` |
| **Unit** | Physical unit | `RPM` |
| **Description** | Longer description | `Rotational speed of the drivetrain or spindle.` |

---

## Adding variables

**Via suggestions (recommended):** Click suggestion chips to add common variables in one click. Available suggestions include:

| Suggestion | Unit |
|---|---|
| Rotational Speed | RPM |
| Motor Speed | RPM |
| Spindle Speed | RPM |
| Load | N |
| Torque | Nm |
| Temperature | °C |
| Ambient Temperature | °C |
| Pressure | bar |
| Current | A |
| Voltage | V |
| Feed Rate | mm/min |
| Depth of Cut | mm |

[SCREENSHOT: Slide 7 — suggestion chip strip, with several already added]

**Manually:** Click **+ Add** for a blank row.

**Grid view:** Edit all conditions in a table layout.

> **Tip:** Tab through cells to fill all conditions quickly. Ctrl+Z undoes the last edit within the session.

---

## Difference from Fault Specifications

| | Fault Specifications (Slide 6) | Operating Conditions (Slide 7) |
|---|---|---|
| Describes | The fault or degradation state | The machine or environmental state |
| Type | Multiple selectable types | Always "Operating condition" |
| Examples | Fault Type = BPFO, VB = 0.3 mm | Speed = 1500 RPM, Load = 50 N |

Often both types of variables are needed: the fault condition describes *what* was seeded, the operating condition describes *how the machine was running*.

---

## Tips

- Add all conditions that were varied or controlled, even if they were constant across all experiments — constant conditions are still worth documenting for reproducibility.
- Constant values across all studies (e.g. load was always 50 N) are fine — just fill 50 in every cell of Slide 8.

---

## Downstream use

Same as fault specifications: each operating condition becomes a **Study Factor** in `s_study_XX.txt`, with values per sample from Slide 8.

---

[← Slide 6](./SLIDE_06_FAULT_SPECIFICATIONS.md) | [Next: Slide 8 →](./SLIDE_08_TEST_MATRIX.md)
