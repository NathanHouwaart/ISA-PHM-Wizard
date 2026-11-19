import { isReplaceableCharacteristic } from './testSetupCharacteristics';
import { isKnownSensorQuantity } from './quantityCatalogue';

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

export function getTestSetupReadiness(setup) {
  const issues = [];
  if (!setup) return [{ section: 'basic-info', message: 'Select a test setup.' }];
  for (const [field, label] of [['name', 'Test setup name'], ['location', 'Location'], ['experimentPreparationProtocolName', 'Experiment preparation protocol name'], ['testSpecimenName', 'Set-up or test specimen name']]) {
    if (!hasText(setup[field])) issues.push({ section: 'basic-info', message: `${label} is required.` });
  }
  const replaceable = (Array.isArray(setup.characteristics) ? setup.characteristics : []).filter((item) => isReplaceableCharacteristic(item?.isReplaceable));
  if (!replaceable.length) issues.push({ section: 'characteristics', message: 'Add at least one replaceable component.' });
  replaceable.forEach((item, index) => {
    if (!hasText(item.category) || !hasText(item.description)) issues.push({ section: 'characteristics', message: `Replaceable component ${index + 1} requires a category and description.` });
  });
  (Array.isArray(setup.sensors) ? setup.sensors : []).forEach((sensor, index) => {
    const sensorType = (Array.isArray(setup.sensorTypes) ? setup.sensorTypes : []).find((type) => type.id === sensor.sensorTypeId);
    const name = hasText(sensor.alias) ? sensor.alias.trim() : `Sensor ${index + 1}`;
    if (!hasText(sensorType?.technologyPlatform) && !hasText(sensor.technologyPlatform)) issues.push({ section: 'sensors', message: `${name}: provide a sensor model.` });
    if (!hasText(sensorType?.technologyType) && !hasText(sensor.technologyType)) issues.push({ section: 'sensors', message: `${name}: provide a technology type.` });
    if (!hasText(sensor.measurementType)) issues.push({ section: 'sensors', message: `${name}: provide a measured quantity.` });
    else if (!isKnownSensorQuantity(sensor.measurementType, sensor.quantityKindIdentifier)) issues.push({ section: 'sensors', message: `${name}: select a recognized measured quantity from the available options.` });
  });
  (Array.isArray(setup.physicalDevices) ? setup.physicalDevices : []).forEach((device, index) => {
    const name = hasText(device?.name) ? device.name.trim() : `Device ${index + 1}`;
    if (!hasText(device?.name)) issues.push({ section: 'sensors', message: `Name device ${index + 1}.` });
    if (!device?.datasheet?.attachmentId && device?.datasheet?.notAvailable !== true) issues.push({ section: 'sensors', message: `${name}: attach a datasheet or select Datasheet unavailable.` });
  });
  return issues;
}
