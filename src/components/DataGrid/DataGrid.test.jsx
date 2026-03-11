import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DataGrid from './DataGrid';

let lastRevoProps;
const useDataGridMock = vi.fn();

vi.mock('@revolist/react-datagrid', async () => {
    const ReactModule = await import('react');
    return {
        RevoGrid: ReactModule.forwardRef((props, ref) => {
            lastRevoProps = props;
            return <div data-testid="revo-grid" ref={ref} />;
        })
    };
});

vi.mock('../../hooks/useDataGrid', () => ({
    useDataGrid: (...args) => useDataGridMock(...args)
}));

const baseStaticColumns = [
    { prop: 'measurementProtocolId', name: 'Measurement Protocol', readonly: false }
];

const createHookState = ({
    rows = [{ id: 'row-1', measurementProtocolId: '' }],
    mappings = [],
    isStandaloneGrid = true,
    isEditableColumn = () => false,
    fieldOverrides = {},
    columnDefs = baseStaticColumns
} = {}) => {
    const undo = vi.fn();
    const redo = vi.fn();
    const applyTransaction = vi.fn();

    return {
        gridData: rows,
        columnDefs,
        canUndo: true,
        canRedo: true,
        undo,
        redo,
        applyTransaction,
        isEditableColumn: vi.fn(isEditableColumn),
        getRowByIndex: (index) => rows[index],
        stats: {
            totalRows: rows.length,
            totalColumns: columnDefs.length,
            totalMappings: mappings.length,
            coverage: 0
        },
        mappings,
        isStandaloneGrid,
        fields: {
            rowId: 'id',
            mappingRowId: 'studyRunId',
            mappingColumnId: 'sensorId',
            mappingValue: 'value',
            ...fieldOverrides
        },
        rowData: rows
    };
};

const renderGrid = (props = {}) => {
    return render(
        <DataGrid
            title=""
            showControls={false}
            staticColumns={baseStaticColumns}
            rowData={[]}
            columnData={[]}
            mappings={[]}
            {...props}
        />
    );
};

