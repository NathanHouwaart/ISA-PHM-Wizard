import { useCallback, useRef } from 'react';
import { normalizeCellValue } from '../model/gridTransactions';

export default function useGridEditSession({
    isStandaloneGrid,
    staticColumns,
    isEditableColumn,
    getRowByIndex,
    resolveEditValue,
    stableColumnDefsRef,
    fields,
    commitGridChanges,
    showDebug = false
}) {
    const DBG = !!showDebug;
    const editSessionRef = useRef(null);

    const clearEditSession = useCallback(() => {
        editSessionRef.current = null;
    }, []);

    const getEditableElementCurrentValue = useCallback((element) => {
        if (!element) return undefined;
        if (typeof element.value !== 'undefined') {
            return normalizeCellValue(element.value);
        }
        if (element.isContentEditable === true) {
            return normalizeCellValue(element.textContent ?? '');
        }
        const contentEditableAncestor = element.closest?.('[contenteditable=""], [contenteditable="true"], [contenteditable]');
        if (contentEditableAncestor) {
            return normalizeCellValue(contentEditableAncestor.textContent ?? '');
        }
        return undefined;
    }, []);

    const isTextUndoCapableEditor = useCallback((element) => {
        if (!element) return false;

        if (element.tagName === 'TEXTAREA') return true;

        if (element.tagName === 'INPUT') {
            const inputType = String(element.getAttribute('type') || 'text').toLowerCase();
            return [
                'text',
                'search',
                'url',
                'tel',
                'email',
                'password',
                'number'
            ].includes(inputType);
        }

        if (element.isContentEditable === true) return true;
        return Boolean(element.closest?.('[contenteditable]'));
    }, []);

    const handleBeforeEdit = useCallback((event) => {
        const detail = event.detail;
        let columnProp = detail.prop || detail.model?.prop || detail.column?.prop;

        if (!columnProp && detail.rgCol !== undefined) {
            const column = stableColumnDefsRef.current?.[detail.rgCol];
            columnProp = column?.prop;
        }

        const isStaticColumn = staticColumns.some((col) => col.prop === columnProp);
        const staticColumn = staticColumns.find((col) => col.prop === columnProp);

        const canEdit = isStandaloneGrid
            ? (isStaticColumn && !staticColumn?.readonly)
            : (isEditableColumn(columnProp) || (isStaticColumn && !staticColumn?.readonly));

        if (!canEdit) {
            event.preventDefault();
            return;
        }

        if (detail.model) {
            detail.model.allowEmpty = true;
        }

        if (detail.column) {
            detail.column.readonly = false;
            if (detail.column.validator) {
                detail.column.validator = () => true;
            }
        }

        const rowIndex = detail.rowIndex ?? detail.rgRow ?? detail.model?.y ?? detail.y;
        const row = getRowByIndex(rowIndex);
        const initialRawValue = resolveEditValue(detail, columnProp) ?? row?.[columnProp] ?? '';

        editSessionRef.current = {
            rowIndex,
            columnProp,
            initialValue: normalizeCellValue(initialRawValue)
        };
    }, [
        isStandaloneGrid,
        staticColumns,
        isEditableColumn,
        getRowByIndex,
        resolveEditValue,
        stableColumnDefsRef
    ]);

    const handleAfterEdit = useCallback((event) => {
        const detail = event.detail;
        if (DBG) console.log('[DataGrid] handleAfterEdit event detail:', detail);

        if (detail.newRange || detail.oldRange) {
            if (DBG) {
                console.log('[DataGrid] Processing range edit:', {
                    newRange: detail.newRange,
                    oldRange: detail.oldRange,
                    data: detail.data
                });
            }

            const { data, newRange } = detail;

            if (!data || !newRange) {
                if (DBG) console.log('[DataGrid] Missing data or newRange, aborting');
                clearEditSession();
                return;
            }

            const updates = [];
            const rowDataUpdates = [];

            if (DBG) console.log('[DataGrid] Processing range edit data directly by keys');

            for (const [rowIndexStr, rowDataObj] of Object.entries(data)) {
                const rowIndex = parseInt(rowIndexStr, 10);
                const row = getRowByIndex(rowIndex);

                if (!row) {
                    if (DBG) console.log('[DataGrid] Row not found for index:', rowIndex);
                    continue;
                }

                for (const [columnProp, newValue] of Object.entries(rowDataObj)) {
                    if (newValue === undefined || newValue === null) continue;

                    const isStaticColumn = staticColumns.some((col) => col.prop === columnProp);
                    const staticColumn = staticColumns.find((col) => col.prop === columnProp);
                    const isEditable = isEditableColumn(columnProp);

                    if (DBG) {
                        console.log(
                            `[DataGrid] Range edit - column: ${columnProp}, isStatic: ${isStaticColumn}, isEditable: ${isEditable}, readonly: ${staticColumn?.readonly}`
                        );
                    }

                    if (staticColumn?.readonly) {
                        if (DBG) console.log(`[DataGrid] Skipping ${columnProp} - readonly`);
                        continue;
                    }

                    if (!isEditable && !isStaticColumn) {
                        if (DBG) console.log(`[DataGrid] Skipping ${columnProp} - not editable and not static`);
                        continue;
                    }

                    const stringValue = normalizeCellValue(newValue);

                    if (isStaticColumn) {
                        rowDataUpdates.push({
                            rowId: row[fields.rowId],
                            columnProp,
                            value: stringValue
                        });
                    } else if (!isStandaloneGrid && isEditableColumn(columnProp)) {
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
                reason: 'range-edit'
            });
            clearEditSession();
            return;
        }

        if (DBG) console.log('[DataGrid] Processing single cell edit');
        const columnProp = detail.prop || detail.model?.prop || detail.column?.prop;
        let newValue = resolveEditValue(detail, columnProp);
        const rowIndex = detail.rowIndex ?? detail.rgRow ?? detail.model?.y ?? detail.y;

        if (DBG) {
            console.log('[DataGrid] Single cell edit details:', {
                columnProp,
                newValue,
                rowIndex,
                detailProps: Object.keys(detail)
            });
        }

        if (detail.val !== undefined && detail.val === '' && detail.value !== '') {
            newValue = detail.val;
        }

        const row = getRowByIndex(rowIndex);
        if (!row) {
            if (DBG) console.log('[DataGrid] Row not found for index:', rowIndex);
            clearEditSession();
            return;
        }

        const stringValue = normalizeCellValue(newValue);
        const isStaticColumn = staticColumns.some((col) => col.prop === columnProp);

        if (isStaticColumn) {
            commitGridChanges({
                rowDataUpdates: [{
                    rowId: row[fields.rowId],
                    columnProp,
                    value: stringValue
                }],
                reason: 'row-cell-edit'
            });
        } else if (isEditableColumn(columnProp)) {
            commitGridChanges({
                mappingUpdates: [{
                    rowId: row[fields.rowId],
                    columnId: columnProp,
                    value: stringValue
                }],
                reason: 'mapping-cell-edit'
            });
        }
        clearEditSession();
    }, [
        staticColumns,
        isStandaloneGrid,
        isEditableColumn,
        getRowByIndex,
        fields,
        commitGridChanges,
        resolveEditValue,
        clearEditSession,
        DBG
    ]);

    const handleBeforeRangeEdit = useCallback((event) => {
        const detail = event.detail;
        if (DBG) console.log('[DataGrid] handleBeforeRangeEdit event detail:', detail);
    }, [DBG]);

    const handleAfterRangeEdit = useCallback((event) => {
        handleAfterEdit(event);
    }, [handleAfterEdit]);

    return {
        editSessionRef,
        clearEditSession,
        getEditableElementCurrentValue,
        isTextUndoCapableEditor,
        handleBeforeEdit,
        handleAfterEdit,
        handleBeforeRangeEdit,
        handleAfterRangeEdit
    };
}

