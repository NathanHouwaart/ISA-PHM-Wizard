import { describe, expect, it } from 'vitest';
import {
    normalizeCellValue,
    applyRowUpdates,
    applyMappingUpdates,
    filterEffectiveRowUpdates,
    filterEffectiveMappingUpdates
} from './gridTransactions';

describe('gridTransactions', () => {
    it('stores and updates the identifier for a protocol unit independently of its value identifier', () => {
        const fields = { mappingRowId: 'rowId', mappingColumnId: 'sensorId', mappingValue: 'value', hasChildColumns: true };
        const base = [{ rowId: 'r1', sensorId: 's1', value: ['12', 'g'], valueIdentifier: 'urn:value', unitIdentifier: 'urn:gravity' }];
        const updates = [{ rowId: 'r1', columnId: 's1_unit', value: { value: 'g', valueIdentifier: 'urn:gram' } }];
        const effective = filterEffectiveMappingUpdates(updates, base, fields);
        expect(effective).toHaveLength(1);
        const changed = applyMappingUpdates(base, effective, fields);
        expect(changed[0]).toMatchObject({ value: ['12', 'g'], valueIdentifier: 'urn:value', unitIdentifier: 'urn:gram' });
        expect(applyMappingUpdates(changed, [{ rowId: 'r1', columnId: 's1_unit', value: 'kg' }], fields)[0].unitIdentifier).toBeUndefined();
    });
    it('stores the chosen identifier on a study variable and clears it after a text edit', () => {
        const rows = [{ id: 'r1', unit: 'g', unitIdentifier: 'urn:gravity' }];
        const update = [{ rowId: 'r1', columnProp: 'unit', value: { value: 'g', valueIdentifier: 'urn:gram' } }];
        const changed = applyRowUpdates(rows, filterEffectiveRowUpdates(update, rows));
        expect(changed[0]).toMatchObject({ unit: 'g', unitIdentifier: 'urn:gram' });
        expect(applyRowUpdates(changed, [{ rowId: 'r1', columnProp: 'unit', value: 'kg' }])[0].unitIdentifier).toBe('');
    });
    it('persists a selected identifier even when two units share a symbol', () => {
        const fields = { mappingRowId: 'rowId', mappingColumnId: 'sensorId', mappingValue: 'value', hasChildColumns: true };
        const base = [{ rowId: 'r1', sensorId: 's1', value: ['g', ''], valueIdentifier: 'urn:gravity' }];
        const updates = [{ rowId: 'r1', columnId: 's1_spec', value: { value: 'g', valueIdentifier: 'urn:gram' } }];
        const effective = filterEffectiveMappingUpdates(updates, base, fields);
        expect(effective).toHaveLength(1);
        expect(applyMappingUpdates(base, effective, fields)[0]).toMatchObject({ value: ['g', ''], valueIdentifier: 'urn:gram' });
    });
    it('clears a stale unit identifier when the specification changes but preserves it for unit edits', () => {
        const fields = { mappingRowId: 'rowId', mappingColumnId: 'sensorId', mappingValue: 'value', hasChildColumns: true };
        const base = [{ rowId: 'r1', sensorId: 's1', value: ['g', ''], valueIdentifier: 'urn:unit:gravity' }];
        const changed = applyMappingUpdates(base, [{ rowId: 'r1', columnId: 's1_spec', value: 'Unknown' }], fields);
        expect(changed[0].valueIdentifier).toBeUndefined();
        const unitChanged = applyMappingUpdates(base, [{ rowId: 'r1', columnId: 's1_unit', value: 'Hz' }], fields);
        expect(unitChanged[0].valueIdentifier).toBe('urn:unit:gravity');
    });
    it('normalizes scalar-like editor payloads and strips control characters', () => {
        expect(normalizeCellValue({ value: 'abc' })).toBe('abc');
        expect(normalizeCellValue({ id: 42 })).toBe('42');
        expect(normalizeCellValue('a\u0000b\u0008 c')).toBe('a b c');
        expect(normalizeCellValue({ nested: true })).toBe('');
    });

    it('applies row updates by row id and normalizes values', () => {
        const baseRows = [
            { id: 'r1', name: 'Old', note: '' },
            { id: 'r2', name: 'Keep', note: '' }
        ];

        const nextRows = applyRowUpdates(baseRows, [
            { rowId: 'r1', columnProp: 'name', value: { value: 'New' } },
            { rowId: 'r1', columnProp: 'note', value: 'x\u0000y' }
        ], 'id');

        expect(nextRows).toEqual([
            { id: 'r1', name: 'New', note: 'x y' },
            { id: 'r2', name: 'Keep', note: '' }
        ]);
    });

    it('applies child-column mapping updates and preserves the sibling value', () => {
        const fields = {
            mappingRowId: 'studyRunId',
            mappingColumnId: 'sensorId',
            mappingValue: 'value',
            hasChildColumns: true
        };

        const baseMappings = [{
            studyRunId: 'row-1',
            sensorId: 'sensor-1',
            value: ['old-spec', 'Hz']
        }];

        const nextMappings = applyMappingUpdates(baseMappings, [
            { rowId: 'row-1', columnId: 'sensor-1_spec', value: 'new-spec' }
        ], fields);

        expect(nextMappings).toEqual([
            { studyRunId: 'row-1', sensorId: 'sensor-1', value: ['new-spec', 'Hz'] }
        ]);
    });

    it('creates child-column mappings when missing', () => {
        const fields = {
            mappingRowId: 'studyRunId',
            mappingColumnId: 'sensorId',
            mappingValue: 'value',
            hasChildColumns: true
        };

        const nextMappings = applyMappingUpdates([], [
            { rowId: 'row-1', columnId: 'sensor-1_unit', value: 'm/s2' }
        ], fields);

        expect(nextMappings).toEqual([
            { studyRunId: 'row-1', sensorId: 'sensor-1', value: ['', 'm/s2'] }
        ]);
    });

    it('filters no-op row updates and keeps only effective last-write values', () => {
        const baseRows = [{ id: 'r1', name: 'A' }];

        const effective = filterEffectiveRowUpdates([
            { rowId: 'r1', columnProp: 'name', value: 'A' },
            { rowId: 'r1', columnProp: 'name', value: 'B' },
            { rowId: 'r1', columnProp: 'name', value: 'B' }
        ], baseRows, 'id');

        expect(effective).toEqual([
            { rowId: 'r1', columnProp: 'name', value: 'B' }
        ]);
    });

    it('filters no-op mapping updates against current child values', () => {
        const fields = {
            mappingRowId: 'studyRunId',
            mappingColumnId: 'sensorId',
            mappingValue: 'value',
            hasChildColumns: true
        };

        const baseMappings = [{
            studyRunId: 'row-1',
            sensorId: 'sensor-1',
            value: ['spec-a', 'unit-a']
        }];

        const effective = filterEffectiveMappingUpdates([
            { rowId: 'row-1', columnId: 'sensor-1_spec', value: 'spec-a' },
            { rowId: 'row-1', columnId: 'sensor-1_unit', value: 'unit-b' },
            { rowId: 'row-1', columnId: 'sensor-1_unit', value: 'unit-b' }
        ], baseMappings, fields);

        expect(effective).toEqual([
            { rowId: 'row-1', columnId: 'sensor-1_unit', value: 'unit-b' }
        ]);
    });
});

