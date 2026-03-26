import { useCallback, useEffect } from 'react';

export default function useGridInputHandlers({
    isActive,
    gridRef,
    editSessionRef,
    clearEditSession,
    getEditableElementCurrentValue,
    isTextUndoCapableEditor,
    handleClearCell,
    handleClipboardCopyShortcut,
    handleClipboardPasteShortcut,
    enableClipboardFallback = false,
    undo,
    redo
}) {
    const isEditableInputElement = useCallback((element) => {
        if (!element) return false;
        return (
            element.tagName === 'INPUT' ||
            element.tagName === 'SELECT' ||
            element.tagName === 'TEXTAREA' ||
            element.isContentEditable === true ||
            element.closest?.('[contenteditable]') ||
            element.hasAttribute?.('contenteditable')
        );
    }, []);

    const isLikelyRevoGridEditorElement = useCallback((element) => {
        if (!element) return false;
        return Boolean(
            element.closest?.('.edit-input-wrapper') ||
            element.closest?.('revogr-edit')
        );
    }, []);

    const isEventFromThisGrid = useCallback((event) => {
        const gridElement = gridRef.current;
        if (!gridElement) return false;

        if (typeof event.composedPath === 'function') {
            const path = event.composedPath();
            if (Array.isArray(path) && path.includes(gridElement)) {
                return true;
            }
        }

        const target = event.target;
        return target instanceof Node ? gridElement.contains(target) : false;
    }, [gridRef]);

    const isGridCurrentlyFocused = useCallback(() => {
        const gridElement = gridRef.current;
        if (!gridElement) return false;

        const activeElement = document.activeElement;
        if (activeElement && (activeElement === gridElement || gridElement.contains(activeElement))) {
            return true;
        }

        // RevoGrid renders internals in shadow DOM; check focused markers there as well.
        const shadowRoot = gridElement.shadowRoot;
        if (shadowRoot) {
            const shadowActiveElement = shadowRoot.activeElement;
            if (shadowActiveElement) {
                return true;
            }

            if (shadowRoot.querySelector(
                '[data-rgrow][data-rgcol].focused-cell, [data-rgrow][data-rgcol].focused, [data-rgrow][data-rgcol].selected, [data-rgrow][data-rgcol][tabindex="0"]'
            )) {
                return true;
            }
        }

        return Boolean(
            gridElement.querySelector(
                '[data-rgrow][data-rgcol].focused-cell, [data-rgrow][data-rgcol].focused, [data-rgrow][data-rgcol].selected, [data-rgrow][data-rgcol][tabindex="0"]'
            )
        );
    }, [gridRef]);

    const handleShortcutKeyDown = useCallback((event, { forceGridContext = false } = {}) => {
        const hasModifier = event.ctrlKey || event.metaKey;
        const key = String(event.key || '').toLowerCase();
        const code = String(event.code || '');
        const isUndo = hasModifier && key === 'z' && !event.shiftKey;
        const isRedo = hasModifier && (key === 'y' || (key === 'z' && event.shiftKey));
        const isCopy = hasModifier && (key === 'c' || code === 'KeyC');
        const isPaste = hasModifier && (key === 'v' || code === 'KeyV');
        const isDelete = event.key === 'Delete' || event.key === 'Backspace';
        const isEscape = event.key === 'Escape';
        const hasActiveEditSession = Boolean(editSessionRef.current);
        const activeElement = document.activeElement;
        const targetElement = event.target instanceof Element ? event.target : null;
        const editingElement = (
            (targetElement && isEditableInputElement(targetElement) && targetElement)
            || (activeElement && isEditableInputElement(activeElement) && activeElement)
            || null
        );
        const isEditingCell = Boolean(editingElement);
        const isLikelyRevoGridEditor = isLikelyRevoGridEditorElement(editingElement);

        if (!forceGridContext && !isEventFromThisGrid(event) && !isGridCurrentlyFocused()) {
            // RevoGrid can place active editors outside the grid DOM (portal-like behavior),
            // so keep undo/redo shortcuts active while an edit session is open
            // or focus is inside a known RevoGrid editor wrapper.
            if (!((isUndo || isRedo) && (hasActiveEditSession || isLikelyRevoGridEditor))) {
                return false;
            }
        }

        if (event.repeat && (isUndo || isRedo)) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            return true;
        }

        if (isEscape) {
            clearEditSession();
            return false;
        }

        if (isUndo || isRedo) {
            if (isEditingCell) {
                const initialValue = editSessionRef.current?.initialValue;
                const currentValue = getEditableElementCurrentValue(editingElement);
                const canUseNativeUndo = isTextUndoCapableEditor(editingElement);
                const hasEditorChanges = (
                    currentValue !== undefined &&
                    initialValue !== undefined &&
                    currentValue !== initialValue
                );

                if (canUseNativeUndo && hasEditorChanges) {
                    return false;
                }
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            clearEditSession();
            if (isUndo) {
                undo();
            } else {
                redo();
            }
            return true;
        }

        if (enableClipboardFallback && !isEditingCell && (isCopy || isPaste)) {
            const action = isCopy ? handleClipboardCopyShortcut : handleClipboardPasteShortcut;
            if (typeof action === 'function') {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                void action();
                return true;
            }
        }

        if (isDelete && !isEditingCell) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            void handleClearCell();
            return true;
        }

        return false;
    }, [
        editSessionRef,
        isEventFromThisGrid,
        isGridCurrentlyFocused,
        isEditableInputElement,
        isLikelyRevoGridEditorElement,
        getEditableElementCurrentValue,
        isTextUndoCapableEditor,
        enableClipboardFallback,
        handleClipboardCopyShortcut,
        handleClipboardPasteShortcut,
        clearEditSession,
        undo,
        redo,
        handleClearCell
    ]);

    const handleBeforeKeyDown = useCallback((gridEvent) => {
        if (!isActive) return;

        const originalEvent = gridEvent?.detail?.original;
        if (!originalEvent || typeof originalEvent !== 'object') {
            return;
        }

        const handled = handleShortcutKeyDown(originalEvent, { forceGridContext: true });
        if (handled) {
            gridEvent.preventDefault?.();
        }
    }, [isActive, handleShortcutKeyDown]);

    useEffect(() => {
        if (!isActive) return undefined;

        const handleKeyDown = (event) => {
            handleShortcutKeyDown(event);
        };

        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [
        isActive,
        handleShortcutKeyDown
    ]);

    useEffect(() => {
        if (!isActive) return undefined;

        const handleFocusOut = (event) => {
            if (!editSessionRef.current) return;
            const gridElement = gridRef.current;
            if (!gridElement) {
                clearEditSession();
                return;
            }

            const target = event.target;
            if (!(target instanceof Node) || !gridElement.contains(target)) return;

            const nextTarget = event.relatedTarget;
            if (nextTarget instanceof Node && gridElement.contains(nextTarget)) return;

            clearEditSession();
        };

        document.addEventListener('focusout', handleFocusOut, true);
        return () => document.removeEventListener('focusout', handleFocusOut, true);
    }, [isActive, clearEditSession, editSessionRef, gridRef]);

    return {
        handleBeforeKeyDown
    };
}
