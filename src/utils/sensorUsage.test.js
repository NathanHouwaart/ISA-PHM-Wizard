import { describe, expect, it } from 'vitest';
import {
  SENSOR_USAGE_BOTH,
  SENSOR_USAGE_CONDITION_MONITORING,
  SENSOR_USAGE_DATASET_OUTPUT,
  isSensorIncludedInDatasetOutput,
  isSensorUsedForConditionMonitoring,
  normalizeSensor
} from './sensorUsage';

describe('sensor usage', () => {
  it('treats legacy sensors as dataset-output sensors', () => {
    expect(normalizeSensor({ id: 'sensor-1' }).usage).toBe(SENSOR_USAGE_DATASET_OUTPUT);
    expect(isSensorIncludedInDatasetOutput({ id: 'sensor-1' })).toBe(true);
    expect(isSensorUsedForConditionMonitoring({ id: 'sensor-1' })).toBe(false);
  });

  it('supports monitoring-only and dual-purpose sensors', () => {
    expect(isSensorIncludedInDatasetOutput({ usage: SENSOR_USAGE_CONDITION_MONITORING })).toBe(false);
    expect(isSensorUsedForConditionMonitoring({ usage: SENSOR_USAGE_CONDITION_MONITORING })).toBe(true);
    expect(isSensorIncludedInDatasetOutput({ usage: SENSOR_USAGE_BOTH })).toBe(true);
    expect(isSensorUsedForConditionMonitoring({ usage: SENSOR_USAGE_BOTH })).toBe(true);
  });
});
