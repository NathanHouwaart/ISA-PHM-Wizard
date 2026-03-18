# Project Management

This guide covers everything related to creating, naming, configuring, switching, importing, and exporting projects in the ISA-PHM Wizard.

---

## The Project Sessions Modal

Every time you open the **ISA Questionnaire**, the Project Sessions modal appears first. This is where you manage all your projects.

[SCREENSHOT: Project Sessions modal — overview with existing projects listed and action buttons]

From this modal you can:
- Select the active project (click a project card)
- Create a new project
- Rename a project
- Delete a project
- Import a project from a JSON file
- Export a project to a JSON file
- Configure a project's template, test setup, and dataset

---

## Creating a New Project

1. Open **ISA Questionnaire**.
2. In the Project Sessions modal, click **New Project** (or the equivalent create button).
3. Enter a project name and confirm.

[SCREENSHOT: New project name input dialog — empty name field]

The project appears in the modal with default configuration. You must now configure it before filling the questionnaire.

---

## Configuring a Project

Each project has four configuration sections, accessible from its card in the modal:

### 1. Name

Click the rename icon on the project card to update the display name.

[SCREENSHOT: Project card — rename icon highlighted]

### 2. Template

Click **Template** on the project card.

[SCREENSHOT: Template selection dialog — two options shown]

Choose one:

| Option | Use when |
|---|---|
| **Diagnostic Experiment** | Short-term tests, each study has one file set (one run) |
| **Prognostics Experiment** | Degradation tests, same study has multiple sequential runs |

This choice affects the Test Matrix (Slide 8) and Output mapping slides (9 & 10). **You can change it later**, but doing so resets run-level mappings.

### 3. Test Setup

Click **Test Setup** on the project card.

[SCREENSHOT: Test Setup selection dialog — list of available test setups]

Select the test setup that represents your lab bench. Only one test setup can be active per project. The selected setup's sensors, configurations, and protocols become available throughout the questionnaire.

If no test setups exist yet, create one first: see [Test Setups Guide](./GUIDE_TEST_SETUPS.md).

### 4. Dataset (optional)

Click **Dataset** on the project card.

[SCREENSHOT: Dataset configuration dialog]

The dataset is an optional indexed list of your data files. When configured, Slide 8 and Slides 9–10 offer a file picker that lets you browse and assign files instead of typing paths manually. This is especially useful for large datasets with many files.

---

## Selecting the Active Project

Click a project card (or a **Select** / **Open** button) to make it the active project. The questionnaire loads that project's data.

[SCREENSHOT: Project card selected/highlighted — "active" indicator visible]

---

## Importing a Project

Use **Import** in the Project Sessions modal to load a previously exported project JSON file. The file contains all project data and the test setup it used.

[SCREENSHOT: Import button in the modal]

> The two built-in example projects (`Single Run Sietze` and `Multi Run Milling`) are loaded this way — they ship as JSON files in `src/data/`.

---

## Exporting a Project

Use **Export** on a project card to download it as a JSON file. This file:
- Captures all questionnaire data for that project
- Includes the linked test setup snapshot
- Can be shared, backed up, or re-imported on another machine

[SCREENSHOT: Export button on a project card]

---

## Deleting a Project

Click the delete icon on a project card. A confirmation dialog appears.

[SCREENSHOT: Delete confirmation dialog]

> All data for that project is removed from localStorage. This cannot be undone.

---

## Data Persistence

All project data is stored in the browser's **localStorage** (no server-side save). This means:
- Data persists across page reloads within the same browser
- Data is **lost** if you clear browser storage
- Data does **not** sync between different browsers or devices

**Use Export regularly** to back up work in progress.

---

## Related guides

- [ISA-PHM Concepts](./GUIDE_CONCEPTS.md) — understanding Investigation/Study/Assay and why setup comes first
- [Test Setups](./GUIDE_TEST_SETUPS.md) — creating the test setup before linking it to a project
- [Export Guide](./GUIDE_EXPORT.md) — what happens after Convert to ISA-PHM
