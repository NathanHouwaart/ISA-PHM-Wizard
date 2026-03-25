# Export - Convert to ISA-PHM

This guide explains what happens when you click **Convert to ISA-PHM**, what file is generated, and what must be filled before export.

---

## Pre-export checklist

Before converting, confirm:
- [ ] All 11 slides have been reviewed
- [ ] Every study has an output mode selected on Slide 9 (`Raw only`, `Processed only`, or `Raw + processed`)
- [ ] Every study has a measurement protocol selected (always required)
- [ ] Every study with processed output has a processing protocol selected
- [ ] All test matrix cells (Slide 8) are filled
- [ ] Scalar test matrix rows contain literal values (not file paths)
- [ ] Timeseries test matrix rows contain relative `.csv` paths (no absolute paths)
- [ ] Raw file mappings are filled for studies where raw output is enabled
- [ ] Processed file mappings are filled for studies where processed output is enabled

The pre-export validation panel shows blocking errors and warnings.

---

## What conversion does

1. Bundles project metadata into a conversion payload.
2. Sends it to the backend conversion service.
3. Receives ISA-structured JSON output.
4. Downloads a JSON file named:

`<Project Name> ISA-PHM.json`

---

## ISA mapping summary

| ISA entity | Wizard source |
|---|---|
| Investigation | Slides 2-4 |
| Study | Slides 5-8 |
| Assay | Slides 10-11 (gated by Slide 9 output mode) |

Assay filenames are generated per study as `se01`, `se02`, and so on.

---

## Related docs

- [Slide 9 - Study Output Mode](../slides/SLIDE_09_OUTPUT_MODE.md)
- [Slide 10 - Raw Measurement Output](../slides/SLIDE_09_MEASUREMENT_OUTPUT.md)
- [Slide 11 - Processing Output](../slides/SLIDE_10_PROCESSING_OUTPUT.md)
