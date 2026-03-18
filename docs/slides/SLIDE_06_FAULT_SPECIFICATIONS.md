# Slide 6 — Fault Specifications

**ISA-PHM hierarchy level:** Study (factor variables)  
**Dependencies:** None

---

[SCREENSHOT: Slide 6 — Fault Specifications, empty state]

[SCREENSHOT: Slide 6 — Fault Specifications, simple view with several fault spec rows]

[SCREENSHOT: Slide 6 — Fault Specifications, grid view]

---

## Purpose

Defines the fault-related variables that characterize your experiments. These become the factor columns in the Study files and the rows in the Test Matrix grid (Slide 8, left section).

---

## Variable type options

| Type | Use when |
|---|---|
| **Qualitative fault specification** | Non-numeric fault description — fault type, fault location, fault component |
| **Quantitative fault specification** | Numeric fault amount — fault severity level, fault size in mm |
| **Damage** | Wear or damage quantity, e.g. VB (wear land width) |
| **RUL** | Remaining Useful Life value |
| **Time** | A time-domain variable associated with the fault state |
| **Other** | Anything that doesn't fit the above |

---

## Fields per variable

| Field | Description | Example |
|---|---|---|
| **Variable Name** | Short identifier used throughout the wizard | `Fault Type` |
| **Type** | See table above | `Qualitative fault specification` |
| **Unit** | Physical unit or blank for dimensionless | `mm` / `` |
| **Description** | Longer description for documentation | `Type of fault introduced onto the bearing` |

---

## Adding variables

**Via suggestions (recommended):** Click one of the suggestion chips at the top of the slide. One click adds one row, pre-filled with sensible defaults. Available suggestions include:

- Fault Type
- Fault Location
- Fault Severity
- Fault Size
- Fault Depth
- Fault Diameter
- Fault Position
- Fault Component
- VB (milling tool wear)

[SCREENSHOT: Slide 6 — suggestion chips visible at top of slide]

**Manually:** Click **+ Add** to create a blank row and fill all fields yourself.

**Grid view:** Edit all variables in a spreadsheet layout. Type dropdown supports all type options.

---

## Tips

- Only define variables that actually differ between experiments. If fault type is the same for every study, it can be noted in the description instead.
- Keep names short — they appear as column headers in the Test Matrix.
- You can add, edit, or delete variables at any time before exporting. Deleting a variable also removes its values from the Test Matrix.

---

## Downstream use

Each fault specification becomes a **Study Factor** in the ISA Study files (`s_study_XX.txt`). The values you assign on Slide 8 become the factor values per sample row.

---

[← Slide 5](./SLIDE_05_EXPERIMENTS.md) | [Next: Slide 7 →](./SLIDE_07_OPERATING_CONDITIONS.md)
