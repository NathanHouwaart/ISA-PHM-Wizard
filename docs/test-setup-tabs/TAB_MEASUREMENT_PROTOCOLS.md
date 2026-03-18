# Test Setup Tab — Measurement Protocols

> **Add sensors first.** The parameter grid creates one column per sensor — with no sensors, the grid has no sensor columns.

---

[SCREENSHOT: Measurement Protocols tab — empty state (no protocols yet)]

[SCREENSHOT: Measurement Protocols tab — one protocol variant expanded, showing parameters and sensor columns]

[SCREENSHOT: Measurement Protocols tab — sensor-parameter grid with values filled]

---

## Purpose

Documents how raw signals are acquired. You can define multiple protocol **variants** within one test setup (e.g. different sample rates for different measurement campaigns). On Questionnaire Slide 9, each study is linked to one protocol variant.

In ISA-PHM terms, the measurement protocol becomes the Assay measurement type and its parameters become the Protocol Parameters in the assay file.

---

## Structure

Each protocol variant contains:
- **Name** — identifier for this variant
- **Description** — optional free text
- **Parameter list** — rows of acquisition settings
- **Sensor-parameter mapping grid** — values per sensor for each parameter

---

## Creating a protocol variant

1. Click **+ Add Protocol** (or **+**) on the Measurement Protocols tab.
2. Enter a **Name** (e.g. `Standard Acquisition 25.6 kHz`).
3. Optionally add a **Description**.

[SCREENSHOT: Measurement Protocols tab — new protocol created, name field filled]

---

## Adding parameters

Each parameter is a row in the protocol's table. Add parameters two ways:

**Suggestion chips (recommended):** Click a chip to add a pre-filled row:

| Suggestion | Typical unit |
|---|---|
| Sampling Rate | kHz |
| Record Length | s |
| Filter Type | — |
| Filter Cutoff Frequency | Hz |
| ADC Resolution | bit |
| Amplifier Gain | dB |
| Trigger Type | — |

**Manual:** Click **+ Add parameter**. Fill Name, Unit, and Description yourself.

[SCREENSHOT: Measurement Protocols tab — suggestion chip strip visible above parameter list]

---

## Sensor-parameter mapping grid

After adding parameters and sensors (sensors must exist on the Sensors tab), a grid appears with:
- **Rows:** each parameter
- **Columns:** each sensor

Fill in the value of each parameter for each sensor. Many parameters are the same across all sensors (e.g. sampling rate); others may differ (e.g. amplifier gain per channel).

[SCREENSHOT: Measurement Protocols tab — grid with parameter rows and sensor columns, several cells filled]

---

## Multiple protocol variants

Add a second or third variant if different experiments used different acquisition settings:

- Variant A: `High-Speed Acquisition` — 51.2 kHz sample rate
- Variant B: `Low-Speed Acquisition` — 12.8 kHz sample rate

On Slide 9, each study independently selects which variant was used.

[SCREENSHOT: Measurement Protocols tab — two protocol variants collapsed in list, both named]

---

## Downstream use

The selected protocol on Slide 9 appears in `a_stXX_stYY.txt` as the Assay Measurement Type. Its parameters and per-sensor values are serialized as Protocol Parameter Name/Value rows.

---

[← Configurations](./TAB_CONFIGURATIONS.md) | [Next: Processing Protocols →](./TAB_PROCESSING_PROTOCOLS.md)
