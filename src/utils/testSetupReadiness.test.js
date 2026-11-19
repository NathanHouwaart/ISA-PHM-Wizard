import { describe, expect, it } from 'vitest';
import { getTestSetupReadiness } from './testSetupReadiness';

const complete = { name: 'Rig', location: 'Lab', experimentPreparationProtocolName: 'Prepare', testSpecimenName: 'Bearing', characteristics: [{ isReplaceable: true, category: 'Bearing', description: 'Test bearing' }], physicalDevices: [{ name: 'DAQ', datasheet: { notAvailable: true } }] };

describe('test setup readiness', () => {
  it('keeps all previous save requirements and reports every missing item', () => {
    const issues = getTestSetupReadiness({ ...complete, name: '', location: '', characteristics: [], physicalDevices: [{ name: '', datasheet: {} }] });
    expect(issues.map((item) => item.message)).toEqual(expect.arrayContaining(['Test setup name is required.', 'Location is required.', 'Add at least one replaceable component.', 'Name device 1.', 'Device 1: attach a datasheet or select Datasheet unavailable.']));
  });

  it('marks a complete setup ready and rechecks edits without changing the setup', () => {
    expect(getTestSetupReadiness(complete)).toEqual([]);
    expect(getTestSetupReadiness({ ...complete, physicalDevices: [{ ...complete.physicalDevices[0], datasheet: {} }] })).toHaveLength(1);
    expect(complete.physicalDevices[0].datasheet.notAvailable).toBe(true);
  });

  it('requires a linked setup for export', () => {
    expect(getTestSetupReadiness(null)[0].message).toBe('Select a test setup.');
  });

  it('requires sensor model, technology and quantity while allowing reusable type details', () => {
    const incomplete = { ...complete, sensors: [{ id: 's1', alias: 'X' }] };
    expect(getTestSetupReadiness(incomplete).map((issue) => issue.message)).toEqual(expect.arrayContaining(['X: provide a sensor model.', 'X: provide a technology type.', 'X: provide a measured quantity.']));
    const ready = { ...incomplete, sensors: [{ id: 's1', alias: 'X', sensorTypeId: 't1', measurementType: 'Acceleration' }], sensorTypes: [{ id: 't1', technologyPlatform: 'Model A', technologyType: 'Accelerometer' }] };
    expect(getTestSetupReadiness(ready)).toEqual([]);
  });

  it('accepts a matching legacy text quantity but flags unknown or inconsistent quantities', () => {
    const sensor = { id: 's1', alias: 'X', technologyPlatform: 'Model A', technologyType: 'Accelerometer', measurementType: 'Acceleration' };
    expect(getTestSetupReadiness({ ...complete, sensors: [sensor] })).toEqual([]);
    expect(getTestSetupReadiness({ ...complete, sensors: [{ ...sensor, measurementType: 'Made up' }] })[0].message).toContain('recognized measured quantity');
    expect(getTestSetupReadiness({ ...complete, sensors: [{ ...sensor, quantityKindIdentifier: 'http://qudt.org/vocab/quantitykind/Temperature' }] })[0].message).toContain('recognized measured quantity');
    expect(getTestSetupReadiness({ ...complete, sensors: [{ ...sensor, quantityKindIdentifier: 'http://qudt.org/vocab/quantitykind/Acceleration' }] })).toEqual([]);
  });
});
