# Sensor workflow redesign: agreed direction

This documents the current direction and remaining integration work.

## Researcher workflow

The sensor tree represents the equipment actually used in the test setup. A
standalone sensor is a single tree item combining its physical and output
details. A multi-output device is a parent with the used outputs underneath;
each output remains a separate ISA-PHM sensor. Selecting an item opens its
details alongside the tree. Use existing form, button, tooltip and dialog
components wherever practical. Leave the existing sensor-role choices unchanged.

The primary actions are **Add standalone sensor** and **Add device**. New
instances use a sensor or device definition created under **Manage definitions**.
Definitions are stored with the test setup. **Use catalogue** offers bundled
starting points for the enDAQ S3-E100D40 and an example custom eight-sensor FBG
sleeve. Choosing one copies its fields, outputs and datasheet into the current
test setup. Review and adapt the copy for the actual hardware; the custom sleeve
is an example rather than a universal manufacturer specification. Catalogue
updates do not change existing setups. Existing unlinked sensors remain editable
and can be saved as definitions.

A device definition may list known outputs; the list does not assert that it
describes every output the hardware supports. When adding a device from a saved
definition, show the available outputs unchecked and let the researcher select
which ones are used. Allow adding outputs later. Device model and datasheet are
shared; device name and serial number describe the individual device. Output
technology and measured quantity describe each output. Each output has its own sensor model; it is not inferred from the device model. Measured unit and sampling rate remain in
the measurement protocol, not in device definitions.

Definitions are linked, so correcting shared model details updates the
corresponding equipment unless an individual value has been overridden. A sensor
instance has an explicit **Override definition for this sensor** checkbox;
returning to the definition replaces its overrides after confirmation. Names, locations and roles remain individual. Before
applying a change of measured quantity to outputs already in use, show affected
sensors and request confirmation; preserve existing file mappings for review.
Removing an output from a definition must not remove existing sensors or their
mappings: warn and retain those sensors independently. Apply the same principle
when deleting a definition.

## Drafts, readiness and existing projects

An incomplete test setup can be saved as a draft. A device with no used outputs
is allowed in a draft but needs at least one before the test setup is ready.
A standalone sensor needs its own datasheet answer or one from its sensor
definition: a PDF or an explicit **Unavailable** choice. A device output can use
its device datasheet. Sensor model may explicitly be **N/A**. These readiness
checks do not prevent saving a draft.

Existing sensors, types, devices, mappings and attachments must survive import
and migration. Preserve explicit device-to-output relationships. Similar names,
models or datasheets alone do not prove which physical device an output belongs
to; offer a researcher-reviewed suggestion instead of silently grouping them.

## Export and current limits

Device and sensor definition IDs are Wizard-side editing details; the export
contains the sensor metadata and optional physical-device comments. Sensor
models are never inferred from the device model. Measurement and processing
mappings stay associated with sensor IDs; changing a quantity can require a
mapping review. Definition attachments travel with test-setup and project archives.

A sensor's device is chosen when it is added. There is currently no dedicated
move action for an existing output. Removing an output can remove its protocol
mappings, so don't remove and recreate an output just to move it without first
reviewing the impact.

The draft Specification validator performs selected checks only. A passing
report is not a full ISA-PHM conformance assessment. See the repository README
for the scope of conversion-time validation.