describe('DataGrid', () => {
    beforeEach(() => {
        lastRevoProps = undefined;
        useDataGridMock.mockReset();
    });

    it('normalizes select payloads to scalar values for static row updates', () => {
        const hookState = createHookState({
            rows: [{ id: 'row-1', measurementProtocolId: '' }]
        });
        useDataGridMock.mockReturnValue(hookState);

        renderGrid();

        lastRevoProps.onAfteredit({
            detail: {
                prop: 'measurementProtocolId',
                rowIndex: 0,
                model: {
                    measurementProtocolId: { value: 'protocol-1', label: 'Protocol 1' }
                }
            }
        });

        expect(hookState.applyTransaction).toHaveBeenCalledTimes(1);
        const transaction = hookState.applyTransaction.mock.calls[0][0];
        expect(transaction.nextRowData[0].measurementProtocolId).toBe('protocol-1');
    });

    it('skips no-op dropdown reselection updates', () => {
        const hookState = createHookState({
            rows: [{ id: 'row-1', measurementProtocolId: 'protocol-1' }]
        });
        useDataGridMock.mockReturnValue(hookState);

        renderGrid();

        lastRevoProps.onAfteredit({
            detail: {
                prop: 'measurementProtocolId',
                rowIndex: 0,
                model: {
                    measurementProtocolId: { value: 'protocol-1', label: 'Protocol 1' }
                }
            }
        });

        expect(hookState.applyTransaction).not.toHaveBeenCalled();
    });

    it('lets editor-level undo run when input value changed in active edit session', () => {
        const hookState = createHookState({
            rows: [{ id: 'row-1', measurementProtocolId: 'protocol-1' }]
        });
        useDataGridMock.mockReturnValue(hookState);

        renderGrid();

        const grid = screen.getByTestId('revo-grid');
        const input = document.createElement('input');
        input.value = 'changed';
        grid.appendChild(input);
        input.focus();

        lastRevoProps.onBeforeedit({
            detail: {
                prop: 'measurementProtocolId',
                rowIndex: 0,
                value: 'protocol-1',
                model: { measurementProtocolId: 'protocol-1' }
            },
            preventDefault: vi.fn()
        });

        fireEvent.keyDown(input, { key: 'z', ctrlKey: true });
        expect(hookState.undo).not.toHaveBeenCalled();
    });

    it('routes Ctrl+Z to grid undo when active editor is untouched', () => {
        const hookState = createHookState({
            rows: [{ id: 'row-1', measurementProtocolId: '' }]
        });
        useDataGridMock.mockReturnValue(hookState);

        renderGrid();

        const grid = screen.getByTestId('revo-grid');
        const input = document.createElement('input');
        input.value = '';
        grid.appendChild(input);
        input.focus();

        lastRevoProps.onBeforeedit({
            detail: {
                prop: 'measurementProtocolId',
                rowIndex: 0,
                value: '',
                model: { measurementProtocolId: '' }
            },
            preventDefault: vi.fn()
        });

        fireEvent.keyDown(input, { key: 'z', ctrlKey: true });
        expect(hookState.undo).toHaveBeenCalledTimes(1);
    });

    it('routes Ctrl+Z to grid undo when editor is outside grid DOM but edit session is active', () => {
        const hookState = createHookState({
            rows: [{ id: 'row-1', measurementProtocolId: '' }]
        });
        useDataGridMock.mockReturnValue(hookState);

        renderGrid();

        const externalInput = document.createElement('input');
        externalInput.value = '';
        document.body.appendChild(externalInput);
        externalInput.focus();

        lastRevoProps.onBeforeedit({
            detail: {
                prop: 'measurementProtocolId',
                rowIndex: 0,
                value: '',
                model: { measurementProtocolId: '' }
            },
            preventDefault: vi.fn()
        });

        fireEvent.keyDown(externalInput, { key: 'z', ctrlKey: true });
        expect(hookState.undo).toHaveBeenCalledTimes(1);

        externalInput.remove();
    });

    it('routes Ctrl+Z to grid undo when RevoGrid editor wrapper is outside grid and no edit session is active', () => {
        const hookState = createHookState({
            rows: [{ id: 'row-1', measurementProtocolId: '' }]
        });
        useDataGridMock.mockReturnValue(hookState);

        renderGrid();

        const wrapper = document.createElement('div');
        wrapper.className = 'edit-input-wrapper';
        const externalInput = document.createElement('input');
        externalInput.value = '';
        wrapper.appendChild(externalInput);
        document.body.appendChild(wrapper);
        externalInput.focus();

        fireEvent.keyDown(externalInput, { key: 'z', ctrlKey: true });
        expect(hookState.undo).toHaveBeenCalledTimes(1);

        wrapper.remove();
    });

    it('routes Ctrl+Z to grid undo when grid focus marker exists but event target is outside grid', () => {
        const hookState = createHookState({
            rows: [{ id: 'row-1', measurementProtocolId: '' }]
        });
        useDataGridMock.mockReturnValue(hookState);

        renderGrid();

        const grid = screen.getByTestId('revo-grid');
        const focusedCellMarker = document.createElement('div');
        focusedCellMarker.setAttribute('data-rgrow', '0');
        focusedCellMarker.setAttribute('data-rgcol', '0');
        focusedCellMarker.className = 'focused-cell';
        grid.appendChild(focusedCellMarker);

        fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
        expect(hookState.undo).toHaveBeenCalledTimes(1);
    });

    it('routes Ctrl+Z to grid undo from RevoGrid beforekeydown event', () => {
        const hookState = createHookState({
            rows: [{ id: 'row-1', measurementProtocolId: '' }]
        });
        useDataGridMock.mockReturnValue(hookState);

        renderGrid();

        const originalEvent = {
            key: 'z',
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
            repeat: false,
            target: document.body,
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
            stopImmediatePropagation: vi.fn()
        };
        const beforeKeyDownEvent = {
            detail: { original: originalEvent },
            preventDefault: vi.fn()
        };

        lastRevoProps.onBeforekeydown(beforeKeyDownEvent);

        expect(originalEvent.preventDefault).toHaveBeenCalledTimes(1);
        expect(beforeKeyDownEvent.preventDefault).toHaveBeenCalledTimes(1);
        expect(hookState.undo).toHaveBeenCalledTimes(1);
    });

    it('routes Ctrl+Z to grid undo for select editors even when value changed', () => {
        const hookState = createHookState({
            rows: [{ id: 'row-1', measurementProtocolId: 'protocol-1' }]
        });
        useDataGridMock.mockReturnValue(hookState);

        renderGrid();

        const grid = screen.getByTestId('revo-grid');
        const select = document.createElement('select');
        select.innerHTML = `
            <option value="protocol-1">Protocol 1</option>
            <option value="protocol-2">Protocol 2</option>
        `;
        select.value = 'protocol-2';
        grid.appendChild(select);
        select.focus();

        lastRevoProps.onBeforeedit({
            detail: {
                prop: 'measurementProtocolId',
                rowIndex: 0,
                value: 'protocol-1',
                model: { measurementProtocolId: 'protocol-1' }
            },
            preventDefault: vi.fn()
        });

        fireEvent.keyDown(select, { key: 'z', ctrlKey: true });
        expect(hookState.undo).toHaveBeenCalledTimes(1);
    });

    it('updates child mapping spec values while preserving existing unit', () => {
        const hookState = createHookState({
            rows: [{ id: 'row-1', name: 'Row 1' }],
            mappings: [{
                studyRunId: 'row-1',
                sensorId: 'sensor-1',
                value: { specification: 'old-spec', unit: 'Hz' }
            }],
            isStandaloneGrid: false,
            isEditableColumn: (columnProp) => columnProp === 'sensor-1_spec' || columnProp === 'sensor-1_unit',
            fieldOverrides: { hasChildColumns: true }
        });
        useDataGridMock.mockReturnValue(hookState);

        renderGrid();

        lastRevoProps.onAfteredit({
            detail: {
                prop: 'sensor-1_spec',
                rowIndex: 0,
                val: 'new-spec',
                model: { 'sensor-1_spec': 'new-spec' }
            }
        });

        expect(hookState.applyTransaction).toHaveBeenCalledTimes(1);
        const transaction = hookState.applyTransaction.mock.calls[0][0];
        expect(transaction.reason).toBe('mapping-cell-edit');
        expect(transaction.notifyRowData).toBe(false);
        expect(transaction.nextMappings).toEqual([
            {
                studyRunId: 'row-1',
                sensorId: 'sensor-1',
                value: ['new-spec', 'Hz']
            }
        ]);
    });

    it('skips no-op child mapping updates when value is unchanged', () => {
        const hookState = createHookState({
            rows: [{ id: 'row-1', name: 'Row 1' }],
            mappings: [{
                studyRunId: 'row-1',
                sensorId: 'sensor-1',
                value: ['spec-a', 'unit-a']
            }],
            isStandaloneGrid: false,
            isEditableColumn: (columnProp) => columnProp === 'sensor-1_spec' || columnProp === 'sensor-1_unit',
            fieldOverrides: { hasChildColumns: true }
        });
        useDataGridMock.mockReturnValue(hookState);

        renderGrid();

        lastRevoProps.onAfteredit({
            detail: {
                prop: 'sensor-1_unit',
                rowIndex: 0,
                val: 'unit-a',
                model: { 'sensor-1_unit': 'unit-a' }
            }
        });

        expect(hookState.applyTransaction).not.toHaveBeenCalled();
    });

    it('commits range edits atomically across row and mapping updates', () => {
        const hookState = createHookState({
            rows: [{ id: 'row-1', name: 'Old Name' }],
            mappings: [{
                studyRunId: 'row-1',
                sensorId: 'sensor-1',
                value: ['old-spec', 'old-unit']
            }],
            isStandaloneGrid: false,
            isEditableColumn: (columnProp) => columnProp === 'sensor-1_spec',
            fieldOverrides: { hasChildColumns: true }
        });
        useDataGridMock.mockReturnValue(hookState);

        renderGrid({
            staticColumns: [{ prop: 'name', name: 'Name', readonly: false }]
        });

        lastRevoProps.onAfteredit({
            detail: {
                newRange: { x: 0, y: 0, x1: 1, y1: 0 },
                data: {
                    0: {
                        name: 'New Name',
                        'sensor-1_spec': 'new-spec'
                    }
                }
            }
        });

        expect(hookState.applyTransaction).toHaveBeenCalledTimes(1);
        const transaction = hookState.applyTransaction.mock.calls[0][0];
        expect(transaction.reason).toBe('range-edit');
        expect(transaction.notifyRowData).toBe(true);
        expect(transaction.nextRowData[0].name).toBe('New Name');
        expect(transaction.nextMappings).toEqual([
            {
                studyRunId: 'row-1',
                sensorId: 'sensor-1',
                value: ['new-spec', 'old-unit']
            }
        ]);
    });
});
