import { useCallback, useEffect, useRef } from 'react';

export default function useGridMappingsEmitter({
    mappings,
    onDataChange,
    fields
}) {
    const lastEmittedMappingsSignatureRef = useRef('');

    const getMappingsSignature = useCallback((mappingsList) => (
        JSON.stringify(
            (Array.isArray(mappingsList) ? mappingsList : [])
                .map((mapping) => ({
                    row: String(mapping?.[fields.mappingRowId] ?? ''),
                    col: String(mapping?.[fields.mappingColumnId] ?? ''),
                    value: JSON.stringify(mapping?.[fields.mappingValue] ?? '')
                }))
                .sort((a, b) => {
                    if (a.row !== b.row) return a.row.localeCompare(b.row);
                    if (a.col !== b.col) return a.col.localeCompare(b.col);
                    return a.value.localeCompare(b.value);
                })
        )
    ), [fields.mappingRowId, fields.mappingColumnId, fields.mappingValue]);

    useEffect(() => {
        if (!onDataChange) return;
        const signature = getMappingsSignature(mappings);
        if (signature === lastEmittedMappingsSignatureRef.current) {
            return;
        }
        lastEmittedMappingsSignatureRef.current = signature;
        onDataChange(mappings);
    }, [mappings, onDataChange, getMappingsSignature]);
}
