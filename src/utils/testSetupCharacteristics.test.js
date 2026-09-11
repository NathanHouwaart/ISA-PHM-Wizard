import { describe, expect, it } from 'vitest';
import {
  normalizeCharacteristic,
  setCharacteristicReplaceable
} from './testSetupCharacteristics';

describe('test setup characteristics', () => {
  it('treats missing replaceable flags as false', () => {
    expect(normalizeCharacteristic({ category: 'Motor', value: 'W21', unit: 'N/A' }))
      .toEqual({ category: 'Motor', value: 'W21', unit: 'N/A', isReplaceable: false, description: '' });
  });

  it('clears value and unit when a characteristic is replaceable', () => {
    expect(setCharacteristicReplaceable(
      { category: 'Motor', value: 'W21', unit: 'N/A' },
      true
    )).toEqual({ category: 'Motor', value: '', unit: '', isReplaceable: true });
  });

  it('normalizes grid string values to booleans', () => {
    expect(normalizeCharacteristic({ isReplaceable: 'true', value: 'W21', unit: 'N/A' }))
      .toEqual({ isReplaceable: true, value: '', unit: '' });
  });

  it('clears replaceable descriptions when a characteristic becomes fixed', () => {
    expect(setCharacteristicReplaceable(
      { category: 'Motor', description: 'Drive motor', isReplaceable: true },
      false
    )).toEqual({ category: 'Motor', description: '', isReplaceable: false });
  });
});
