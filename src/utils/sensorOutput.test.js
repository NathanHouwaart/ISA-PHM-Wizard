import { describe, expect, it } from 'vitest';
import { buildConversionPayload } from './conversionPayload';

describe('sensor output filtering', () => {
  it('creates assays only for dataset-output and dual-purpose sensors', () => {
    const payload = buildConversionPayload({
      studies: [{ id: 'study-1', name: 'Study 1', runCount: 1 }],
      testSetups: [{
        id: 'setup-1',
        sensors: [
          { id: 'output', alias: 'Vibration', usage: 'dataset-output' },
          { id: 'monitor', alias: 'Pressure guard', usage: 'condition-monitoring' },
          { id: 'both', alias: 'Motor power', usage: 'both' },
        ],
      }],
      selectedTestSetupId: 'setup-1',
    });

    expect(payload.test_setup.sensors).toHaveLength(3);
    expect(payload.studies[0].assay_details.map((assay) => assay.used_sensor.id))
      .toEqual(['output', 'both']);
  });
});
