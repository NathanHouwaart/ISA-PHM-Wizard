# Export — Convert to ISA-PHM

This guide explains what happens when you click **Convert to ISA-PHM**, what files the conversion produces, and how to use or interpret them.

---

## Triggering the conversion

Click **Convert to ISA-PHM** from the questionnaire page. The button is visible on the last slide and may also be accessible from the header area.

[SCREENSHOT: "Convert to ISA-PHM" button visible in the questionnaire — location highlighted]

Before converting, confirm:
- [ ] All 10 slides have been reviewed
- [ ] Every study has a measurement protocol selected (Slide 9)
- [ ] Every study has a processing protocol selected (Slide 10)
- [ ] All study–variable cells in the Test Matrix (Slide 8) are filled
- [ ] File/value mappings in Slides 9–10 are filled for all study–sensor pairs you want to capture

Incomplete data is allowed — the conversion will still produce files, but cells without values will be blank in the output.

---

## What happens during conversion

1. The wizard bundles your entire project metadata into a structured JSON payload.
2. It sends the payload to the backend conversion service (AWS App Runner endpoint).
3. The backend validates and normalizes the data, then generates ISA-formatted text files.
4. The result is returned as a downloadable `.json` file containing the full ISA-PHM structured metadata.

[SCREENSHOT: "Uploading to conversion service..." loading state]

[SCREENSHOT: Success state — download prompt or success message]

---

## The output JSON contents

The returned `.json` file follows the ISA-JSON format and contains the full ISA-PHM structured metadata for your project:

- **Investigation** — top-level metadata (title, description, contacts, publications, dates, license)
- **Studies** — one entry per experiment, with study factors (fault specifications, operating conditions) and the test matrix
- **Assays** — one entry per sensor per study, linking measurement and processing protocols to output files

The naming conventions inside the JSON follow the ISA-PHM spec (e.g. assay identifiers use the pattern `a_st{study_index}_st{assay_index}`).

---

## Investigation section

Contains investigation-level metadata:

- INVESTIGATION TITLE
- INVESTIGATION DESCRIPTION
- INVESTIGATION SUBMISSION DATE
- INVESTIGATION PUBLIC RELEASE DATE
- INVESTIGATION PUBLICATIONS (DOI, status, author list)
- INVESTIGATION CONTACTS (names, roles, affiliations, ORCID)

[SCREENSHOT: output JSON opened — investigation section visible]

---

## Studies section

Contains study-level metadata for each experiment. Each study entry captures:
- Study name and description
- Study submission and publication dates
- Study design descriptors (template type)
- Study factors (fault specifications and operating conditions from Slides 6–7)
- Study assay columns (one assay per sensor)
- The factor values per sample row (what you typed in the Test Matrix, Slide 8)

[SCREENSHOT: output JSON opened — studies section with factor rows visible]

---

## Assays section

Contains assay-level metadata for each output type (raw or processed) per study. One assay entry is generated per sensor channel per study (per run for prognostics). Each assay entry captures:
- The sensor channel it belongs to
- The measurement or processing protocol used
- Per-sensor parameter values from the protocol grid
- The file name mapped to that sensor for that run

In ISA-PHM, the referenced data file per assay is expected to contain exactly two columns: a timestamp and a single measurement value. Multi-axis sensors (e.g., accelerometer X/Y/Z) are therefore represented as separate sensors in the test setup, each generating its own assay.

[SCREENSHOT: output JSON opened — assays section with protocol and sensor data visible]

---

## Error states

| Error | Likely cause |
|---|---|
| Network error / timeout | Backend is unreachable; check internet connection |
| Conversion failed with 4xx | Malformed payload; usually missing a required investigation field |
| Empty assay files | No mappings in Slides 9–10 for that study |

[SCREENSHOT: Error state in the UI — error message visible]

If conversion fails, the error message is shown in the UI. No partial output is produced. Fix the indicated issue and retry.

---

## Using the output files

Deposit the `.json` file alongside your raw data files in a data repository (e.g. Zenodo, 4TU.ResearchData). The ISA-PHM metadata acts as the structured description layer that makes the dataset FAIR-compliant.

> The file paths you entered in Slides 9–10 should match the relative paths of your actual data files within the deposit, so the assay entries in the JSON link correctly.

---

## Related guides

- [Quick Start](./GUIDE_QUICKSTART.md) — full walkthrough from blank to export
- [Slide 9 — Raw Measurement Output](../slides/SLIDE_09_MEASUREMENT_OUTPUT.md)
- [Slide 10 — Processing Protocol Output](../slides/SLIDE_10_PROCESSING_OUTPUT.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
