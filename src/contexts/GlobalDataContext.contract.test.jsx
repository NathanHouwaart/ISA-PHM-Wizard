import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
    GlobalDataProvider,
    useProjectActions,
    useProjectData
} from './GlobalDataContext';
import { decodeJsonFromStorage } from '../utils/storageCodec';

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

const EXPECTED_DATA_KEYS = [
    'studies',
    'testSetups',
    'investigation',
    'contacts',
    'publications',
    'selectedTestSetupId',
    'studyVariables',
    'measurementProtocols',
    'processingProtocols',
    'studyToMeasurementProtocolSelection',
    'studyToProcessingProtocolSelection',
    'studyToStudyVariableMapping',
    'sensorToMeasurementProtocolMapping',
    'studyToSensorMeasurementMapping',
    'sensorToProcessingProtocolMapping',
    'studyToSensorProcessingMapping',
    'screenWidth',
    'experimentType',
    'pageTabStates',
    'selectedDataset',
    'explorerOpen',
    'initDatasetHydrated',
    'dataMap',
    'projects',
    'currentProjectId',
    'DEFAULT_PROJECT_ID',
    'MULTI_RUN_EXAMPLE_PROJECT_ID',
    'DEFAULT_PROJECT_NAME'
];

const EXPECTED_ACTION_KEYS = [
    'setStudies',
    'setTestSetups',
    'setInvestigation',
    'setContacts',
    'setPublications',
    'setSelectedTestSetupId',
    'setStudyVariables',
    'setMeasurementProtocols',
    'setProcessingProtocols',
    'setStudyToMeasurementProtocolSelection',
    'setStudyToProcessingProtocolSelection',
    'setStudyToStudyVariableMapping',
    'setSensorToMeasurementProtocolMapping',
    'setStudyToSensorMeasurementMapping',
    'setSensorToProcessingProtocolMapping',
    'setStudyToSensorProcessingMapping',
    'setScreenWidth',
    'setExperimentType',
    'setPageTabStates',
    'setSelectedDataset',
    'loadDatasetSubtree',
    'setExplorerOpen',
    'openExplorer',
    'closeExplorer',
    'resolveExplorerSelection',
    'resolveExplorer',
    'createProject',
    'deleteProject',
    'renameProject',
    'switchProject',
    'resetProject',
    'updateProjectExperimentType',
    'updateProjectTestSetupSelection'
];

const wrapper = ({ children }) => (
    <GlobalDataProvider>
        {children}
    </GlobalDataProvider>
);

const waitForBufferedWrites = (ms = 650) => (
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    })
);

describe('GlobalDataContext contract hooks', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('useProjectData exposes the expected stable key contract', () => {
        const { result } = renderHook(() => useProjectData(), { wrapper });
        expect(Object.keys(result.current).sort()).toEqual(EXPECTED_DATA_KEYS.slice().sort());
    });

    it('useProjectActions exposes the expected callable action contract', () => {
        const { result } = renderHook(() => useProjectActions(), { wrapper });
        expect(Object.keys(result.current).sort()).toEqual(EXPECTED_ACTION_KEYS.slice().sort());

        EXPECTED_ACTION_KEYS.forEach((actionKey) => {
            expect(typeof result.current[actionKey]).toBe('function');
        });
    });

    it('composed data + actions contract keeps explorer alias', () => {
        const { result } = renderHook(() => ({
            ...useProjectData(),
            ...useProjectActions()
        }), { wrapper });

        EXPECTED_DATA_KEYS.forEach((dataKey) => {
            expect(dataKey in result.current).toBe(true);
        });

        EXPECTED_ACTION_KEYS.forEach((actionKey) => {
            expect(actionKey in result.current).toBe(true);
        });

        expect(result.current.resolveExplorer).toBe(result.current.resolveExplorerSelection);
    });

    it('project-scoped test setup updates do not mutate active project selection', async () => {
        const { result } = renderHook(() => ({
            ...useProjectData(),
            ...useProjectActions()
        }), { wrapper });

        const activeProjectId = result.current.currentProjectId;
        const initialSelectedSetupId = result.current.selectedTestSetupId;
        const otherProjectId = `${activeProjectId}-non-active`;

        act(() => {
            result.current.updateProjectTestSetupSelection(otherProjectId, 'setup-non-active');
        });

        expect(result.current.selectedTestSetupId).toBe(initialSelectedSetupId);
        await act(async () => {
            await waitForBufferedWrites();
        });
        const persisted = decodeJsonFromStorage(
            localStorage.getItem(`globalAppData_${otherProjectId}_selectedTestSetupId`)
        );
        expect(persisted.exists).toBe(true);
        expect(persisted.value).toBe('setup-non-active');
    });

    it('project-scoped test setup updates mutate in-memory selection for active project', async () => {
        const { result } = renderHook(() => ({
            ...useProjectData(),
            ...useProjectActions()
        }), { wrapper });

        const activeProjectId = result.current.currentProjectId;

        act(() => {
            result.current.updateProjectTestSetupSelection(activeProjectId, 'setup-active');
        });

        expect(result.current.selectedTestSetupId).toBe('setup-active');
        await act(async () => {
            await waitForBufferedWrites();
        });
        const persisted = decodeJsonFromStorage(
            localStorage.getItem(`globalAppData_${activeProjectId}_selectedTestSetupId`)
        );
        expect(persisted.exists).toBe(true);
        expect(persisted.value).toBe('setup-active');
    });
});
