# Test Setups Guide

This guide describes how to build and maintain reusable test setups that act as the metadata backbone for ISA-PHM projects, consistent with *ISA-PHM - a Standardized Format for Storing and Utilizing Metadata of Diagnostic and Prognostic Tests* ([PDF](./references/ISA-PHM_paper_final.pdf)).

## What A Test Setup Is

A test setup is a reusable package of experiment context metadata: equipment details, sensors, configurations, and protocols used by one or more projects.

## What You Use It For

- Reuse one consistent setup definition across projects and studies.
- Avoid re-entering repeated hardware and protocol details.
- Provide required dependencies for questionnaire mappings and export.

## Overview

![Test setups overview annotated](./images/annotated/test-setups-overview-annotated.png)

## What A Test Setup Contains

- Basic information
- Characteristics
- Sensors
- Configurations
- Measurement protocols
- Processing protocols

Each project can select one test setup in Project Configuration.

## How To Create A Test Setup

1. Open `Test Setups`.
2. Click `Add Test Setup`.
3. Fill required fields in `Basic Info`:
   - Name
   - Location
   - Experiment Preparation Protocol Name
   - Set-up or test specimen-name
4. Add optional description.
5. Fill remaining tabs (recommended order):
   - Characteristics
   - Sensors
   - Configurations
   - Measurement Protocols
   - Processing Protocols
6. Click `Add Test Setup` or `Update Test Setup` to save.

## Edit Existing Test Setups

1. Open `Test Setups`.
2. Click pencil icon on a setup card.
3. Update tab content.
4. Save.

## Tab Snapshots

### Basic Info

![Basic info tab annotated](./images/annotated/test-setup-tab-basic-info-annotated.png)

### Characteristics

![Characteristics tab annotated](./images/annotated/test-setup-tab-characteristics-annotated.png)

### Sensors

![Sensors tab annotated](./images/annotated/test-setup-tab-sensors-annotated.png)

### Configurations

![Configurations tab annotated](./images/annotated/test-setup-tab-configurations-annotated.png)

### Measurement

![Measurement protocols tab annotated](./images/annotated/test-setup-tab-measurement-annotated.png)

### Processing

![Processing protocols tab annotated](./images/annotated/test-setup-tab-processing-annotated.png)

## Important Behavior

- Test setups are stored in a global catalog, then referenced by project.
- Updating a setup affects any project using that setup.
- The app tracks setup version metadata internally (`version`, `lastModified`).

## Tips

- Add sensors before protocol parameter mapping.
- Add configurations before linking configurations to experiments.
- Use grid views for bulk edits and simple views for structured card editing.

## Related Guides

- [Every Test Setup Tab Explained](./README_TEST_SETUP_TABS.md)
- [Characteristics Guide](./README_CHARACTERISTICS.md)
- [Sensors Guide](./README_SENSORS.md)
- [Configurations Guide](./README_CONFIGURATIONS.md)
- [Measurement Protocols Guide](./README_MEASUREMENT_PROTOCOLS.md)
- [Processing Protocols Guide](./README_PROCESSING_PROTOCOLS.md)
