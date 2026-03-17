# Sensors Guide

This guide covers sensor metadata in test setups, aligned with the ISA-PHM structure in *ISA-PHM - a Standardized Format for Storing and Utilizing Metadata of Diagnostic and Prognostic Tests* ([PDF](./references/ISA-PHM_paper_final.pdf)). Sensor definitions anchor measurement and processing mappings at Assay level.


## What A Sensor Entry Is

A sensor entry is the canonical definition of one measurement channel/device in the test setup, including identity, type, and measurement role.

## What You Use It For

- Create sensor columns in measurement and processing protocol grids.
- Map raw and processed outputs to the correct channel per run.
- Preserve instrumentation context for reproducibility and reuse.

## Where To Edit

- `Test Setups` -> open a setup -> `Sensors` tab.

![Sensors tab annotated](./images/annotated/test-setup-tab-sensors-annotated.png)

## Key Fields

- Sensor alias
- Sensor model (`technologyPlatform`)
- Sensor type (`technologyType`)
- Measurement type
- Description

## How To Add A Sensor

1. Open `Sensors` tab.
2. Click `+` (Add Sensor).
3. Fill sensor fields.
4. Save test setup.

The app auto-generates alias defaults like `Sensor SE01`, `Sensor SE02`.

## Why Sensors Matter

- Measurement protocol and processing protocol parameter grids create columns from sensors.
- Raw/processed output mapping slides map run-level files/values to each sensor.

## Good Practice

- Keep alias short and unique.
- Use stable sensor naming across projects.
- Include model/type for reproducibility.

## Example

- Alias: `vib_ch_1`
- Sensor Model: `Wilcoxon 786B-10`
- Sensor Type: `Accelerometer`
- Measurement Type: `Vibration`
