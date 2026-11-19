import { describe, expect, it } from 'vitest';
import { validateMeasurementMetadata } from './measurementMetadataValidation';

const fixture = () => ({
  measurement_protocols: [{ id: 'p', parameters: [
    { id: 'rate', builtinKey: 'sampling_rate', name: 'Sampling Rate' },
    { id: 'unit', builtinKey: 'measured_unit', name: 'Measured Unit' },
  ] }],
  studies: [{ name: 'Study', selectedMeasurementProtocolId: 'p', assay_details: [{
    used_sensor: { alias: 'S1' }, measurement_protocols: [
      { targetId: 'rate', value: ['25600', 'Hz'] },
      { targetId: 'unit', value: ['m/s²', ''], valueIdentifier: 'http://qudt.org/vocab/unit/M-PER-SEC2' },
    ],
  }] }],
});

describe('measurement metadata export validation', () => {
  it('accepts known values and explicit statuses', () => {
    const payload = fixture();
    expect(validateMeasurementMetadata(payload)).toEqual([]);
    payload.studies[0].assay_details[0].measurement_protocols[0].value = ['Unknown', ''];
    payload.studies[0].assay_details[0].measurement_protocols[1].value = ['Not applicable', ''];
    expect(validateMeasurementMetadata(payload)).toEqual([]);
  });
  it('rejects missing, invalid and unrecognized values', () => {
    const payload = fixture();
    payload.studies[0].assay_details[0].measurement_protocols[0].value = ['0', 'Hz'];
    payload.studies[0].assay_details[0].measurement_protocols[1].valueIdentifier = 'wrong';
    expect(validateMeasurementMetadata(payload)).toHaveLength(2);
  });
  it.each(['25,6', '25.6', '25600'])('accepts sampling rate %s', (value) => {
    const payload = fixture();
    payload.studies[0].assay_details[0].measurement_protocols[0].value = [value, 'kHz'];
    expect(validateMeasurementMetadata(payload)).toEqual([]);
  });
  it.each(['1,2,3', '1.2,3', '-1', '0', 'abc', 'Infinity'])('rejects invalid rate %s', (value) => {
    const payload = fixture();
    payload.studies[0].assay_details[0].measurement_protocols[0].value = [value, 'Hz'];
    expect(validateMeasurementMetadata(payload)).toHaveLength(1);
  });
});
