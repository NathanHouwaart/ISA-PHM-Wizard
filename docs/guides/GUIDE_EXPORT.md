# Export — Convert to ISA-PHM

This guide explains what happens when you click **Convert to ISA-PHM**, what files the conversion produces, and how to use or interpret them.

---

## Triggering the conversion

Click **Convert to ISA-PHM** from the questionnaire page.

[SCREENSHOT: "Convert to ISA-PHM" button visible in the questionnaire — location highlighted]

Before converting, confirm:
- [ ] All 10 slides have been reviewed
- [ ] Every experiment + run has a measurement protocol selected (Slide 9)
- [ ] Every experiment + run has a processing protocol selected (Slide 10)
- [ ] All experiment–variable cells in the Test Matrix (Slide 8) are filled
- [ ] File/value mappings in Slides 9–10 are filled for all experiment–sensor pairs you want to capture

Incomplete data is allowed — the conversion will still produce files, but cells without values will be blank in the output.

---

## What happens during conversion

1. The wizard bundles your entire project metadata into a structured JSON payload.
2. It sends the payload to the backend conversion service.
3. The backend validates and normalizes the data, then generates ISA-structured JSON output.
4. The result is returned as a downloadable `.json` file containing the full ISA-PHM structured metadata.

[SCREENSHOT: "Uploading to conversion service..." loading state]

[SCREENSHOT: Success state — download prompt or success message]

---

## The output JSON

The returned `.json` file is an **ISA-JSON** file — it follows the ISA (Investigation–Study–Assay) schema as defined by the ISA-PHM specification. The wizard translates the PHM concepts you filled in into this standardized ISA structure internally.

The three top-level ISA entities in the file are:

| ISA entity | What it contains | Maps from (wizard) |
|---|---|---|
| **Investigation** | Project-level metadata (title, contacts, publications, dates, license) | Slides 2–4 |
| **Study** | One entry per experiment — design descriptors, factors, samples (test matrix) | Slides 5–8 |
| **Assay** | One entry per sensor channel per experiment/run — protocols and output file links | Slides 9–10 |

Assay filenames follow the pattern `a_st{study_index}_se{sensor_index}` — e.g. experiment 1 / sensor 3 → `a_st01_se03`.

---

<a id="investigation"></a>

## Project *(ISA: Investigation)*

The `INVESTIGATION` block contains project-level metadata. In PHM terms this is everything that describes the dataset as a whole, not any individual experiment.

```json
{
  "title":                      "...",  // project title (Slide 2)
  "description":                "...",  // project description (Slide 2)
  "identifier":                 "...",  // auto-generated UUID
  "submissionDate":             "...",  // Slide 2
  "publicReleaseDate":          "...",  // Slide 2
  "publications":               [...],  // Slide 4 (DOI, status, author list)
  "people":                     [...],  // Slide 3 (names, roles, affiliations, ORCID)
  "studies":                    [...],  // one entry per experiment → see Studies section
  "comments": [                         // wizard metadata (experiment type, license)
    { "name": "experiment_type", "value": "diagnostic-experiment | prognostic-experiment" },
    { "name": "license",         "value": "..." }
  ]
}
```

---

<a id="studies"></a>

## Experiments *(ISA: Studies)*

The `studies[]` array contains one entry per experiment you created on Slide 5. Each Study entry maps the PHM experiment description to ISA-structured metadata:

| ISA Study field | PHM equivalent | Source |
|---|---|---|
| `study.title` | Experiment name | Slide 5 |
| `study.description` | Experiment description | Slide 5 |
| `study.studyDesignDescriptors` | Diagnostic / Prognostic template | Project template setting |
| `study.factors[]` | Fault specifications + operating conditions | Slides 6–7 |
| `study.materials.samples[].factorValues[]` | Test matrix cell values (fault type, severity, speed, etc.) | Slide 8 |
| `study.materials.samples[].characteristics[]` | Configuration name + replaceable component ID | Slide 5 (configuration) |

For **prognostic experiments**, each run appears as a separate `samples[]` entry within the same Study — runs are not separate Studies.


---

<a id="assays"></a>

## Measurement Outputs *(ISA: Assays)*

The `study.assays[]` array contains one entry per sensor channel per experiment (per run for prognostics). Each Assay bundles the measurement and processing metadata for a single sensor output:

| ISA Assay field | PHM equivalent | Source |
|---|---|---|
| `assay.filename` | Auto-generated identifier | Pattern: `a_st{n}_se{n}` |
| `assay.measurementType` | Sensor measurement type | Test setup → Sensors |
| `assay.technologyPlatform` | Sensor model | Test setup → Sensors |
| `assay.processSequence[0]` | Measurement process | Slide 9 (measurement protocol + raw file) |
| `assay.processSequence[1]` | Processing process | Slide 10 (processing protocol + processed file) |
| `assay.dataFiles[]` | Raw and processed output file paths | Slides 9–10 |

> **Key ISA-PHM rule:** Each assay data file must have exactly two columns — a timestamp and a single measurement value. A tri-axis accelerometer produces three assay entries (one per axis), not one.


---

## Error states

| Error | Likely cause |
|---|---|
| Network error / timeout | Backend is unreachable; check internet connection |
| Conversion failed with 4xx | Malformed payload; usually missing a required project field |
| Empty output files | No mappings in Slides 9–10 for that experiment |


If conversion fails, the error message is shown in the UI. No partial output is produced. Fix the indicated issue and retry.

---

## Using the output files

Deposit the `.json` file alongside your raw data files in a data repository (e.g. Zenodo, 4TU.ResearchData). The ISA-PHM metadata acts as the structured description layer that makes the dataset FAIR-compliant.

> The file paths you entered in Slides 9–10 should match the relative paths of your actual data files within the deposit, so the measurement output entries in the JSON link correctly.

---

## Related guides

- [Quick Start](./GUIDE_QUICKSTART.md) — full walkthrough from blank to export
- [Slide 9 — Raw Measurement Output](../slides/SLIDE_09_MEASUREMENT_OUTPUT.md)
- [Slide 10 — Processing Protocol Output](../slides/SLIDE_10_PROCESSING_OUTPUT.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
