# Quick Start — First ISA-PHM Project

This page takes you from a completely fresh install to a converted ISA-PHM export in the shortest possible path. It uses a simple invented scenario so every field has a concrete example value.

**Scenario used in this guide:** A single-run bearing diagnostics test on a small motor-pump bench.  
For real-world filled examples, see [Example: Sietze (single-run)](../examples/EXAMPLE_SIETZE.md) and [Example: Milling (multi-run)](../examples/EXAMPLE_MILLING.md).

---

## Before you start

Open the app. You will land on the Home page.

[SCREENSHOT: Home page showing the three navigation cards — About, Test Setups, ISA Questionnaire]

---

## Step 1 — Build a Test Setup

Test setups must exist before you create a project, because a project links to one.

1. Click **Test Setups** from the Home page.
2. Click **Add Test Setup**.

[SCREENSHOT: Test Setups overview — empty state, "Add Test Setup" button visible]

### 1a — Basic Info tab

Fill in the required fields:

| Field | Example value |
|---|---|
| Name | My Pump Bench |
| Location | Lab A, Building 2 |
| Experiment Preparation Protocol Name | Standard bearing swap |
| Set-up or test specimen-name | Pump bench v1 |

[SCREENSHOT: Basic Info tab — fields filled with the values above]

### 1b — Sensors tab

1. Click **+ Add Sensor**.
2. Add at least one sensor:

| Field | Example |
|---|---|
| Alias | vib_ch1 |
| Sensor Model | PCB 352C33 |
| Sensor Type | Accelerometer |
| Measurement Type | Vibration |

[SCREENSHOT: Sensors tab — one sensor row filled in]

> **Why this matters:** Every sensor you define here becomes a column in the measurement and processing output mapping grids (Slides 9 & 10).

### 1c — Configurations tab

Add a configuration for each hardware variant you tested.

1. Click **+ Add Configuration**.
2. Fill: Name = `Healthy Bearing`, Replaceable Component ID = `RC-001`.
3. (Optional) add a second: Name = `Faulted Bearing`, ID = `RC-002`.

[SCREENSHOT: Configurations tab — two configurations listed]

### 1d — Measurement Protocols tab

1. Click **+ Add Protocol Variant** (or similar button).
2. Name it `Standard Acquisition`.
3. Add a parameter using the suggestions strip or **+ Add parameter**:
   - Parameter: `Sampling Rate`, Unit: `kHz`, Value for vib_ch1: `25.6`

[SCREENSHOT: Measurement Protocols tab — one protocol variant with one parameter row and sensor column filled]

### 1e — Processing Protocols tab

Same pattern. Name it `FFT Feature Extraction`. Add at least one parameter.

[SCREENSHOT: Processing Protocols tab — one protocol variant with parameters]

### 1f — Save

Click **Add Test Setup** at the bottom.

[SCREENSHOT: Save button highlighted at the bottom of the editor]

---

## Step 2 — Create a Project

1. Click **ISA Questionnaire** in the navbar or Home page.
2. The Project Sessions modal opens.

[SCREENSHOT: Project Sessions modal — empty, showing "Create New Project" option]

3. Click **Create New Project** (or equivalent button).
4. Enter a project name, e.g. `Pump Diagnostics 2026`, and confirm.

[SCREENSHOT: Project name entry dialog — name filled in]

5. The new project appears. You now need to configure it:
   - Click **Template** → select **Diagnostic Experiment** → save.
   - Click **Test Setup** → select `My Pump Bench` → save.

[SCREENSHOT: Project card showing configured template and test setup]

6. Click **Select** (or the project card) to make it the active project.

---

## Step 3 — Fill the Questionnaire

You are now inside the 10-slide questionnaire.

[SCREENSHOT: Slide 1 Introduction — fresh blank project]

### Slide 2 — Project Information

Fill:
- Title: `Pump Bearing Diagnostics 2026`
- Description: `Vibration diagnostics under fault and healthy conditions on pump bench v1.`
- License: `MIT License`
- Data collection date: `2026-03-01`
- Public release date: `2026-06-01`

Click **Next**.

[SCREENSHOT: Slide 2 — fields filled]

### Slide 3 — Contacts

Click **Add Contact**. Fill first name, last name, email, and at least one role.

Click **Next**.

[SCREENSHOT: Slide 3 — one contact card]

### Slide 4 — Publications

Optional. Skip if you have no publication yet. Click **Next**.

### Slide 5 — Experiment Descriptions

Click **Add** (or **+**) to add two experiments:

| Name | Configuration |
|---|---|
| Healthy Baseline | Healthy Bearing |
| BPFO Fault Test | Faulted Bearing |

[SCREENSHOT: Slide 5 — two experiment cards, each with a configuration selected]

Click **Next**.

### Slide 6 — Fault Specifications

Click the suggestion chips to add:
- **Fault Type** (Qualitative fault specification)
- **Fault Severity** (Quantitative fault specification)

[SCREENSHOT: Slide 6 — two fault specification rows added via suggestion chips]

Click **Next**.

### Slide 7 — Operating Conditions

Click the suggestion chips to add:
- **Rotational Speed** (RPM)
- **Load** (N)

[SCREENSHOT: Slide 7 — two operating condition rows]

Click **Next**.

### Slide 8 — Test Matrix

For each study and each variable, enter the value that applies to that run:

| Study | Fault Type | Fault Severity | Rotational Speed | Load |
|---|---|---|---|---|
| Healthy Baseline | None | 0 | 1500 | 50 |
| BPFO Fault Test | BPFO | 1 | 1500 | 50 |

Click a cell in the grid and type the value, or use simple view to fill study by study.

[SCREENSHOT: Slide 8 grid view — cells filled with the values above]

Click **Next**.

### Slide 9 — Raw Measurement Output

1. For each study, select a **Measurement Protocol** from the dropdown (e.g. `Standard Acquisition`).
2. Fill in the file names (or values) per sensor and per run:
   - Healthy Baseline / vib_ch1: `healthy_run1_ch1.mat`
   - BPFO Fault Test / vib_ch1: `bpfo_sev1_ch1.mat`

[SCREENSHOT: Slide 9 — protocol selected per study and file names in sensor columns]

Click **Next**.

### Slide 10 — Processing Protocol Output

Same pattern as Slide 9, using **Processing Protocol** (`FFT Feature Extraction`).

[SCREENSHOT: Slide 10 — protocol selected and processed file names filled]

---

## Step 4 — Convert to ISA-PHM

Click **Convert to ISA-PHM** (visible on the last slide or in the header area).

[SCREENSHOT: Convert to ISA-PHM button highlighted]

The wizard sends your metadata to the backend service and returns a ZIP download containing the ISA-PHM files.

[SCREENSHOT: Success state / download prompt after conversion]

---

## What you created

```
i_investigation.txt          ← project title, contacts, publications
s_study_01.txt               ← Healthy Baseline study + test matrix values
s_study_02.txt               ← BPFO Fault Test study + test matrix values
a_st01_stXX.txt              ← assay files per study–sensor pair (raw output)
a_st02_stXX.txt              ← assay files per study–sensor pair (processed output)
```

---

## Next steps

- Read [ISA-PHM Concepts](./GUIDE_CONCEPTS.md) for a deeper explanation of what each file contains.
- Read [Guide: Export](./GUIDE_EXPORT.md) for details on the output format.
- Open **Single Run Sietze** or **Multi Run Milling** (pre-loaded example projects) to see a fully filled project.
