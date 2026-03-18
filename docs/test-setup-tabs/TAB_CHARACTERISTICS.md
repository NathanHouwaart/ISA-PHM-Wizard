# Test Setup Tab — Characteristics

---

[SCREENSHOT: Characteristics tab — empty state]

[SCREENSHOT: Characteristics tab — simple view with several rows, one expanded showing comments]

[SCREENSHOT: Characteristics tab — grid view with multiple rows]

---

## Purpose

Documents fixed hardware properties of the test rig and its components. Characteristics are static context — they do not change per experiment. They appear in the ISA-PHM output as study design descriptor properties.

---

## Fields per characteristic

| Field | Description | Example |
|---|---|---|
| **Category** | The type or name of the property | `Motor`, `Motor Power`, `Pump Bearing` |
| **Value** | The value of the property | `WEG W21`, `2.2`, `6308.2Z.C3` |
| **Unit** | Physical unit, or blank | `kW`, `RPM`, `` |
| **Comments** | Explanatory notes (simple view only) | `Bearing replaced 2026-01-15` |

---

## Adding characteristics

**Simple view:**
1. Click **+ Add Characteristic** (or the empty-state button).
2. Fill category, value, and unit.
3. Optionally expand the card to add comments (free text, one comment per entry).

**Grid view:**
1. Click **+ Add Row** or use the grid's inline add feature.
2. Edit category, value, and unit directly in the table.
3. Comment count is shown as a badge; actual comment content is only editable in simple view.

[SCREENSHOT: Characteristics tab — simple view, one card expanded with comments field visible]

---

## What to document

Document anything that someone else would need to know to replicate or compare your results. Standard properties to include:

- **Main machine components** — motor model, pump model, gearbox type
- **Key specifications** — rated power, nominal speed, bearing dimensions
- **Sensor hardware** that doesn't fit as a "sensor" row (e.g. a tachometer or flow meter that provides metadata rather than a per-run data file)
- **Environmental constraints** — coolant type, lubricant, fluid properties

Examples from the Sietze / Techport project:

| Category | Value | Unit |
|---|---|---|
| Motor | MG160MA4042-H3 | |
| Motor Bearing | 6309.C4 | |
| Motor Speed Accuracy | 5 | RPM |
| Pump | NK80–250/270 A2F2AE | |
| Pump Bearing | 6308.2Z.C3.SYN | |
| Discharge Pressure Sensor | Generic Analogue Pressure Gauge | |

---

## Simple view vs. Grid view

| | Simple view | Grid view |
|---|---|---|
| Comments | Fully editable | Badge count only |
| Speed | Slower, one card at a time | Faster for bulk entry |
| Best for | Detailed documentation with notes | Initial bulk data entry |

---

## Consistent category naming

Use the same category names across multiple test setups if they represent the same property type. This makes setups easier to compare and query.

---

[← Basic Info](./TAB_BASIC_INFO.md) | [Next: Sensors →](./TAB_SENSORS.md)
