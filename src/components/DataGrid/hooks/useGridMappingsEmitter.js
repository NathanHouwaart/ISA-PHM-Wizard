import { useEffect, useRef } from 'react';

export default function useGridMappingsEmitter({
    mappings,
    onDataChange,
    fields: _fields
}) {
    // Initialize with the current mappings so the emitter does NOT fire on mount.
    // Firing on mount triggers the parent's onDataChange which (via mergeScopedMappings)
    // always creates a new array ref, defeating the reference-equality guard in
    // useMappingsController.setMappings and causing a Maximum-update-depth loop.
    const lastEmittedMappingsRef = useRef(mappings);

    useEffect(() => {
        if (!onDataChange) return;
        if (lastEmittedMappingsRef.current === mappings) {
            return;
        }
        lastEmittedMappingsRef.current = mappings;
        onDataChange(mappings);
    }, [mappings, onDataChange]);
}
