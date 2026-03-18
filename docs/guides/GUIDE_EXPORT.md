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
4. The result is returned as a downloadable ZIP file.

[SCREENSHOT: "Uploading to conversion service..." loading state]

[SCREENSHOT: Success state — download prompt or success message]

---

## The output ZIP contents

The ZIP contains ISA-formatted tab-separated text files following the ISA-PHM spec:

```
i_investigation.txt          ← Top-level Investigation file
s_study_01.txt               ← Study file for experiment 1 (test matrix values)
s_study_02.txt               ← Study file for experiment 2
...
a_st01_st01.txt              ← Assay file: study 1, raw measurement output
a_st01_st02.txt              ← Assay file: study 1, processing output
a_st02_st01.txt              ← Assay file: study 2, raw measurement output
a_st02_st02.txt              ← Assay file: study 2, processing output
...
```

The naming convention for assay files is `a_st{study_index}_st{assay_index}.txt`.

---

## i_investigation.txt

Contains investigation-level metadata:

- INVESTIGATION TITLE
- INVESTIGATION DESCRIPTION
- INVESTIGATION SUBMISSION DATE
- INVESTIGATION PUBLIC RELEASE DATE
- INVESTIGATION PUBLICATIONS (DOI, status, author list)
- INVESTIGATION CONTACTS (names, roles, affiliations, ORCID)

[SCREENSHOT: i_investigation.txt opened in a text editor — first rows visible]

---

## s_study_XX.txt

Contains study-level metadata for one experiment. Each study file captures:
- Study name and description
- Study submission and publication dates
- Study design descriptors (template type)
- Study factors (fault specifications and operating conditions from Slides 6–7)
- Study assay columns (one assay per sensor)
- The factor values per sample row (what you typed in the Test Matrix, Slide 8)

[SCREENSHOT: s_study_01.txt opened — factor rows and sample values visible]

---

## a_stXX_stYY.txt

Contains assay-level metadata for one output type (raw or processed) of one study. Each assay file captures:
- The measurement or processing protocol used
- Per-sensor parameter values from the protocol grid
- The file name or value mapped to each sensor for that run

[SCREENSHOT: an assay file opened — protocol rows and sensor file names visible]

---

## Error states

| Error | Likely cause |
|---|---|
| Network error / timeout | Backend is unreachable; check internet connection |
| Conversion failed with 4xx | Malformed payload; usually missing a required investigation field |
| Empty assay files | No mappings in Slides 9–10 for that study |

[SCREENSHOT: Error state in the UI — error message visible]

If conversion fails, the error message is shown in the UI. No partial ZIP is produced. Fix the indicated issue and retry.

---

## Using the output files

Deposit the ZIP alongside your raw data files in a data repository (e.g. Zenodo, 4TU.ResearchData). The ISA-PHM files act as the metadata layer that makes the dataset FAIR-compliant.

> The file paths you entered in Slides 9–10 should match the relative paths of your actual data files within the deposit, so the assay files link correctly.

---

## Related guides

- [Quick Start](./GUIDE_QUICKSTART.md) — full walkthrough from blank to export
- [Slide 9 — Raw Measurement Output](../slides/SLIDE_09_MEASUREMENT_OUTPUT.md)
- [Slide 10 — Processing Protocol Output](../slides/SLIDE_10_PROCESSING_OUTPUT.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
