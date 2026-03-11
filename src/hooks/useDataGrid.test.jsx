import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDataGrid } from './useDataGrid';

const fieldMappings = {
  rowId: 'id',
  rowName: 'name',
  columnId: 'id',
  columnName: 'alias',
  mappingRowId: 'targetId',
  mappingColumnId: 'sourceId',
  mappingValue: 'value',
  hasChildColumns: true
};

const baseRows = [{ id: 'p1', name: 'Parameter 1', description: '' }];
const baseColumns = [{ id: 's1', alias: 'Sensor 1' }];
const baseMappings = [{ targetId: 'p1', sourceId: 's1', value: ['old-spec', 'old-unit'] }];

describe('useDataGrid history model', () => {
  it('commits one atomic snapshot and undoes/redoes row+mapping updates together', () => {
    const { result } = renderHook(() =>
      useDataGrid({
        rowData: baseRows,
        columnData: baseColumns,
        mappings: baseMappings,
        fieldMappings
      })
    );

    expect(result.current.historyIndex).toBe(0);
    expect(result.current.history).toHaveLength(1);
    expect(result.current.gridData[0].s1_spec).toBe('old-spec');
    expect(result.current.gridData[0].s1_unit).toBe('old-unit');

    act(() => {
      result.current.applyTransaction({
        nextRowData: [{ id: 'p1', name: 'Parameter 1 edited', description: '' }],
        nextMappings: [{ targetId: 'p1', sourceId: 's1', value: ['new-spec', 'new-unit'] }],
        reason: 'test-atomic',
        notifyRowData: true
      });
    });

    expect(result.current.historyIndex).toBe(1);
    expect(result.current.history).toHaveLength(2);
    expect(result.current.rowData[0].name).toBe('Parameter 1 edited');
    expect(result.current.gridData[0].s1_spec).toBe('new-spec');
    expect(result.current.gridData[0].s1_unit).toBe('new-unit');

    act(() => {
      result.current.undo();
    });

    expect(result.current.historyIndex).toBe(0);
    expect(result.current.rowData[0].name).toBe('Parameter 1');
    expect(result.current.gridData[0].s1_spec).toBe('old-spec');
    expect(result.current.gridData[0].s1_unit).toBe('old-unit');

    act(() => {
      result.current.redo();
    });

    expect(result.current.historyIndex).toBe(1);
    expect(result.current.rowData[0].name).toBe('Parameter 1 edited');
    expect(result.current.gridData[0].s1_spec).toBe('new-spec');
    expect(result.current.gridData[0].s1_unit).toBe('new-unit');
  });

  it('does not create a new history entry for semantically equal mapping prop echoes', () => {
    const { result, rerender } = renderHook(
      ({ mappings }) =>
        useDataGrid({
          rowData: baseRows,
          columnData: baseColumns,
          mappings,
          fieldMappings
        }),
      {
        initialProps: {
          mappings: [{ targetId: 'p1', sourceId: 's1', value: 'A' }]
        }
      }
    );

    expect(result.current.history).toHaveLength(1);
    expect(result.current.historyIndex).toBe(0);

    act(() => {
      rerender({
        mappings: [{ targetId: 'p1', sourceId: 's1', value: 'A', protocolId: 'proto-1' }]
      });
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.historyIndex).toBe(0);
  });

  it('does not create history entries for no-op row-data transactions', () => {
    const rows = [{ id: 'study-1', name: 'Study 1', measurementProtocolId: 'proto-a' }];

    const { result } = renderHook(() =>
      useDataGrid({
        rowData: rows,
        columnData: [],
        mappings: [],
        fieldMappings: {
          rowId: 'id',
          rowName: 'name'
        }
      })
    );

    expect(result.current.history).toHaveLength(1);
    expect(result.current.historyIndex).toBe(0);

    act(() => {
      result.current.applyTransaction({
        nextRowData: [{ id: 'study-1', name: 'Study 1', measurementProtocolId: 'proto-a' }],
        nextMappings: [],
        reason: 'noop-row',
        notifyRowData: true
      });
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.historyIndex).toBe(0);
  });

  it('adds external row-data updates to history and supports undo/redo', () => {
    const emptyColumns = [];
    const emptyMappings = [];

    const { result, rerender } = renderHook(
      ({ rows }) =>
        useDataGrid({
          rowData: rows,
          columnData: emptyColumns,
          mappings: emptyMappings,
          fieldMappings: {
            rowId: 'id',
            rowName: 'name'
          }
        }),
      {
        initialProps: {
          rows: [{ id: 'r1', name: 'Row 1' }]
        }
      }
    );

    expect(result.current.history).toHaveLength(1);
    expect(result.current.historyIndex).toBe(0);
    expect(result.current.rowData).toHaveLength(1);

    act(() => {
      rerender({
        rows: [
          { id: 'r1', name: 'Row 1' },
          { id: 'r2', name: 'Row 2' }
        ]
      });
    });

    expect(result.current.history).toHaveLength(2);
    expect(result.current.historyIndex).toBe(1);
    expect(result.current.rowData).toHaveLength(2);

    act(() => {
      result.current.undo();
    });

    expect(result.current.historyIndex).toBe(0);
    expect(result.current.rowData).toHaveLength(1);

    act(() => {
      result.current.redo();
    });

    expect(result.current.historyIndex).toBe(1);
    expect(result.current.rowData).toHaveLength(2);
  });

  it('resets history when historyScopeKey changes', () => {
    const { result, rerender } = renderHook(
      ({ scope }) =>
        useDataGrid({
          rowData: baseRows,
          columnData: baseColumns,
          mappings: baseMappings,
          fieldMappings,
          historyScopeKey: scope
        }),
      {
        initialProps: { scope: 'measurement-protocol:p1' }
      }
    );

    act(() => {
      result.current.applyTransaction({
        nextRowData: [{ id: 'p1', name: 'Changed in p1', description: '' }],
        nextMappings: [{ targetId: 'p1', sourceId: 's1', value: ['changed', 'Hz'] }],
        reason: 'edit-in-scope',
        notifyRowData: true
      });
    });

    expect(result.current.historyIndex).toBe(1);
    expect(result.current.history).toHaveLength(2);

    act(() => {
      rerender({ scope: 'measurement-protocol:p2' });
    });

    expect(result.current.historyIndex).toBe(0);
    expect(result.current.history).toHaveLength(1);
    expect(result.current.rowData[0].name).toBe('Parameter 1');
    expect(result.current.gridData[0].s1_spec).toBe('old-spec');
  });

  it('notifies parent row callback only for row-data changes', () => {
    const onRowDataChange = vi.fn();

    const { result } = renderHook(() =>
      useDataGrid({
        rowData: baseRows,
        columnData: baseColumns,
        mappings: baseMappings,
        fieldMappings,
        onRowDataChange
      })
    );

    act(() => {
      result.current.applyTransaction({
        nextRowData: baseRows,
        nextMappings: [{ targetId: 'p1', sourceId: 's1', value: ['mapping-only', 'u'] }],
        reason: 'mapping-only',
        notifyRowData: false
      });
    });

    expect(onRowDataChange).toHaveBeenCalledTimes(0);

    act(() => {
      result.current.applyTransaction({
        nextRowData: [{ id: 'p1', name: 'Row changed', description: '' }],
        nextMappings: [{ targetId: 'p1', sourceId: 's1', value: ['mapping-only', 'u'] }],
        reason: 'row-change',
        notifyRowData: true
      });
    });

    expect(onRowDataChange).toHaveBeenCalledTimes(1);
    expect(onRowDataChange).toHaveBeenCalledWith([
      { id: 'p1', name: 'Row changed', description: '' }
    ]);
  });

  it('clears mapping values with clearAllMappings and keeps row callbacks silent', () => {
    const onRowDataChange = vi.fn();

    const { result } = renderHook(() =>
      useDataGrid({
        rowData: baseRows,
        columnData: baseColumns,
        mappings: baseMappings,
        fieldMappings,
        onRowDataChange
      })
    );

    expect(result.current.mappings[0].value).toEqual(['old-spec', 'old-unit']);
    expect(result.current.historyIndex).toBe(0);

    act(() => {
      result.current.clearAllMappings();
    });

    expect(result.current.historyIndex).toBe(1);
    expect(result.current.mappings[0].value).toBe('');
    expect(result.current.rowData[0].name).toBe('Parameter 1');
    expect(onRowDataChange).not.toHaveBeenCalled();

    act(() => {
      result.current.undo();
    });
    expect(result.current.mappings[0].value).toEqual(['old-spec', 'old-unit']);

    act(() => {
      result.current.redo();
    });
    expect(result.current.mappings[0].value).toBe('');
  });

  it('prunes mappings that reference missing rows or columns', () => {
    const { result } = renderHook(() =>
      useDataGrid({
        rowData: [{ id: 'p1', name: 'Parameter 1' }],
        columnData: [{ id: 's1', alias: 'Sensor 1' }],
        mappings: [
          { targetId: 'p1', sourceId: 's1', value: ['ok', 'unit'] },
          { targetId: 'missing-row', sourceId: 's1', value: ['bad', 'unit'] },
          { targetId: 'p1', sourceId: 'missing-col', value: ['bad', 'unit'] }
        ],
        fieldMappings
      })
    );

    expect(result.current.mappings).toHaveLength(1);
    expect(result.current.mappings[0]).toEqual({
      targetId: 'p1',
      sourceId: 's1',
      value: ['ok', 'unit']
    });
  });

  it('projects object and string mapping values to child columns consistently', () => {
    const { result, rerender } = renderHook(
      ({ mappings }) =>
        useDataGrid({
          rowData: baseRows,
          columnData: baseColumns,
          mappings,
          fieldMappings
        }),
      {
        initialProps: {
          mappings: [{ targetId: 'p1', sourceId: 's1', value: { specification: 'obj-spec', unit: 'obj-unit' } }]
        }
      }
    );

    expect(result.current.gridData[0].s1_spec).toBe('obj-spec');
    expect(result.current.gridData[0].s1_unit).toBe('obj-unit');

    act(() => {
      rerender({
        mappings: [{ targetId: 'p1', sourceId: 's1', value: 'str-spec;str-unit' }]
      });
    });

    expect(result.current.gridData[0].s1_spec).toBe('str-spec');
    expect(result.current.gridData[0].s1_unit).toBe('str-unit');
  });
});
