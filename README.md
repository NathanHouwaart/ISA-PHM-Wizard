# ISA-PHM Wizard

This README gives a high-level view of how the wizard implements ISA-PHM from the paper *ISA-PHM - a Standardized Format for Storing and Utilizing Metadata of Diagnostic and Prognostic Tests* ([PDF](docs/references/ISA-PHM_paper_final.pdf)). It focuses on project/session management, test setup authoring, questionnaire capture, and export-ready metadata structure.

## What This Wizard Can Do

- Manage multiple projects in one workspace.
- Configure each project with:
  - Dataset index
  - Experiment template (single-run or multi-run)
  - Selected test setup
- Build and maintain reusable test setups:
  - Basic setup metadata
  - Characteristics
  - Sensors
  - Configurations
  - Measurement protocols
  - Processing protocols
- Fill an ISA-style questionnaire flow with 10 slides:
  - Project information, contacts, publications
  - Experiments/studies
  - Fault specs and operating conditions
  - Test matrix mappings
  - Raw and processed output mappings
- Use both simple card views and grid views for fast editing where available.
- Export project data for backend conversion.

## Typical Workflow

1. Open project sessions and select or create a project.
2. Configure project name, experiment template, dataset, and test setup.
3. Build or update test setup content.
4. Open ISA Questionnaire and complete all slides.
5. Click `Convert to ISA-PHM`.

## Documentation

All user guidance lives in [`docs/README.md`](docs/README.md).

Quick links:

- [`docs/README_GENERAL_USAGE.md`](docs/README_GENERAL_USAGE.md)
- [`docs/README_TEST_SETUPS.md`](docs/README_TEST_SETUPS.md)
- [`docs/README_QUESTIONNAIRES.md`](docs/README_QUESTIONNAIRES.md)
- [`docs/README_EXAMPLE_PROJECTS.md`](docs/README_EXAMPLE_PROJECTS.md)
- [`docs/README_MULTIPLE_RUNS.md`](docs/README_MULTIPLE_RUNS.md)
- [`docs/README_ISA_QUESTIONNAIRE_SLIDES.md`](docs/README_ISA_QUESTIONNAIRE_SLIDES.md)
- [`docs/README_TEST_SETUP_TABS.md`](docs/README_TEST_SETUP_TABS.md)

## Run Locally

```powershell
npm install
npm run dev
```

Open the Vite URL (usually `http://localhost:5173/ISA-PHM-Wizard/#/`).

## Build

```powershell
npm run build
npm run preview
```

## Backend

Backend repository:

- https://github.com/NathanHouwaart/ISA-PHM-Backend

## Notes

- Data is stored locally in browser storage (project-scoped keys).
- Global test setup catalog is shared across projects.
- The app uses hash routing (`#/...`).
