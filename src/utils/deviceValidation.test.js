import { describe, expect, it } from 'vitest';
import { findDeviceWithoutDatasheetChoice, findUnnamedDeviceIndex } from './deviceValidation';

describe('device name validation', () => {
  it('allows no devices or devices with names', () => {
    expect(findUnnamedDeviceIndex([])).toBe(-1);
    expect(findUnnamedDeviceIndex([{ name: 'enDAQ' }, { name: ' DAQ 2 ' }])).toBe(-1);
  });

  it('finds the first missing or whitespace-only device name', () => {
    expect(findUnnamedDeviceIndex([{ name: 'DAQ' }, { name: '  ' }])).toBe(1);
    expect(findUnnamedDeviceIndex([{}])).toBe(0);
  });
});

describe('device datasheet choice', () => {
  it('accepts a PDF attachment or an explicit unavailable choice', () => {
    expect(findDeviceWithoutDatasheetChoice([])).toBe(-1);
    expect(findDeviceWithoutDatasheetChoice([{ datasheet: { attachmentId: 'pdf-1' } }, { datasheet: { notAvailable: true } }])).toBe(-1);
  });

  it('rejects a blank or unchecked choice', () => {
    expect(findDeviceWithoutDatasheetChoice([{ datasheet: { notAvailable: true } }, {}])).toBe(1);
    expect(findDeviceWithoutDatasheetChoice([{ datasheet: { attachmentId: '', notAvailable: false } }])).toBe(0);
  });
});
