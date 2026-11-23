import { describe, expect, it } from 'vitest';
import { getTestSetupReadiness } from './testSetupReadiness';

const complete = { name: 'Rig', location: 'Lab', experimentPreparationProtocolName: 'Prepare', testSpecimenName: 'Bearing', characteristics: [{ isReplaceable: true, category: 'Bearing', description: 'Test bearing' }], physicalDevices: [] };

describe('test setup readiness', () => {
  it('keeps all previous save requirements and reports every missing item', () => {
    const issues = getTestSetupReadiness({ ...complete, name: '', location: '', characteristics: [], physicalDevices: [{ name: '', datasheet: {} }] });
    expect(issues.map((item) => item.message)).toEqual(expect.arrayContaining(['Test setup name is required.', 'Location is required.', 'Add at least one replaceable component.', 'Name device 1.', 'Device 1: attach a datasheet or select Datasheet unavailable.']));
  });

  it('marks a complete setup ready and rechecks edits without changing the setup', () => {
    const device = { id: 'daq', name: 'DAQ', model: 'Model A', datasheet: { notAvailable: true } };
    const setup = { ...complete, physicalDevices: [device], sensors: [{ id: 's', physicalDeviceId: 'daq', technologyPlatform: 'Sensor A', technologyType: 'Accelerometer', measurementType: 'Acceleration' }] };
    expect(getTestSetupReadiness(setup)).toEqual([]);
    expect(getTestSetupReadiness({ ...setup, sensors: [{ ...setup.sensors[0], technologyPlatform: '' }] }).map((issue) => issue.message)).toContain('Sensor 1: provide a sensor model.');
    expect(getTestSetupReadiness({ ...setup, physicalDevices: [{ ...device, datasheet: {} }] })).toHaveLength(1);
    expect(getTestSetupReadiness({ ...setup, sensors: [] })[0].message).toContain('at least one used sensor output');
    expect(device.datasheet.notAvailable).toBe(true);
  });

  it('requires a linked setup for export', () => {
    expect(getTestSetupReadiness(null)[0].message).toBe('Select a test setup.');
  });
  it('requires confirmation that mappings were reviewed after a quantity change', () => {
    const sensor = { id: 's1', alias: 'X', datasheet: { notAvailable: true }, technologyPlatform: 'Model A', technologyType: 'Accelerometer', measurementType: 'Acceleration', mappingReviewRequired: true };
    expect(getTestSetupReadiness({ ...complete, sensors: [sensor] }).map((issue) => issue.message)).toContain('X: review existing mappings after the measured quantity changed.');
    expect(getTestSetupReadiness({ ...complete, sensors: [{ ...sensor, mappingReviewRequired: false }] })).toEqual([]);
  });

  it('requires sensor model, technology and quantity while allowing reusable type details', () => {
    const incomplete = { ...complete, sensors: [{ id: 's1', alias: 'X' }] };
    expect(getTestSetupReadiness(incomplete).map((issue) => issue.message)).toEqual(expect.arrayContaining(['X: provide a sensor model.', 'X: provide a technology type.', 'X: provide a measured quantity.']));
    const ready = { ...incomplete, sensors: [{ id: 's1', alias: 'X', sensorTypeId: 't1', measurementType: 'Acceleration' }], sensorTypes: [{ id: 't1', technologyPlatform: 'Model A', technologyType: 'Accelerometer', datasheet: { notAvailable: true } }] };
    expect(getTestSetupReadiness(ready)).toEqual([]);
  });

  it('accepts a matching legacy text quantity but flags unknown or inconsistent quantities', () => {
    const sensor = { id: 's1', alias: 'X', datasheet: { notAvailable: true }, technologyPlatform: 'Model A', technologyType: 'Accelerometer', measurementType: 'Acceleration' };
    expect(getTestSetupReadiness({ ...complete, sensors: [sensor] })).toEqual([]);
    expect(getTestSetupReadiness({ ...complete, sensors: [{ ...sensor, measurementType: 'Made up' }] })[0].message).toContain('recognized measured quantity');
    expect(getTestSetupReadiness({ ...complete, sensors: [{ ...sensor, quantityKindIdentifier: 'http://qudt.org/vocab/quantitykind/Temperature' }] })[0].message).toContain('recognized measured quantity');
    expect(getTestSetupReadiness({ ...complete, sensors: [{ ...sensor, quantityKindIdentifier: 'http://qudt.org/vocab/quantitykind/Acceleration' }] })).toEqual([]);
  });
  it('requires a standalone datasheet answer and accepts a definition datasheet', () => {
    const sensor = { id: 's', alias: 'Probe', sensorTypeId: 't', technologyPlatform: 'Model', technologyType: 'Probe', measurementType: 'Acceleration' };
    const setup = { ...complete, sensors: [sensor], sensorTypes: [{ id: 't' }] };
    expect(getTestSetupReadiness(setup).map((issue) => issue.message)).toContain('Probe: attach a datasheet or select Datasheet unavailable.');
    expect(getTestSetupReadiness({ ...setup, sensorTypes: [{ id: 't', datasheet: { attachmentId: 'sheet' } }] })).toEqual([]);
    expect(getTestSetupReadiness({ ...setup, sensors: [{ ...sensor, datasheet: { notAvailable: true } }] })).toEqual([]);
  });

});
