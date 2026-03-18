# Slide 2 — Project Information

**ISA-PHM hierarchy level:** Investigation  
**Dependencies:** None

---

[SCREENSHOT: Slide 2 — Project Information, blank/empty state]

[SCREENSHOT: Slide 2 — Project Information, filled example (e.g. Sietze project)]

---

## Purpose

Captures the top-level ISA Investigation metadata: what the project is, who it's for, when it happened, and under what license it can be used.

---

## Fields

| Field | Required | Description | Example |
|---|---|---|---|
| **Project Title** | Yes | A clear, searchable title for the project | `Diagnostics on an E-motor-driven centrifugal pump set-up` |
| **Project Description** | No | Free-text summary of the experimental scope | `Four centrifugal pumps driven by induction motors, 11 fault types at various severity levels.` |
| **License** | No | Data license; type to search a catalog of options | `MIT License` |
| **Project execution / data collection date** | No | When the experiments were conducted | `2023-10-26` |
| **Public Release Date** | No | When the dataset may be made public | `2023-12-17` |

---

## Tips

- **Title:** Make it specific enough to be searchable in a data repository. Include the test rig type and measurement method.
- **Description:** Describe the scope (what was varied, what was measured, how many conditions). A few sentences is enough.
- **License:** If depositing to a public repository, choose an open license (e.g. `CC BY 4.0`, `MIT`). Required by most repositories.
- **Dates:** Use ISO 8601 format (`YYYY-MM-DD`). The submission date is typically the date data collection ended; release date is when it becomes public.

---

## Downstream use

These fields map directly to the `INVESTIGATION` block at the top level of the exported ISA-PHM JSON.

---

[← Slide 1](./SLIDE_01_INTRODUCTION.md) | [Next: Slide 3 →](./SLIDE_03_CONTACTS.md)
