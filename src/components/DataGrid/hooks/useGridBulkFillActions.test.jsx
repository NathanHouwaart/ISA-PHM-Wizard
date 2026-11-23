import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import useGridBulkFillActions from './useGridBulkFillActions';

it('fills measured-unit cells with the selected identifier without overwriting other fields', async () => {
  const commitGridChanges = vi.fn();
  const row = { id: 'unit', builtinKey: 'measured_unit' };
  const { result } = renderHook(() => useGridBulkFillActions({
    gridRef: { current: { getSelectedRange: async () => ({ y: 0, y1: 0 }) } },
    translateRangeCoordinates: (range) => range,
    getFlatColumns: () => [{ prop: 'description' }, { prop: 's1_spec' }, { prop: 's1_unit' }, { prop: 's2_spec' }],
    getRowByIndex: () => row,
    staticColumns: [{ prop: 'description' }],
    isStandaloneGrid: false,
    isEditableColumn: () => true,
    canEditCell: () => true,
    fields: { rowId: 'id' },
    commitGridChanges,
  }));
  await act(async () => result.current.bulkFillActions[0].onClick());
  expect(result.current.unitFillRequest).toBeTruthy();
  act(() => result.current.confirmUnitFill({ value: 'G', valueIdentifier: 'http://qudt.org/vocab/unit/G' }));
  expect(commitGridChanges).toHaveBeenCalledWith(expect.objectContaining({
    rowDataUpdates: [],
    mappingUpdates: [
      { rowId: 'unit', columnId: 's1_spec', value: { value: 'G', valueIdentifier: 'http://qudt.org/vocab/unit/G' } },
      { rowId: 'unit', columnId: 's2_spec', value: { value: 'G', valueIdentifier: 'http://qudt.org/vocab/unit/G' } },
    ],
  }));
});
