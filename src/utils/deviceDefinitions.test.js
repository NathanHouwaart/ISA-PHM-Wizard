import { describe, expect, it } from 'vitest';
import { cloneDeviceDefinition, clearReviewForUnmappedNewSensors, createDeviceDefinition, instantiateDeviceDefinition, quantityNeedsMappingReview, updateLinkedDefinition } from './deviceDefinitions';

describe('device definitions', () => {
  it('only clears new review notices for unmapped, unsaved sensors', () => {
    const sensors = ['new', 'mapped', 'saved', 'previous'].map((id) => ({ id, mappingReviewRequired: true }));
    const previous = [{ id: 'previous', mappingReviewRequired: true }];
    const result = clearReviewForUnmappedNewSensors(sensors, previous, new Set(['saved']), [{ sourceId: 'mapped' }]);
    expect(result.map((sensor) => Boolean(sensor.mappingReviewRequired))).toEqual([false, true, true, true]);
  });
  it('copies a catalogue definition with independent identities and preserved attachments', () => {
    const source = { id: 'source', name: 'DAQ', datasheet: { attachmentId: 'pdf' }, outputs: [{ id: 'x', name: 'X', description: 'X channel', datasheet: { attachmentId: 'sensor-pdf' } }] };
    const copy = cloneDeviceDefinition(source);
    expect(copy.id).not.toBe(source.id);
    expect(copy.outputs[0].id).not.toBe(source.outputs[0].id);
    expect(copy.datasheet.attachmentId).toBe('pdf');
    expect(copy.outputs[0].datasheet.attachmentId).toBe('sensor-pdf');
    copy.outputs[0].description = 'Changed';
    expect(source.outputs[0].description).toBe('X channel');
  });
  it('carries channel descriptions through instances, edits and detachment', () => {
    const old = { id: 'def', outputs: [{ id: 'x', description: 'Acceleration X' }] };
    const created = instantiateDeviceDefinition(old, 'DAQ 1', ['x']);
    expect(created.sensors[0].channelDescription).toBe('Acceleration X');
    const revised = { ...old, outputs: [{ ...old.outputs[0], description: 'Updated channel' }] };
    const updated = updateLinkedDefinition(revised, old, [created.device], created.sensors);
    expect(updated.sensors[0].channelDescription).toBe('Updated channel');
    const detached = updateLinkedDefinition({ ...revised, outputs: [] }, revised, updated.devices, updated.sensors);
    expect(detached.sensors[0]).toMatchObject({ definitionOutputId: '', channelDescription: 'Updated channel' });
  });
  it('does not flag adding an identifier to the same quantity as a measurement change', () => {
    expect(quantityNeedsMappingReview('Acceleration', '', 'Acceleration', 'qudt:Acceleration')).toBe(false);
    expect(quantityNeedsMappingReview('Acceleration', 'qudt:Acceleration', 'Temperature', 'qudt:Temperature')).toBe(true);
  });
  it('creates a device with only selected outputs and separate IDs', () => {
    const definition = createDeviceDefinition({ id: 'source', name: 'DAQ', model: 'S3', datasheet: { notAvailable: true } }, [
      { id: 'x', physicalDeviceId: 'source', alias: 'X', technologyType: 'Accelerometer', measurementType: 'Acceleration' },
      { id: 'y', physicalDeviceId: 'source', alias: 'Y', technologyType: 'Accelerometer', measurementType: 'Acceleration' },
    ]);
    const result = instantiateDeviceDefinition(definition, 'DAQ 2', [definition.outputs[0].id]);
    expect(result.device.id).not.toBe('source');
    expect(result.device.definitionId).toBe(definition.id);
    expect(result.sensors).toHaveLength(1);
    expect(result.sensors[0]).toMatchObject({ alias: 'X', physicalDeviceId: result.device.id, usage: 'dataset-output' });
  });
  it('preserves sensor IDs and detaches removed outputs without deleting mappings', () => {
    const old = { id: 'def', model: 'Old', outputs: [{ id: 'x', technologyType: 'Accelerometer', measurementType: 'Acceleration' }, { id: 'y' }] };
    const next = { ...old, model: 'New', outputs: [{ ...old.outputs[0], measurementType: 'Temperature' }] };
    const devices = [{ id: 'd', definitionId: 'def', model: 'Old' }];
    const sensors = [{ id: 's1', physicalDeviceId: 'd', definitionOutputId: 'x', technologyType: 'Accelerometer', measurementType: 'Acceleration' }, { id: 's2', physicalDeviceId: 'd', definitionOutputId: 'y', sensorTypeId: 'old-type', alias: 'Y' }];
    const result = updateLinkedDefinition(next, old, devices, sensors);
    expect(result.devices[0].model).toBe('New');
    expect(result.sensors[0]).toMatchObject({ id: 's1', measurementType: 'Temperature', mappingReviewRequired: true });
    expect(result.sensors[1]).toMatchObject({ id: 's2', alias: 'Y', definitionOutputId: '', sensorTypeId: '' });
  });
  it('does not flag an unchanged quantity or a sensor-specific override', () => {
    const old = { id: 'd', outputs: [{ id: 'o', measurementType: 'Acceleration', technologyType: 'Accelerometer' }] };
    const devices = [{ id: 'device', definitionId: 'd' }];
    const override = [{ id: 's', physicalDeviceId: 'device', definitionOutputId: 'o', measurementType: 'Temperature' }];
    expect(updateLinkedDefinition({ ...old, outputs: [{ ...old.outputs[0], measurementType: 'Pressure' }] }, old, devices, override).sensors[0].mappingReviewRequired).toBeUndefined();
  });

});
