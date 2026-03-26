import { useCallback } from 'react';
import { normalizeCellValue } from '../model/gridTransactions';

export default function useGridClipboardHandlers({
    showDebug = false,
    gridRef,
    translateRangeCoordinates,
    getFlatColumns,
    staticColumns,
    isEditableColumn,
    canEditCell,
    getRowByIndex,
    fields,
    commitGridChanges,
    handleClearCell
}) {
    const DBG = !!showDebug;

    const handlePasteRegion = useCallback((event) => {
        if (DBG) console.log('[DataGrid] handlePasteRegion - letting RevoGrid handle paste internally:', event.detail);
    }, [DBG]);

    const parseClipboardText = useCallback((rawText) => {
        const text = typeof rawText === 'string' ? rawText : '';
        if (!text) return [];

        const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const rows = normalized.split('\n');
        if (rows.length > 0 && rows[rows.length - 1] === '') {
            rows.pop();
        }

        return rows.map((row) => row.split('\t'));
    }, []);

    const applyClipboardData = useCallback((data, range) => {
        if (!data || !range) {
            if (DBG) console.log('[DataGrid] No valid clipboard paste data');
            return false;
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
                    if (!canEditCell(row, columnProp)) continue;

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

            const didCommit = commitGridChanges({
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

            return didCommit;
        } catch (error) {
            if (DBG) console.error('[DataGrid] Error in clipboard paste operation:', error);
            return false;
        }
    }, [staticColumns, isEditableColumn, canEditCell, getRowByIndex, fields, commitGridChanges, DBG]);

    const handleClipboardRangePaste = useCallback((event) => {
        if (DBG) console.log('[DataGrid] handleClipboardRangePaste:', event.detail);

        const { data, range } = event.detail;
        applyClipboardData(data, range);
    }, [applyClipboardData, DBG]);

    const getTranslatedSelectedRange = useCallback(async () => {
        const gridElement = gridRef?.current;
        if (!gridElement || typeof gridElement.getSelectedRange !== 'function') {
            return null;
        }

        const selectedRange = await gridElement.getSelectedRange();
        if (!selectedRange) return null;

        if (typeof translateRangeCoordinates === 'function') {
            return translateRangeCoordinates(selectedRange);
        }
        return selectedRange;
    }, [gridRef, translateRangeCoordinates]);

    const handleClipboardPasteShortcut = useCallback(async () => {
        const clipboardApi = globalThis.navigator?.clipboard;
        if (!clipboardApi || typeof clipboardApi.readText !== 'function') {
            if (DBG) console.log('[DataGrid] Clipboard read API is not available for paste fallback');
            return false;
        }

        try {
            const translatedRange = await getTranslatedSelectedRange();
            if (!translatedRange) {
                if (DBG) console.log('[DataGrid] No selected range for paste fallback');
                return false;
            }

            const parsedRows = parseClipboardText(await clipboardApi.readText());
            if (parsedRows.length === 0) {
                if (DBG) console.log('[DataGrid] Clipboard was empty for paste fallback');
                return false;
            }

            const flatColumns = typeof getFlatColumns === 'function' ? getFlatColumns() : [];
            if (!Array.isArray(flatColumns) || flatColumns.length === 0) {
                if (DBG) console.log('[DataGrid] No flat columns available for paste fallback');
                return false;
            }

            const startRow = Math.min(translatedRange.y, translatedRange.y1 ?? translatedRange.y);
            const startCol = Math.min(translatedRange.x, translatedRange.x1 ?? translatedRange.x);

            const data = {};

            parsedRows.forEach((parsedRow, rowOffset) => {
                const rowIndex = startRow + rowOffset;
                const row = getRowByIndex(rowIndex);
                if (!row) return;

                const rowDataObj = {};
                parsedRow.forEach((value, colOffset) => {
                    const colIndex = startCol + colOffset;
                    const column = flatColumns[colIndex];
                    if (!column?.prop) return;
                    rowDataObj[column.prop] = value;
                });

                if (Object.keys(rowDataObj).length > 0) {
                    data[rowIndex] = rowDataObj;
                }
            });

            if (Object.keys(data).length === 0) {
                if (DBG) console.log('[DataGrid] No applicable cells found for paste fallback');
                return false;
            }

            return applyClipboardData(data, translatedRange);
        } catch (error) {
            if (DBG) console.error('[DataGrid] Clipboard paste fallback failed:', error);
            return false;
        }
    }, [
        DBG,
        getTranslatedSelectedRange,
        parseClipboardText,
        getFlatColumns,
        getRowByIndex,
        applyClipboardData
    ]);

    const handleClipboardCopyShortcut = useCallback(async () => {
        const clipboardApi = globalThis.navigator?.clipboard;
        if (!clipboardApi || typeof clipboardApi.writeText !== 'function') {
            if (DBG) console.log('[DataGrid] Clipboard write API is not available for copy fallback');
            return false;
        }

        const translatedRange = await getTranslatedSelectedRange();
        if (!translatedRange) {
            if (DBG) console.log('[DataGrid] No selected range for copy fallback');
            return false;
        }

        const flatColumns = typeof getFlatColumns === 'function' ? getFlatColumns() : [];
        if (!Array.isArray(flatColumns) || flatColumns.length === 0) {
            if (DBG) console.log('[DataGrid] No flat columns available for copy fallback');
            return false;
        }

        const gridElement = gridRef?.current;
        let sourceRows = null;
        if (gridElement && typeof gridElement.getSource === 'function') {
            try {
                sourceRows = await gridElement.getSource();
            } catch (error) {
                if (DBG) console.warn('[DataGrid] Failed to read RevoGrid source for copy fallback:', error);
            }
        }

        const startRow = Math.min(translatedRange.y, translatedRange.y1 ?? translatedRange.y);
        const endRow = Math.max(translatedRange.y, translatedRange.y1 ?? translatedRange.y);
        const startCol = Math.min(translatedRange.x, translatedRange.x1 ?? translatedRange.x);
        const endCol = Math.max(translatedRange.x, translatedRange.x1 ?? translatedRange.x);

        const lines = [];
        for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
            const sourceRow = Array.isArray(sourceRows) ? sourceRows[rowIndex] : undefined;
            const fallbackRow = getRowByIndex(rowIndex);
            if (!sourceRow && !fallbackRow) continue;

            const rowValues = [];
            for (let colIndex = startCol; colIndex <= endCol; colIndex += 1) {
                const column = flatColumns[colIndex];
                if (!column?.prop) {
                    rowValues.push('');
                    continue;
                }

                let rawValue = '';
                if (sourceRow && Object.prototype.hasOwnProperty.call(sourceRow, column.prop)) {
                    rawValue = sourceRow[column.prop];
                } else if (fallbackRow && Object.prototype.hasOwnProperty.call(fallbackRow, column.prop)) {
                    rawValue = fallbackRow[column.prop];
                }

                rowValues.push(normalizeCellValue(rawValue));
            }

            lines.push(rowValues.join('\t'));
        }

        if (lines.length === 0) {
            if (DBG) console.log('[DataGrid] No source rows to copy in fallback path');
            return false;
        }

        try {
            await clipboardApi.writeText(lines.join('\n'));
            return true;
        } catch (error) {
            if (DBG) console.error('[DataGrid] Clipboard copy fallback failed:', error);
            return false;
        }
    }, [DBG, getTranslatedSelectedRange, getFlatColumns, gridRef, getRowByIndex]);

    const handleClearRegion = useCallback((event) => {
        if (DBG) console.log('[DataGrid] handleClearRegion - delegating to handleClearCell:', event.detail);
        handleClearCell(event);
    }, [handleClearCell, DBG]);

    return {
        handlePasteRegion,
        handleClipboardRangePaste,
        handleClearRegion,
        handleClipboardPasteShortcut,
        handleClipboardCopyShortcut
    };
}

