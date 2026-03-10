import { useCallback, useMemo } from 'react';

export default function useGridControlsApi({
    gridRef,
    getFlatColumns,
    hookRowData,
    fields,
    updateMappingsBatch,
    showDebug = false
}) {
    const handleDebugSelection = useCallback(async () => {
        const grid = gridRef.current;
        if (!grid || typeof grid.getSelectedRange !== 'function') {
            return;
        }

        try {
            const selection = await grid.getSelectedRange();
            console.log('[DataGrid] Current selection:', selection);
            const flatCols = getFlatColumns();
            console.log('[DataGrid] Flat columns:', flatCols.map((column, index) => ({
                index,
                prop: column.prop,
                pin: column.pin
            })));
        } catch (error) {
            console.error('[DataGrid] Error getting selection:', error);
        }
    }, [gridRef, getFlatColumns]);

    const pluginApi = useMemo(() => ({
        gridRef,
        getFlatColumns,
        hookRowData,
        fields,
        updateMappingsBatch,
        showDebug
    }), [gridRef, getFlatColumns, hookRowData, fields, updateMappingsBatch, showDebug]);

    return {
        handleDebugSelection,
        pluginApi
    };
}
