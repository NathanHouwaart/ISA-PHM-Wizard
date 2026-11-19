import { expect, it } from 'vitest';
import { UnitCellTemplate } from './UnitCellTemplate';

const h = (tag, props, text) => ({ tag, props, text });

it('uses the saved identifier for standalone and mapped unit cells', () => {
  expect(UnitCellTemplate(h, { prop: 'unit', model: { unit: 'g', unitIdentifier: 'http://qudt.org/vocab/unit/GM' } }).text).toBe('g (Gram)');
  expect(UnitCellTemplate(h, { prop: 's_spec', model: { s_spec: 'G', s_spec_identifier: 'http://qudt.org/vocab/unit/G' } }).text).toBe('G (Gravity)');
  expect(UnitCellTemplate(h, { prop: 's_unit', model: { s_unit: 'Hz', s_unit_identifier: 'http://qudt.org/vocab/unit/HZ' } }).text).toBe('Hz (Hertz)');
});

it('preserves legacy, status, and mismatched values without guessing', () => {
  expect(UnitCellTemplate(h, { prop: 'unit', model: { unit: 'g' } }).text).toBe('g');
  expect(UnitCellTemplate(h, { prop: 'unit', model: { unit: 'Unknown' } }).text).toBe('Unknown');
  expect(UnitCellTemplate(h, { prop: 'unit', model: { unit: 'g', unitIdentifier: 'http://qudt.org/vocab/unit/G' } }).text).toBe('g');
});
