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
    mappings = []
} = {}) => {
    const undo = vi.fn();
    const redo = vi.fn();
    const applyTransaction = vi.fn();

    return {
        gridData: rows,
        columnDefs: baseStaticColumns,
        canUndo: true,
        canRedo: true,
        undo,
        redo,
        applyTransaction,
        isEditableColumn: vi.fn(() => false),
        getRowByIndex: (index) => rows[index],
        stats: {
            totalRows: rows.length,
            totalColumns: 1,
            totalMappings: mappings.length,
            coverage: 0
        },
        mappings,
        isStandaloneGrid: true,
        fields: {
            rowId: 'id',
            mappingRowId: 'studyRunId',
            mappingColumnId: 'sensorId',
            mappingValue: 'value'
        },
        rowData: rows
    };
};

const renderGrid = () => {
    return render(
        <DataGrid
            title=""
            showControls={false}
            staticColumns={baseStaticColumns}
            rowData={[]}
            columnData={[]}
            mappings={[]}
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
});
