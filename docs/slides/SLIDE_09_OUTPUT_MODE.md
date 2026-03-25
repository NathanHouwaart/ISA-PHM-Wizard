# Slide 9 - Study Output Mode

**ISA-PHM hierarchy level:** Study scope rule (applies to Assay requirements)  
**Dependencies:** Experiments (Slide 5)

---

## Purpose

Defines, per study, whether the dataset contains:
- `Raw only`
- `Processed only`
- `Raw + processed`

This selection controls which fields are required and editable on the raw and processed output slides.

---

## Mandatory rule

**Measurement protocol is always mandatory**, regardless of output mode.

---

## Mode behavior

| Output mode | Slide 9 raw files | Slide 10 processing protocol | Slide 10 processed files |
|---|---|---|---|
| `Raw only` | Required | Disabled | Disabled |
| `Processed only` | Disabled | Required | Required |
| `Raw + processed` | Required | Required | Required |

---

## Notes

- On the raw output slide, rows in `Processed only` mode are grayed out for raw file cells.
- On the processed output slide, rows in `Raw only` mode are grayed out for processing protocol and processed file cells.
- Duplicate study-level protocol cells for additional runs are shown as read-only duplicates.

---

[<- Slide 8](./SLIDE_08_TEST_MATRIX.md) | [Next: Raw Measurement Output ->](./SLIDE_09_MEASUREMENT_OUTPUT.md)
