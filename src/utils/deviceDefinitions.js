import { v4 as uuid4 } from 'uuid';

export function quantityNeedsMappingReview(oldName, oldIdentifier, newName, newIdentifier) {
  if (!oldName?.trim()) return false;
  return oldName.trim().toLocaleLowerCase() !== (newName || '').trim().toLocaleLowerCase()
    || Boolean(oldIdentifier && newIdentifier && oldIdentifier !== newIdentifier);
}

// A newly-created sensor cannot yet be referenced by another project's saved
// setup. Only suppress a new review marker when it also has no local mappings.
export function clearReviewForUnmappedNewSensors(sensors, previousSensors, persistedIds, mappings) {
  return sensors.map((sensor) => {
    if (!sensor.mappingReviewRequired || persistedIds.has(sensor.id)) return sensor;
    if (previousSensors.find((item) => item.id === sensor.id)?.mappingReviewRequired) return sensor;
    const mapped = mappings.some((entry) => String(entry?.sourceId ?? entry?.sensorId ?? '') === String(sensor.id));
    return mapped ? sensor : { ...sensor, mappingReviewRequired: false };
  });
}

// Copy a catalogue entry into a setup without linking future edits to its source.
// Attachment references are retained: their stored files are shared by ID and
// kept alive by the attachment lifecycle while any setup refers to them.
export function cloneDeviceDefinition(definition) {
  return {
    ...structuredClone(definition),
    id: uuid4(),
    outputs: (definition.outputs || []).map((output) => ({ ...structuredClone(output), id: uuid4() })),
  };
}

// Definitions are kept inside the setup. IDs on instantiated devices and
// sensors are independent, so changing a definition never changes mappings.
export function createDeviceDefinition(device, sensors) {
  return {
    id: uuid4(),
    name: device.model?.trim() || device.name?.trim() || '',
    model: device.model || '',
    datasheet: device.datasheet || null,
    outputs: sensors.filter((sensor) => sensor.physicalDeviceId === device.id).map((sensor) => ({
      id: uuid4(), name: sensor.alias || '', technologyType: sensor.technologyType || '',
      measurementType: sensor.measurementType || '', quantityKindIdentifier: sensor.quantityKindIdentifier || '',
      technologyPlatform: sensor.technologyPlatform || '', description: sensor.channelDescription || '',
      ...(sensor.datasheet ? { datasheet: sensor.datasheet } : {}),
    })),
  };
}

export function instantiateDeviceDefinition(definition, deviceName, outputIds) {
  const device = { id: uuid4(), name: deviceName.trim(), model: definition.model || '',
    datasheet: definition.datasheet || null, definitionId: definition.id, serialNumber: '' };
  const selected = new Set(outputIds);
  const sensors = (definition.outputs || []).filter((output) => selected.has(output.id)).map((output) => ({
    id: uuid4(), alias: output.name || '', physicalDeviceId: device.id, definitionOutputId: output.id,
    technologyPlatform: output.technologyPlatform || '', technologyType: output.technologyType || '', measurementType: output.measurementType || '',
    quantityKindIdentifier: output.quantityKindIdentifier || '', channelDescription: output.description || '', usage: 'dataset-output', additionalInfo: [],
    ...(output.datasheet ? { datasheet: output.datasheet } : {}),
  }));
  return { device, sensors };
}

export function updateLinkedDefinition(definition, previous, devices, sensors) {
  const linkedIds = new Set(devices.filter((device) => device.definitionId === definition.id).map((device) => device.id));
  const oldOutputs = new Map((previous.outputs || []).map((output) => [output.id, output]));
  const outputs = new Map((definition.outputs || []).map((output) => [output.id, output]));
  const updatedDevices = devices.map((device) => linkedIds.has(device.id)
    ? { ...device,
      model: device.model === previous.model ? (definition.model || '') : device.model,
      datasheet: JSON.stringify(device.datasheet || null) === JSON.stringify(previous.datasheet || null)
        ? (definition.datasheet || null) : device.datasheet,
    } : device);
  const updatedSensors = sensors.map((sensor) => {
    if (!linkedIds.has(sensor.physicalDeviceId) || !sensor.definitionOutputId) return sensor;
    const next = outputs.get(sensor.definitionOutputId);
    if (!next) return { ...sensor, channelDescription: sensor.channelDescription || oldOutputs.get(sensor.definitionOutputId)?.description || '', definitionOutputId: '', sensorTypeId: '' };
    const old = oldOutputs.get(sensor.definitionOutputId);
    if (!old) return sensor;
    if (sensor.definitionOverride) return { ...sensor, channelDescription: next.description || '' };
    const quantityMatches = sensor.measurementType === old.measurementType
      && (sensor.quantityKindIdentifier || '') === (old.quantityKindIdentifier || '');
    const quantityChanged = old.measurementType !== next.measurementType
      || (old.quantityKindIdentifier || '') !== (next.quantityKindIdentifier || '');
    const reviewNeeded = quantityNeedsMappingReview(old.measurementType, old.quantityKindIdentifier, next.measurementType, next.quantityKindIdentifier);
    return { ...sensor,
      channelDescription: next.description || '',
      technologyPlatform: (sensor.technologyPlatform || '') === (old.technologyPlatform || '') ? (next.technologyPlatform || '') : sensor.technologyPlatform,
      technologyType: sensor.technologyType === old.technologyType ? next.technologyType : sensor.technologyType,
      ...(quantityMatches && quantityChanged ? { measurementType: next.measurementType, quantityKindIdentifier: next.quantityKindIdentifier, mappingReviewRequired: sensor.mappingReviewRequired || reviewNeeded } : {}),
      ...(JSON.stringify(sensor.datasheet || null) === JSON.stringify(old.datasheet || null) ? { datasheet: next.datasheet || null } : {}),
    };
  });
  return { devices: updatedDevices, sensors: updatedSensors };
}
