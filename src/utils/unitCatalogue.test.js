import { describe, expect, it } from 'vitest';
import { searchUnits, unitSelection, UNIT_CATALOGUE } from './unitCatalogue';
import sharedUnits from '../../vendor/isa-phm-specification/catalogues/qudt-units-3.5.2.json';

describe('unit catalogue', () => {
  it('uses the shared specification catalogue directly', () => {
    expect(UNIT_CATALOGUE).toBe(sharedUnits);
  });
  it('searches names and returns a stable identifier with the symbol', () => {
    const [unit] = searchUnits('kilohertz');
    expect(unitSelection(unit.identifier)).toEqual({ value: 'kHz', valueIdentifier: 'http://qudt.org/vocab/unit/KiloHZ' });
  });

  it('rejects unknown identifiers and prioritises compatible units', () => {
    expect(unitSelection('unknown')).toBeNull();
    expect(searchUnits('', 'acceleration')[0].quantities.map((kind) => kind.toLowerCase())).toContain('acceleration');
  });

  it('includes frequency, rotational speed, gravity and dimensionless units as distinct entries', () => {
    const identifiers = new Set(searchUnits().map((unit) => unit.identifier));
    for (const code of ['HZ', 'KiloHZ', 'REV-PER-MIN', 'G', 'UNITLESS']) {
      expect(identifiers.has(`http://qudt.org/vocab/unit/${code}`)).toBe(true);
    }
  });

  it('ranks exact g symbols before unrelated matches', () => {
    const first = searchUnits('g').slice(0, 10).map((unit) => unit.identifier);
    expect(first).toContain('http://qudt.org/vocab/unit/G');
    expect(first).toContain('http://qudt.org/vocab/unit/GM');
  });
  it('ranks gram ahead of kilogram', () => {
    const results = searchUnits('gram').map((unit) => unit.identifier);
    expect(results.indexOf('http://qudt.org/vocab/unit/GM')).toBeLessThan(results.indexOf('http://qudt.org/vocab/unit/KiloGM'));
  });
  it('distinguishes the case-sensitive g and G symbols', () => {
    expect(searchUnits('g')[0].identifier).toBe('http://qudt.org/vocab/unit/GM');
    expect(searchUnits('G')[0].identifier).toBe('http://qudt.org/vocab/unit/G');
  });
});
