import { useCallback } from 'react';
import { normalizeCellValue } from '../model/gridTransactions';

export default function useGridClipboardHandlers({
    showDebug = false,
    staticColumns,
    isEditableColumn,
    getRowByIndex,
    fields,
    commitGridChanges,
    handleClearCell
}) {
    const DBG = !!showDebug;

    const handlePasteRegion = useCallback((event) => {
        if (DBG) console.log('[DataGrid] handlePasteRegion - letting RevoGrid handle paste internally:', event.detail);
    }, [DBG]);

    const handleClipboardRangePaste = useCallback((event) => {
        if (DBG) console.log('[DataGrid] handleClipboardRangePaste:', event.detail);

        const { data, range } = event.detail;
        if (!data || !range) {
            if (DBG) console.log('[DataGrid] No valid clipboard paste data');
            return;
        }

        try {
            const updates = [];
            const rowDataUpdates = [];

            if (DBG) {
                console.log('[DataGrid] Processing clipboard data:', {
                    dataKeys: Object.keys(data),
                    sampleRow: data[Object.keys(data)[0]]
                });
            }

            for (const [rowIndexStr, rowDataObj] of Object.entries(data)) {
                const rowIndex = parseInt(rowIndexStr, 10);
                const row = getRowByIndex(rowIndex);
                if (!row) {
                    if (DBG) console.log('[DataGrid] Row not found for index:', rowIndex);
                    continue;
                }

                for (const [columnProp, value] of Object.entries(rowDataObj)) {
                    const stringValue = normalizeCellValue(value);
                    const isStaticColumn = staticColumns.some((col) => col.prop === columnProp);
                    const staticColumn = staticColumns.find((col) => col.prop === columnProp);

                    if (staticColumn?.readonly) continue;

                    if (isStaticColumn) {
                        rowDataUpdates.push({
                            rowId: row[fields.rowId],
                            columnProp,
                            value: stringValue
                        });
                    } else if (isEditableColumn(columnProp)) {
                        updates.push({
                            rowId: row[fields.rowId],
                            columnId: columnProp,
                            value: stringValue
                        });
                    }
                }
            }

            commitGridChanges({
                rowDataUpdates,
                mappingUpdates: updates,
                reason: 'clipboard-paste'
            });

            if (DBG) {
                console.log('[DataGrid] Clipboard paste operation completed:', {
                    processedRows: Object.keys(data).length,
                    rowUpdates: rowDataUpdates.length,
                    mappingUpdates: updates.length
                });
            }
        } catch (error) {
            if (DBG) console.error('[DataGrid] Error in clipboard paste operation:', error);
        }
    }, [staticColumns, isEditableColumn, getRowByIndex, fields, commitGridChanges, DBG]);

    const handleClearRegion = useCallback((event) => {
        if (DBG) console.log('[DataGrid] handleClearRegion - delegating to handleClearCell:', event.detail);
        handleClearCell(event);
    }, [handleClearCell, DBG]);

    return {
        handlePasteRegion,
        handleClipboardRangePaste,
        handleClearRegion
    };
}

