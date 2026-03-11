import { useImperativeHandle } from 'react';

export default function useGridImperativeApi({
    ref,
    hookRowData,
    updateRowDataBatch
}) {
    useImperativeHandle(ref, () => ({
        addRow: (newRow) => {
            updateRowDataBatch([...(hookRowData || []), newRow]);
        },
        removeRow: (index) => {
            const newData = (hookRowData || []).filter((_, currentIndex) => currentIndex !== index);
            updateRowDataBatch(newData);
        },
        removeLastRow: () => {
            if ((hookRowData || []).length > 0) {
                const newData = hookRowData.slice(0, -1);
                updateRowDataBatch(newData);
            }
        },
        updateRowDataBatch,
        getCurrentData: () => hookRowData
    }), [hookRowData, updateRowDataBatch]);
}
