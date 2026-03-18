# Test Setup Tab — Configurations

---

[SCREENSHOT: Configurations tab — empty state]

[SCREENSHOT: Configurations tab — two configurations listed in simple view]

---

## Purpose

Defines named variants of the test setup — typically different physical states of the replaceable component (e.g. healthy vs. faulted bearing, different tool grades, different shaft assemblies). Each configuration can be linked to an experiment on Questionnaire Slide 5.

---

## Fields per configuration

| Field | Required | Description | Example |
|---|---|---|---|
| **Name** | Yes | Human-readable name for this variant | `Healthy Bearing`, `BPFO Fault Severity 1` |
| **Replaceable Component ID** | No | An identifier for the specific component instance | `RC-001`, `Bearing-SKF-6308-A` |
| **Details** | No | Key/value pairs for additional properties | `Fault size = 0.5 mm` |

---

## Adding configurations

1. Click **+ Add Configuration**.
2. Fill the Name and optionally the Replaceable Component ID.
3. Add one or more **Detail** entries (name/value pairs) for extra traceability.

[SCREENSHOT: Configurations tab — one configuration card open with name, component ID, and a detail entry]

---

## Details (name/value pairs)

Use Detail entries to record properties that are specific to this configuration but don't belong in Characteristics (which apply to all configurations). Examples:

| Detail Name | Detail Value |
|---|---|
| Fault type | BPFO |
| Fault size | 0.5 mm |
| Installation date | 2026-03-01 |
| Tool grade | P25 |
| Serial number | BRG-2026-003 |

---

## How configurations link to experiments

On Questionnaire Slide 5 (Experiment Descriptions), each experiment has a **Configuration** dropdown. The dropdown is populated from this list. Selecting a configuration links that experiment to the specific hardware state described here.

This is important for traceability: the ISA-PHM output includes the configuration name as a design descriptor for each study.

[SCREENSHOT: Slide 5 experiment card showing the configuration dropdown populated from test setup configurations]

---

## How many configurations?

One configuration per physical state you tested. For a typical seeded-fault diagnostic dataset:

- `Healthy`
- `BPFO Fault, Severity 1`
- `BPFO Fault, Severity 2`
- `Inner Race Fault, Small`
- etc.

For a prognostics dataset where wear evolves continuously, you might have one configuration per tool (or use operating conditions in the Test Matrix to describe the degradation state per run).

---

[← Sensors](./TAB_SENSORS.md) | [Next: Measurement Protocols →](./TAB_MEASUREMENT_PROTOCOLS.md)
