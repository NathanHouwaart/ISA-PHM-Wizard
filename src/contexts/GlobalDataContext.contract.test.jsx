import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
    GlobalDataProvider,
    useProjectActions,
    useProjectData
} from './GlobalDataContext';

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
    'updateProjectExperimentType'
];

const wrapper = ({ children }) => (
    <GlobalDataProvider>
        {children}
    </GlobalDataProvider>
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
});
