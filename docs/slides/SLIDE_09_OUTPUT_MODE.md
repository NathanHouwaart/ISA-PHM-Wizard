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

## Layout and flow

The slide uses a **two-pane guided layout**:
- Left pane: study navigator with current mode badges and run count.
- Right pane: focused editor for the selected study.

In the focused editor:
- Select mode using large choice cards.
- See immediate requirement preview for:
  - Slide 10 raw mappings
  - Slide 11 processed mappings
- Read the fixed mandatory rule strip.

On mobile, the left pane is replaced by a compact study selector above the editor.

---

## Bulk actions

A top action bar provides:
- Global mode selector
- **Apply to all studies** button

Use this to quickly set one mode across the project.

---

## Mandatory rule

**Measurement protocol is always mandatory**, regardless of output mode.

---

## Mode behavior

| Output mode | Slide 10 raw files | Slide 11 processing protocol | Slide 11 processed files |
|---|---|---|---|
| `Raw only` | Required | Disabled | Disabled |
| `Processed only` | Disabled | Required | Required |
| `Raw + processed` | Required | Required | Required |

---

## Notes

- On the raw output slide, rows in `Processed only` mode are grayed out for raw file cells.
- On the processed output slide, rows in `Raw only` mode are grayed out for processing protocol and processed file cells.
- Protocol selection is study-level; changing it on any run row updates the study selection.

---

[<- Slide 8](./SLIDE_08_TEST_MATRIX.md) | [Next: Raw Measurement Output ->](./SLIDE_09_MEASUREMENT_OUTPUT.md)
