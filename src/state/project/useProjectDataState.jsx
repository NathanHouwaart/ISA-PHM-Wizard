import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_EXPERIMENT_TYPE_ID, getExperimentTypeConfig } from '../../constants/experimentTypes';
import { normalizeRunCount } from '../../utils/studyRuns';

const PROGNOSTICS_EXPERIMENT_TYPE_ID = 'prognostics-experiment';

const inferExperimentTypeFromState = (stateLike) => {
    const explicitType = typeof stateLike?.experimentType === 'string'
        ? stateLike.experimentType.trim()
        : '';
    if (explicitType) {
        return explicitType;
    }

    const studies = Array.isArray(stateLike?.studies) ? stateLike.studies : [];
    const hasMultiRun = studies.some((study) => normalizeRunCount(study?.runCount) > 1);
    if (hasMultiRun) {
        return PROGNOSTICS_EXPERIMENT_TYPE_ID;
    }

    return DEFAULT_EXPERIMENT_TYPE_ID;
};

export default function useProjectDataState({
    initialProjectState,
    initialTestSetupsState
}) {
    // Per-project domain state
    const [studies, setStudies] = useState(() => initialProjectState.studies);
    const [investigation, setInvestigation] = useState(() => initialProjectState.investigation);
    const [contacts, setContacts] = useState(() => initialProjectState.contacts);
    const [publications, setPublications] = useState(() => initialProjectState.publications);
    const [selectedTestSetupId, setSelectedTestSetupId] = useState(() => initialProjectState.selectedTestSetupId);
    const [studyVariables, setStudyVariables] = useState(() => initialProjectState.studyVariables);
    const [measurementProtocols, setMeasurementProtocols] = useState(() => initialProjectState.measurementProtocols);
    const [processingProtocols, setProcessingProtocols] = useState(() => initialProjectState.processingProtocols);
    const [studyToMeasurementProtocolSelection, setStudyToMeasurementProtocolSelection] = useState(() => initialProjectState.studyToMeasurementProtocolSelection);
    const [studyToProcessingProtocolSelection, setStudyToProcessingProtocolSelection] = useState(() => initialProjectState.studyToProcessingProtocolSelection);
    const [experimentType, setExperimentType] = useState(() => inferExperimentTypeFromState(initialProjectState));

    // Mappings
    const [studyToStudyVariableMapping, setStudyToStudyVariableMapping] = useState(() => initialProjectState.studyToStudyVariableMapping);
    const [sensorToMeasurementProtocolMapping, setSensorToMeasurementProtocolMapping] = useState(() => initialProjectState.sensorToMeasurementProtocolMapping);
    const [studyToSensorMeasurementMapping, setStudyToSensorMeasurementMapping] = useState(() => initialProjectState.studyToSensorMeasurementMapping);
    const [sensorToProcessingProtocolMapping, setSensorToProcessingProtocolMapping] = useState(() => initialProjectState.sensorToProcessingProtocolMapping);
    const [studyToSensorProcessingMapping, setStudyToSensorProcessingMapping] = useState(() => initialProjectState.studyToSensorProcessingMapping);

    // Global/shared state that still lives in this store for compatibility
    const [testSetups, setTestSetups] = useState(() => initialTestSetupsState);
    const [screenWidth, setScreenWidth] = useState('max-w-5xl');
    const [pageTabStates, setPageTabStates] = useState(() => initialProjectState.pageTabStates || {});

    useEffect(() => {
        const config = getExperimentTypeConfig(experimentType);
        if (config?.supportsMultipleRuns) {
            return;
        }

        setStudies((prevStudies) => {
            if (!Array.isArray(prevStudies) || prevStudies.length === 0) {
                return prevStudies;
            }

            let updated = false;

            const nextStudies = prevStudies.map((study) => {
                if (!study) {
                    return study;
                }
                const normalized = normalizeRunCount(study.runCount);
                if (normalized !== 1) {
                    updated = true;
                    return { ...study, runCount: 1 };
                }
                return study;
            });

            return updated ? nextStudies : prevStudies;
        });
    }, [experimentType]);

    const applyProjectStateToMemory = useCallback((nextState) => {
        setStudies(nextState.studies);
        setInvestigation(nextState.investigation);
        setContacts(nextState.contacts);
        setPublications(nextState.publications);
        setSelectedTestSetupId(nextState.selectedTestSetupId);
        setStudyVariables(nextState.studyVariables);
        setMeasurementProtocols(nextState.measurementProtocols);
        setProcessingProtocols(nextState.processingProtocols);
        setExperimentType(inferExperimentTypeFromState(nextState));
        setStudyToMeasurementProtocolSelection(nextState.studyToMeasurementProtocolSelection);
        setStudyToProcessingProtocolSelection(nextState.studyToProcessingProtocolSelection);
        setStudyToStudyVariableMapping(nextState.studyToStudyVariableMapping);
        setSensorToMeasurementProtocolMapping(nextState.sensorToMeasurementProtocolMapping);
        setStudyToSensorMeasurementMapping(nextState.studyToSensorMeasurementMapping);
        setSensorToProcessingProtocolMapping(nextState.sensorToProcessingProtocolMapping);
        setStudyToSensorProcessingMapping(nextState.studyToSensorProcessingMapping);
        setPageTabStates(nextState.pageTabStates || {});
    }, []);

    const stateSetter = useMemo(() => ({
        studies: setStudies,
        investigation: setInvestigation,
        contacts: setContacts,
        publications: setPublications,
        selectedTestSetupId: setSelectedTestSetupId,
        studyVariables: setStudyVariables,
        measurementProtocols: setMeasurementProtocols,
        processingProtocols: setProcessingProtocols,
        studyToMeasurementProtocolSelection: setStudyToMeasurementProtocolSelection,
        studyToProcessingProtocolSelection: setStudyToProcessingProtocolSelection,
        experimentType: setExperimentType,
        studyToStudyVariableMapping: setStudyToStudyVariableMapping,
        sensorToMeasurementProtocolMapping: setSensorToMeasurementProtocolMapping,
        studyToSensorMeasurementMapping: setStudyToSensorMeasurementMapping,
        sensorToProcessingProtocolMapping: setSensorToProcessingProtocolMapping,
        studyToSensorProcessingMapping: setStudyToSensorProcessingMapping,
        pageTabStates: setPageTabStates
    }), []);

    const dataMap = useMemo(() => ({
        studies: [studies, setStudies],
        contacts: [contacts, setContacts],
        testSetups: [testSetups, setTestSetups],
        investigation: [investigation, setInvestigation],
        publications: [publications, setPublications],
        selectedTestSetupId: [selectedTestSetupId, setSelectedTestSetupId],
        studyVariables: [studyVariables, setStudyVariables],
        measurementProtocols: [measurementProtocols, setMeasurementProtocols],
        processingProtocols: [processingProtocols, setProcessingProtocols],
        studyToMeasurementProtocolSelection: [studyToMeasurementProtocolSelection, setStudyToMeasurementProtocolSelection],
        studyToProcessingProtocolSelection: [studyToProcessingProtocolSelection, setStudyToProcessingProtocolSelection],
        studyToStudyVariableMapping: [studyToStudyVariableMapping, setStudyToStudyVariableMapping],
        sensorToMeasurementProtocolMapping: [sensorToMeasurementProtocolMapping, setSensorToMeasurementProtocolMapping],
        studyToSensorMeasurementMapping: [studyToSensorMeasurementMapping, setStudyToSensorMeasurementMapping],
        sensorToProcessingProtocolMapping: [sensorToProcessingProtocolMapping, setSensorToProcessingProtocolMapping],
        studyToSensorProcessingMapping: [studyToSensorProcessingMapping, setStudyToSensorProcessingMapping],
        screenWidth: [screenWidth, setScreenWidth],
        pageTabStates: [pageTabStates, setPageTabStates],
        experimentType: [experimentType, setExperimentType]
    }), [
        studies,
        contacts,
        testSetups,
        investigation,
        publications,
        selectedTestSetupId,
        studyVariables,
        measurementProtocols,
        processingProtocols,
        studyToMeasurementProtocolSelection,
        studyToProcessingProtocolSelection,
        studyToStudyVariableMapping,
        sensorToMeasurementProtocolMapping,
        studyToSensorMeasurementMapping,
        sensorToProcessingProtocolMapping,
        studyToSensorProcessingMapping,
        screenWidth,
        pageTabStates,
        experimentType
    ]);

    return {
        studies,
        setStudies,
        investigation,
        setInvestigation,
        contacts,
        setContacts,
        publications,
        setPublications,
        selectedTestSetupId,
        setSelectedTestSetupId,
        studyVariables,
        setStudyVariables,
        measurementProtocols,
        setMeasurementProtocols,
        processingProtocols,
        setProcessingProtocols,
        studyToMeasurementProtocolSelection,
        setStudyToMeasurementProtocolSelection,
        studyToProcessingProtocolSelection,
        setStudyToProcessingProtocolSelection,
        experimentType,
        setExperimentType,
        studyToStudyVariableMapping,
        setStudyToStudyVariableMapping,
        sensorToMeasurementProtocolMapping,
        setSensorToMeasurementProtocolMapping,
        studyToSensorMeasurementMapping,
        setStudyToSensorMeasurementMapping,
        sensorToProcessingProtocolMapping,
        setSensorToProcessingProtocolMapping,
        studyToSensorProcessingMapping,
        setStudyToSensorProcessingMapping,
        testSetups,
        setTestSetups,
        screenWidth,
        setScreenWidth,
        pageTabStates,
        setPageTabStates,
        applyProjectStateToMemory,
        stateSetter,
        dataMap,
    };
}
