# Configurations Guide

This guide covers setup configurations as controlled variants of a test setup in the ISA-PHM model from *ISA-PHM - a Standardized Format for Storing and Utilizing Metadata of Diagnostic and Prognostic Tests* ([PDF](./references/ISA-PHM_paper_final.pdf)). Clear configuration metadata improves reproducibility and interpretation across studies and runs.


## What A Configuration Is

A configuration is a named variant of the same test setup, usually representing a specific replaceable component state or assembly state (for example `Healthy Bearing` vs `Faulted Bearing`).

## What You Use It For

- Link each experiment/study to the exact hardware state that was tested.
- Separate results by setup variant without creating a completely new setup definition.
- Keep replacement history and component identity traceable in ISA metadata.

## Where To Edit

- `Test Setups` -> open a setup -> `Configurations` tab.

![Configurations tab annotated](./images/annotated/test-setup-tab-configurations-annotated.png)

## Fields

- Configuration Name
- Replaceable Component ID
- Details (name/value pairs)

## How To Add A Configuration

1. Open `Configurations` tab.
2. Click `+` (Add Configuration).
3. Fill Name and Replaceable Component ID.
4. Add optional details.
5. Save test setup.

## How Configurations Are Used

On the ISA Questionnaire `Experiment descriptions` slide, each experiment can select a configuration from the selected test setup.

## Good Practice

- Use stable IDs for replaceable components.
- Keep details structured (`name` / `value`) for traceability.
- Align configuration naming with hardware change logs.

## Example

- Name: `Healthy Bearing`
- Replaceable Component ID: `RC-001`
- Detail: `Installation date = 2026-03-01`
