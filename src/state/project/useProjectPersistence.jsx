import { useEffect, useMemo, useRef } from 'react';

const PROJECT_SCOPED_ORDER = [
    'studies',
    'investigation',
    'contacts',
    'publications',
    'selectedTestSetupId',
    'studyVariables',
    'measurementProtocols',
    'processingProtocols',
    'experimentType',
    'studyToMeasurementProtocolSelection',
    'studyToProcessingProtocolSelection',
    'studyToStudyVariableMapping',
    'sensorToMeasurementProtocolMapping',
    'studyToSensorMeasurementMapping',
    'sensorToProcessingProtocolMapping',
    'studyToSensorProcessingMapping',
    'pageTabStates'
];

export default function useProjectPersistence({
    currentProjectId,
    projectKey,
    saveToLocalStorage,
    projects,
    testSetups,
    studies,
    investigation,
    contacts,
    publications,
    selectedTestSetupId,
    studyVariables,
    measurementProtocols,
    processingProtocols,
    experimentType,
    studyToMeasurementProtocolSelection,
    studyToProcessingProtocolSelection,
    studyToStudyVariableMapping,
    sensorToMeasurementProtocolMapping,
    studyToSensorMeasurementMapping,
    sensorToProcessingProtocolMapping,
    studyToSensorProcessingMapping,
    pageTabStates
}) {
    const previousProjectScopedRef = useRef({ projectId: undefined, values: {} });
    const previousGlobalRef = useRef({
        projects: undefined,
        currentProjectId: undefined,
        testSetups: undefined
    });

    const projectScopedValues = useMemo(() => ({
        studies,
        investigation,
        contacts,
        publications,
        selectedTestSetupId,
        studyVariables,
        measurementProtocols,
        processingProtocols,
        experimentType,
        studyToMeasurementProtocolSelection,
        studyToProcessingProtocolSelection,
        studyToStudyVariableMapping,
        sensorToMeasurementProtocolMapping,
        studyToSensorMeasurementMapping,
        sensorToProcessingProtocolMapping,
        studyToSensorProcessingMapping,
        pageTabStates
    }), [
        studies,
        investigation,
        contacts,
        publications,
        selectedTestSetupId,
        studyVariables,
        measurementProtocols,
        processingProtocols,
        experimentType,
        studyToMeasurementProtocolSelection,
        studyToProcessingProtocolSelection,
        studyToStudyVariableMapping,
        sensorToMeasurementProtocolMapping,
        studyToSensorMeasurementMapping,
        sensorToProcessingProtocolMapping,
        studyToSensorProcessingMapping,
        pageTabStates
    ]);

    useEffect(() => {
        const previous = previousProjectScopedRef.current;
        const switchedProject = previous.projectId !== currentProjectId;

        PROJECT_SCOPED_ORDER.forEach((key) => {
            const nextValue = projectScopedValues[key];
            const valueChanged = previous.values[key] !== nextValue;

            if (switchedProject || valueChanged) {
                saveToLocalStorage(projectKey(key, currentProjectId), nextValue);
            }
        });

        previousProjectScopedRef.current = {
            projectId: currentProjectId,
            values: projectScopedValues
        };
    }, [currentProjectId, projectKey, projectScopedValues, saveToLocalStorage]);

    useEffect(() => {
        const previous = previousGlobalRef.current;

        if (previous.testSetups !== testSetups) {
            saveToLocalStorage('globalAppData_testSetups', testSetups);
        }
        if (previous.projects !== projects) {
            saveToLocalStorage('globalAppData_projects', projects);
        }
        if (previous.currentProjectId !== currentProjectId) {
            saveToLocalStorage('globalAppData_currentProjectId', currentProjectId);
        }

        previousGlobalRef.current = {
            projects,
            currentProjectId,
            testSetups
        };
    }, [projects, currentProjectId, testSetups, saveToLocalStorage]);
}
