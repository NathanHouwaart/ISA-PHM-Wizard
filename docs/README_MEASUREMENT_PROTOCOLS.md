# Measurement Protocols Guide

This guide covers measurement protocol definitions used for raw signal acquisition in the ISA-PHM structure described in *ISA-PHM - a Standardized Format for Storing and Utilizing Metadata of Diagnostic and Prognostic Tests* ([PDF](./references/ISA-PHM_paper_final.pdf)). These entries document acquisition context required for reuse and comparability.


## What A Measurement Protocol Is

A measurement protocol describes how raw signals are acquired: method, settings, and per-sensor parameterization during data collection.

## What You Use It For

- Standardize how measurements are captured across runs and studies.
- Make acquisition settings explicit and reproducible.
- Select the correct protocol later in `Raw Measurement Output` mapping.

## Where To Edit

- `Test Setups` -> open a setup -> `Measurement` tab.

![Measurement protocols tab annotated](./images/annotated/test-setup-tab-measurement-annotated.png)

## Structure

Each protocol variant has:

- Name
- Description
- Parameter list
- Sensor-parameter mapping grid

## How To Create

1. Add at least one sensor first.
2. Open `Measurement` tab.
3. Click `+` to add a protocol variant.
4. Enter protocol name and description.
5. Add parameters in one of two ways:
   - `+ Add parameter` for custom rows
   - Click suggested parameter chips (one click adds one row)
6. Fill parameter `Name`, `Unit`, `Description`.
7. Fill mapping values per sensor column.
8. Save test setup.

## Suggestions Feature

Suggested parameters are static catalog items, prefilled with:

- Parameter name
- Unit
- Description

They are added as new rows and do not overwrite existing parameters.

## Downstream Use

In ISA Questionnaire `Raw Measurement Output`, you can assign a measurement protocol per study and map raw files per sensor/run.

## Common Issues

- No sensors in setup: grid cannot map parameters per sensor.
- No measurement protocols: protocol dropdown in output slide is empty.
