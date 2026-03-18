# Slide 2 — Project Information

**ISA-PHM hierarchy level:** Investigation  
**Dependencies:** None

---

![Slide 2 — Project Information](../images/annotated/isa-questionnaire-slide-2.png)

---

## Purpose

Captures the top-level ISA Investigation metadata: what the project is, who it is for, when it happened, and under what license it can be used.

---

## Fields

| Field | Required | Description | Example |
|---|---|---|---|
| **Project Title** | Yes | A clear, searchable title for the project | `Pump Bearing Diagnostics 2026` |
| **Project Description** | No | Free-text summary of the experimental scope | `Vibration diagnostics under fault and healthy conditions on pump bench v1.` |
| **License** | No | Data license; type to search a catalog of options | `MIT License`, `CC BY 4.0` |
| **Project execution / data collection date** | No | When the experiments were conducted | `2026-03-01` |
| **Public Release Date** | No | When the dataset may be made public | `2026-06-01` |

---

## Tips

- **Title:** Make it specific enough to be searchable in a data repository. Include the test rig type and measurement method.
- **Description:** Describe the scope — what was varied, what was measured, how many conditions. A few sentences is enough.
- **License:** If depositing to a public repository, choose an open license (e.g. `CC BY 4.0`, `MIT`). Most repositories require one.
- **Dates:** Use ISO 8601 format (`YYYY-MM-DD`). The collection date is typically when data acquisition ended; the release date is when the dataset becomes public.

---

## Downstream use

These fields map directly to the top-level object of the exported `isa-phm.json` (the Investigation).

| Slide 2 field | JSON key | Example |
|---|---|---|
| Project Title | `title` | `"Diagnostics on an E-motor-driven centrifugal pump set-up"` |
| Project Description | `description` | `"The complete set-up contains four centrifugal pumps..."` |
| Data collection date | `submissionDate` | `"2023-10-26"` |
| Public Release Date | `publicReleaseDate` | `"2023-12-17"` |
| License | `comments[name="license"].value` | `"MIT License"` |

The experiment type set during project creation (Diagnostic / Prognostic) is stored as `comments[name="experiment_type"].value` — either `"diagnostic-experiment"` or `"prognostic-experiment"`.

---

[← Slide 1](./SLIDE_01_INTRODUCTION.md) | [Next: Slide 3 →](./SLIDE_03_CONTACTS.md)
