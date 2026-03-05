import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useProjectPersistence from './useProjectPersistence';

const createProps = (overrides = {}) => {
    const projectKey = (key, projectId) => `globalAppData_${projectId}_${key}`;

    return {
        currentProjectId: 'project-1',
        projectKey,
        saveToLocalStorage: vi.fn(),
        projects: [{ id: 'project-1', name: 'Project 1' }],
        testSetups: [{ id: 'setup-1' }],
        studies: [{ id: 'study-1' }],
        investigation: {},
        contacts: [{ id: 'contact-1' }],
        publications: [{ id: 'publication-1' }],
        selectedTestSetupId: 'setup-1',
        studyVariables: [{ id: 'variable-1' }],
        measurementProtocols: [{ id: 'measurement-1' }],
        processingProtocols: [{ id: 'processing-1' }],
        experimentType: 'diagnostic-experiment',
        studyToMeasurementProtocolSelection: [],
        studyToProcessingProtocolSelection: [],
        studyToStudyVariableMapping: [],
        sensorToMeasurementProtocolMapping: [],
        studyToSensorMeasurementMapping: [],
        sensorToProcessingProtocolMapping: [],
        studyToSensorProcessingMapping: [],
        pageTabStates: {},
        ...overrides
    };
};

describe('useProjectPersistence', () => {
    it('persists all scoped/global values on first mount', () => {
        const props = createProps();
        renderHook((input) => useProjectPersistence(input), { initialProps: props });

        expect(props.saveToLocalStorage).toHaveBeenCalledWith(
            'globalAppData_project-1_studies',
            props.studies
        );
        expect(props.saveToLocalStorage).toHaveBeenCalledWith(
            'globalAppData_projects',
            props.projects
        );
        expect(props.saveToLocalStorage).toHaveBeenCalledWith(
            'globalAppData_currentProjectId',
            'project-1'
        );
    });

    it('writes only changed keys on rerender with same project', () => {
        const props = createProps();
        const { rerender } = renderHook((input) => useProjectPersistence(input), { initialProps: props });

        props.saveToLocalStorage.mockClear();
        const nextContacts = [{ id: 'contact-2' }];
        rerender(createProps({
            saveToLocalStorage: props.saveToLocalStorage,
            projectKey: props.projectKey,
            projects: props.projects,
            testSetups: props.testSetups,
            studies: props.studies,
            investigation: props.investigation,
            contacts: nextContacts,
            publications: props.publications,
            selectedTestSetupId: props.selectedTestSetupId,
            studyVariables: props.studyVariables,
            measurementProtocols: props.measurementProtocols,
            processingProtocols: props.processingProtocols,
            studyToMeasurementProtocolSelection: props.studyToMeasurementProtocolSelection,
            studyToProcessingProtocolSelection: props.studyToProcessingProtocolSelection,
            studyToStudyVariableMapping: props.studyToStudyVariableMapping,
            sensorToMeasurementProtocolMapping: props.sensorToMeasurementProtocolMapping,
            studyToSensorMeasurementMapping: props.studyToSensorMeasurementMapping,
            sensorToProcessingProtocolMapping: props.sensorToProcessingProtocolMapping,
            studyToSensorProcessingMapping: props.studyToSensorProcessingMapping,
            pageTabStates: props.pageTabStates
        }));

        expect(props.saveToLocalStorage).toHaveBeenCalledTimes(1);
        expect(props.saveToLocalStorage).toHaveBeenCalledWith(
            'globalAppData_project-1_contacts',
            nextContacts
        );
    });
});
