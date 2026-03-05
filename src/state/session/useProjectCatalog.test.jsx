import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useProjectCatalog from './useProjectCatalog';
import { DEFAULT_PROJECT_ID, MULTI_RUN_EXAMPLE_PROJECT_ID } from './projectSessionConfig';

describe('useProjectCatalog', () => {
    it('hydrates catalog from storage and keeps example projects first', () => {
        const loadFromLocalStorage = vi.fn((key, fallback) => {
            if (key === 'globalAppData_projects') {
                return [{ id: 'custom-1', name: 'Custom 1' }];
            }
            if (key === 'globalAppData_currentProjectId') {
                return 'custom-1';
            }
            return fallback;
        });

        const { result } = renderHook(() => useProjectCatalog({ loadFromLocalStorage }));

        expect(result.current.currentProjectId).toBe('custom-1');
        expect(result.current.projects.map((project) => project.id)).toEqual([
            DEFAULT_PROJECT_ID,
            MULTI_RUN_EXAMPLE_PROJECT_ID,
            'custom-1'
        ]);
    });

    it('falls back to default example project id when no active id is stored', () => {
        const loadFromLocalStorage = vi.fn((key, fallback) => {
            if (key === 'globalAppData_projects') {
                return [];
            }
            return fallback;
        });

        const { result } = renderHook(() => useProjectCatalog({ loadFromLocalStorage }));

        expect(result.current.currentProjectId).toBe(DEFAULT_PROJECT_ID);
    });
});
