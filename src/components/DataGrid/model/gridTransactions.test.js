import { describe, expect, it } from 'vitest';
import {
    normalizeCellValue,
    applyRowUpdates,
    applyMappingUpdates,
    filterEffectiveRowUpdates,
    filterEffectiveMappingUpdates
} from './gridTransactions';

describe('gridTransactions', () => {
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

