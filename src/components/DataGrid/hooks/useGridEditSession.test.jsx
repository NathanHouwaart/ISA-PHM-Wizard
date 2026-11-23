import { renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import useGridEditSession from './useGridEditSession';

it('preserves the selected catalogue identifier when dragging a unit to another sensor', () => {
  const commitGridChanges = vi.fn();
  const row = { id: 'r', builtinKey: 'measured_unit' };
  const displayed = { ...row, s1_spec: 'nm', s1_spec_identifier: 'http://qudt.org/vocab/unit/NanoM' };
  const { result } = renderHook(() => useGridEditSession({
    isStandaloneGrid: false, staticColumns: [], isEditableColumn: () => true, canEditCell: () => true,
    getRowByIndex: () => row, getGridRowByIndex: () => displayed,
    fields: { rowId: 'id' }, commitGridChanges,
  }));
  result.current.handleBeforeAutofill({ detail: { mapping: { 0: { s2_spec: { rowIndex: 0, colProp: 's1_spec' } } } } });
  result.current.handleAfterEdit({ detail: { newRange: { x: 1, y: 0 }, oldRange: { x: 0, y: 0 }, data: { 0: { s2_spec: 'nm' } } } });
  expect(commitGridChanges).toHaveBeenCalledWith(expect.objectContaining({
    mappingUpdates: [{ rowId: 'r', columnId: 's2_spec', value: { value: 'nm', valueIdentifier: 'http://qudt.org/vocab/unit/NanoM' } }],
  }));
});
