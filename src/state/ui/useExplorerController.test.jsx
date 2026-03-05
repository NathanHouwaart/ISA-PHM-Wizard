import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import useExplorerController from './useExplorerController';

describe('useExplorerController', () => {
    it('opens explorer and resolves selection promise', async () => {
        const { result } = renderHook(() => useExplorerController());

        let pendingPromise;
        act(() => {
            pendingPromise = result.current.openExplorer();
        });

        expect(result.current.explorerOpen).toBe(true);

        act(() => {
            result.current.resolveExplorerSelection({ path: 'selected-file' });
        });

        await expect(pendingPromise).resolves.toEqual({ path: 'selected-file' });
        expect(result.current.explorerOpen).toBe(false);
    });

    it('closes explorer without rejecting pending state', () => {
        const { result } = renderHook(() => useExplorerController());

        act(() => {
            result.current.openExplorer();
        });
        expect(result.current.explorerOpen).toBe(true);

        act(() => {
            result.current.closeExplorer();
        });

        expect(result.current.explorerOpen).toBe(false);
    });
});
