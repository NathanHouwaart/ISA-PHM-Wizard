import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalDataProvider, useProjectActions } from './GlobalDataContext';

const clearTreeMock = vi.fn(async () => true);

vi.mock('../utils/indexedTreeStore', () => ({
    clearTree: (...args) => clearTreeMock(...args),
    loadTree: vi.fn(async () => null)
}));

vi.mock('../hooks/useDatasetStore', () => ({
    default: () => ({
        selectedDataset: null,
        setSelectedDataset: vi.fn(),
        loadDatasetSubtree: vi.fn(),
        initHydrated: true
    })
}));

vi.mock('../hooks/useExampleProjects', () => ({
    useExampleProjects: vi.fn(),
    isExampleProject: vi.fn(() => false),
    getExampleProjectData: vi.fn(() => null),
    resetExampleProject: vi.fn(async () => {}),
    seedExampleProject: vi.fn(async () => {})
}));

const wrapper = ({ children }) => (
    <GlobalDataProvider>
        {children}
    </GlobalDataProvider>
);

describe('GlobalDataContext storage hygiene', () => {
    beforeEach(() => {
        localStorage.clear();
        clearTreeMock.mockClear();
    });

    it('deleteProject removes all project-scoped keys and clears IndexedDB tree', async () => {
        localStorage.setItem('globalAppData_projects', JSON.stringify([
            { id: 'project-keep', name: 'Keep' },
            { id: 'project-remove', name: 'Remove me' }
        ]));
        localStorage.setItem('globalAppData_currentProjectId', JSON.stringify('project-keep'));

        localStorage.setItem('globalAppData_project-remove_studies', JSON.stringify([{ id: 'study-1' }]));
        localStorage.setItem('globalAppData_project-remove_datasetName', JSON.stringify('Dataset'));
        localStorage.setItem('globalAppData_project-remove_customBlob', JSON.stringify({ keep: false }));

        const { result } = renderHook(() => useProjectActions(), { wrapper });

        let deleteResult = null;
        act(() => {
            deleteResult = result.current.deleteProject('project-remove');
        });

        expect(deleteResult).toBe(true);
        expect(localStorage.getItem('globalAppData_project-remove_studies')).toBeNull();
        expect(localStorage.getItem('globalAppData_project-remove_datasetName')).toBeNull();
        expect(localStorage.getItem('globalAppData_project-remove_customBlob')).toBeNull();
        expect(clearTreeMock).toHaveBeenCalledWith('project-remove');

        await waitFor(() => {
            const projects = JSON.parse(localStorage.getItem('globalAppData_projects'));
            expect(projects.some((project) => project.id === 'project-remove')).toBe(false);
        });
    });

    it('runs a one-time startup orphan sweep for known managed project keys', async () => {
        localStorage.setItem('globalAppData_projects', JSON.stringify([
            { id: 'project-keep', name: 'Keep' }
        ]));
        localStorage.setItem('globalAppData_currentProjectId', JSON.stringify('project-keep'));

        localStorage.setItem('globalAppData_project-keep_studies', JSON.stringify([{ id: 'study-keep' }]));

        localStorage.setItem('globalAppData_project-orphan_studies', JSON.stringify([{ id: 'study-orphan' }]));
        localStorage.setItem('globalAppData_project-orphan_schemaVersion', '2');
        localStorage.setItem('globalAppData_project-orphan_datasetName', JSON.stringify('Old Dataset'));
        localStorage.setItem('globalAppData_project-orphan_lastEdited', JSON.stringify('2024-01-01T00:00:00.000Z'));
        localStorage.setItem('globalAppData_project-orphan_seeded_v2', '1');
        localStorage.setItem('globalAppData_project-orphan_customBlob', JSON.stringify({ keep: true }));

        const { result } = renderHook(() => useProjectActions(), { wrapper });
        expect(result.current).toBeDefined();

        await waitFor(() => {
            expect(localStorage.getItem('globalAppData_project-orphan_studies')).toBeNull();
            expect(localStorage.getItem('globalAppData_project-orphan_schemaVersion')).toBeNull();
            expect(localStorage.getItem('globalAppData_project-orphan_datasetName')).toBeNull();
            expect(localStorage.getItem('globalAppData_project-orphan_lastEdited')).toBeNull();
            expect(localStorage.getItem('globalAppData_project-orphan_seeded_v2')).toBeNull();
        });

        // Unknown project-scoped keys are intentionally preserved.
        expect(localStorage.getItem('globalAppData_project-orphan_customBlob')).not.toBeNull();
        expect(localStorage.getItem('globalAppData_project-keep_studies')).not.toBeNull();
        expect(localStorage.getItem('globalAppData_projects')).not.toBeNull();
        expect(localStorage.getItem('globalAppData_currentProjectId')).not.toBeNull();
    });
});
