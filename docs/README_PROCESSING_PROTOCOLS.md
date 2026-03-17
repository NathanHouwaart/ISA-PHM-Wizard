# Processing Protocols Guide

This guide covers processing protocol definitions that describe transformations from raw measurements to derived outputs, following ISA-PHM principles in *ISA-PHM - a Standardized Format for Storing and Utilizing Metadata of Diagnostic and Prognostic Tests* ([PDF](./references/ISA-PHM_paper_final.pdf)). It captures processing lineage for reproducible analysis.


## What A Processing Protocol Is

A processing protocol describes how raw sensor data is transformed into processed outputs (for example filtering, windowing, FFT, feature extraction).

## What You Use It For

- Document transformation lineage from raw to derived data.
- Keep feature-generation settings reproducible across datasets.
- Select the correct protocol later in `Processing Protocol Output` mapping.

## Where To Edit

- `Test Setups` -> open a setup -> `Processing` tab.

![Processing protocols tab annotated](./images/annotated/test-setup-tab-processing-annotated.png)

## Structure

Each processing protocol variant has:

- Name
- Description
- Parameter list
- Sensor-parameter mapping grid

## How To Create

1. Add sensors first.
2. Open `Processing` tab.
3. Click `+` to add protocol variant.
4. Fill protocol name and description.
5. Add parameters using:
   - Custom parameter button
   - Suggested parameter chips
6. Fill parameter `Name`, `Unit`, `Description`.
7. Fill per-sensor mapping values.
8. Save test setup.

## Suggestions Feature

Suggested processing parameters include common items such as filter settings, windowing, FFT settings, overlap, and normalization options.

Each suggestion adds one new row.

## Downstream Use

In ISA Questionnaire `Processing Protocol Output`, users select processing protocol per study and map processed file/value per sensor and run.

## Common Issues

- Missing protocol variants: no selectable processing protocol in output slide.
- Missing sensors: mapping grid has no sensor columns.
