# The ISA Questionnaire

The questionnaire is the main event — an 11-slide guided form that captures all project metadata and maps studies to measurements. This guide covers navigating the questionnaire, what each slide category does, and the order constraints you need to respect.

For per-slide field details, see the [slides](../slides/) folder.

---

## Opening the questionnaire

1. Click **ISA Questionnaire** in the navbar or Home page.
2. The **Project Sessions modal** opens. Select or create the project you want to work on.
3. The modal closes and you land on Slide 1.

[SCREENSHOT: Questionnaire landing — Slide 1 visible, project name shown in header]

---

## Navigation

- Use the **Next / Previous** arrow buttons (or keyboard) to move between slides.
- Click the **progress dots** at the top to jump directly to a slide.
- The **project name** and a **Change Project** button in the header let you switch sessions without leaving the questionnaire.

[SCREENSHOT: Questionnaire header — progress dots, previous/next buttons, and project name highlighted]

---

## Before you fill any slide

Confirm the project has:

- [ ] A **test setup** selected (needed for Slides 5, 10, 11)
- [ ] The correct **experiment template** (Diagnostic or Prognostics) — changing it later resets run mappings
- [ ] Sensors, configurations, and protocols in the test setup (needed for Slides 5, 10, 11)

If any of these are missing, the Project Sessions modal lets you configure them now. See [Project Management](./GUIDE_PROJECT_MANAGEMENT.md).

---

## Slide categories and recommended order

### Category A — Project metadata *(ISA: Investigation)* (Slides 2–4)

Captures the top-level project metadata *(ISA: Investigation fields)*. These slides are independent of each other and of the test setup.

| Slide | What you fill |
|---|---|
| 2 — Project Information | Title, description, license, dates |
| 3 — Contacts | Contributors and their roles/affiliations |
| 4 — Publications | Publication metadata and author order |

Complete these early. They have no dependencies.

### Category B — Experiment definitions (Slide 5)

Defines the individual experiments in the project. **Requires configurations from the test setup.**

| Slide | What you fill |
|---|---|
| 5 — Experiment Descriptions | Experiment name, description, dates, configuration, run count (prognostics only) |

### Category C — Experiment variables (Slides 6–7)

Define the variables (fault specifications and operating conditions) that distinguish experiments from each other. These are independent of the test setup.

| Slide | What you fill |
|---|---|
| 6 — Fault Specifications | Fault-related variables (type, severity, location, etc.) |
| 7 — Operating Conditions | Environmental and operational variables (speed, load, temperature) |

**Complete slides 5, 6, and 7 before Slide 8.** The test matrix requires both experiments and variables to exist.

### Category D — Mappings (Slides 8–11)

Map experiments and runs to values and files. These are the most dependency-heavy slides.

| Slide | What you fill | Requires |
|---|---|---|
| 8 — Test Matrix | Variable values per experiment/run | Experiments (Slide 5) + Variables (Slides 6–7) |
| 9 — Study Output Mode | Select per-study output mode (`Raw only`, `Processed only`, `Raw + processed`) | Experiments (Slide 5) |
| 10 — Raw Measurement Output | Raw file per sensor per experiment/run + measurement protocol per experiment | Experiments + Sensors + Measurement Protocols |
| 11 — Processing Output | Processed file per sensor per experiment/run + processing protocol per experiment | Experiments + Sensors + Processing Protocols |

---

## Simple view vs. Grid view

Most slides offer two views, toggled by tabs at the top:

**Simple view**
- Card-based layout, one entity at a time
- Better for making deliberate edits with context
- Comments and richer text fields are visible here

**Grid view**
- Spreadsheet-style table, all entities shown at once
- Faster for bulk input — click a cell and type
- Supports undo/redo within the session

> **Tip:** In grid view, press Ctrl+Z to undo and Ctrl+Y (or Ctrl+Shift+Z) to redo. This works within the current session only — refreshing the page clears the undo history.
>
> For full grid controls, bulk-fill actions, and file picker behavior, see [Working with the Grid](./GUIDE_GRID.md).

[SCREENSHOT: A slide shown in simple view]

[SCREENSHOT: The same slide in grid view]

Both views write to the same underlying data. Switching view does not lose edits.

---

## The In-App Explorer

The drawer on the right side (the layers icon) opens the **In-App Explorer**, which shows a tree view of the current project's mapped data. Use it to quickly verify what experiments, variables, and mappings are currently active.

[SCREENSHOT: In-App Explorer drawer open, showing project tree]

---

## Convert to ISA-PHM

Once all slides are complete, click **Convert to ISA-PHM**.

[SCREENSHOT: Convert button location — on the last slide or in the header]

The button is always accessible. You can press it at any point, but incomplete mappings will result in incomplete output files. For a full description of the output, see [Export Guide](./GUIDE_EXPORT.md).

---

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Configuration dropdown (Slide 5) is empty | No configurations in selected test setup | Add configurations in test setup → Configurations tab |
| Protocol dropdown (Slides 10–11) is empty | No protocols in selected test setup | Add measurement/processing protocols in test setup |
| No sensor columns in grid (Slides 10–11) | No sensors in selected test setup | Add sensors in test setup → Sensors tab |
| Test matrix grid has no variable columns | No experiment variables on Slides 6–7 | Go back and add fault specs / operating conditions |
| Test matrix grid has no experiment rows | No experiments on Slide 5 | Go back and add experiments |

---

## Related guides

- [Slide-by-slide reference](../slides/)
- [Test Setups](./GUIDE_TEST_SETUPS.md)
- [Export Guide](./GUIDE_EXPORT.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
