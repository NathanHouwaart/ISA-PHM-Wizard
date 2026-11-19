import { expect, it } from 'vitest';
import sharedQuantities from '../../vendor/isa-phm-specification/catalogues/qudt-quantities-3.5.2.json';
import sharedAdditions from '../../vendor/isa-phm-specification/catalogues/isa-phm-quantities.json';
import { QUANTITY_CATALOGUE, QUATERNION_COMPONENT } from './quantityCatalogue';

it('uses the shared QUDT quantities and labelled ISA-PHM addition', () => {
  expect(QUANTITY_CATALOGUE).toEqual([...sharedQuantities, ...sharedAdditions]);
  expect(QUATERNION_COMPONENT.identifier).toBe('urn:isa-phm:quantity:quaternion-component');
});
