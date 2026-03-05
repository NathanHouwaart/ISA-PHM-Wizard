import { useCallback, useRef, useState } from 'react';

export default function useExplorerController() {
    const [explorerOpen, setExplorerOpen] = useState(false);
    const resolverRef = useRef(null);

    const openExplorer = useCallback(() => (
        new Promise((resolve) => {
            resolverRef.current = resolve;
            setExplorerOpen(true);
        })
    ), []);

    const closeExplorer = useCallback(() => {
        setExplorerOpen(false);
    }, []);

    const resolveExplorerSelection = useCallback((value) => {
        if (resolverRef.current) {
            resolverRef.current(value);
            resolverRef.current = null;
        }
        setExplorerOpen(false);
    }, []);

    return {
        explorerOpen,
        setExplorerOpen,
        openExplorer,
        closeExplorer,
        resolveExplorerSelection,
    };
}
