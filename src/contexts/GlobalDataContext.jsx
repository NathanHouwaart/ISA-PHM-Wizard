// src/context/GlobalDataContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import initialStudies from "../data/existingStudies.json"
import initialAuthors from "../data/existingAuthors.json";
import initialTestSetups from "../data/InitialTestSetups.json";
import initialPublications from "../data/existingPublications.json";
import initialStudyVariables from "../data/existingStudyVariables.json";
import existingStudyToStudyVariableMapping from "../data/existingStudyToStudyVariableMapping.json";
import existingStudyToSensorMeasurementMapping from "../data/existingStudyToSensorMeasurementMapping.json";
import initialProcessingProtocols from "../data/InitialProcessingProtocols.json";

import investigationFormFields from '../data/InvestigationFormFields2.json'

const GlobalDataContext = createContext();

export const useGlobalDataContext = () => {
    const context = useContext(GlobalDataContext);
    if (!context) {
        throw new Error('useGlobalDataContext must be used within a GlobalDataProvider');
    }
    return context;
};

// Helper function to read from local storage and parse
const loadFromLocalStorage = (key, initialValue) => {
    try {
        const storedData = localStorage.getItem(key);
        if (storedData) {
            return JSON.parse(storedData);
        }
    } catch (error) {
        console.error("Error parsing data from localStorage", error);
        // Fallback to initial value if parsing fails
    }
    return initialValue;
};

// Main Data Provider Component
export const GlobalDataProvider = ({ children }) => {

    const initialFormState = investigationFormFields.fields.reduce((acc, field) => {
        acc[field.id] = ''; // Initialize each field with an empty string
        return acc;
    }, {});

    // Lazy initialization for all state variables from localStorage
    const [studies, setStudies] = useState(() => loadFromLocalStorage('globalAppData_studies', initialStudies));
    const [investigations, setInvestigations] = useState(() => loadFromLocalStorage('globalAppData_investigations', initialFormState));
    const [authors, setAuthors] = useState(() => loadFromLocalStorage('globalAppData_authors', initialAuthors));
    const [testSetups, setTestSetups] = useState(() => loadFromLocalStorage('globalAppData_testSetups', initialTestSetups));
    const [publications, setPublications] = useState(() => loadFromLocalStorage('globalAppData_publications', initialPublications));
    const [selectedTestSetupId, setSelectedTestSetupId] = useState(() => loadFromLocalStorage('globalAppData_selectedTestSetupId', null));
    const [studyVariables, setStudyVariables] = useState(() => loadFromLocalStorage('globalAppData_studyVariables', initialStudyVariables));
    const [processingProtocols, setProcessingProtocols] = useState(() => loadFromLocalStorage('globalAppData_processingProtocols', initialProcessingProtocols))

    // Mappings
    const [studyToStudyVariableMapping, setStudyToStudyVariableMapping] = useState(() => loadFromLocalStorage('globalAppData_studyToStudyVariableMapping', existingStudyToStudyVariableMapping));
    const [studyToSensorMeasurementMapping, setStudyToSensorMeasurementMapping] = useState(() => loadFromLocalStorage('globalAppData_studyToSensorMeasurementMapping', existingStudyToSensorMeasurementMapping));
    const [sensorToProcessingProtocolMapping, setSensorToProcessingProtocolMapping] = useState(() => loadFromLocalStorage('globalAppData_sensorToProcessingProtocolMapping', []));
    const [studyToSensorProcessingMapping, setStudyToSensorProcessingMapping] = useState(() => loadFromLocalStorage('globalAppData_studyToSensorProcessingMapping', []));
    const [studyToAssayMapping, setStudyToAssayMapping] = useState(() => loadFromLocalStorage('globalAppData_studyToAssayMapping', []));

    const [screenWidth, setScreenWidth] = useState("max-w-5xl");
    const [pageTabStates, setPageTabStates] = useState(() => loadFromLocalStorage('globalAppData_pageTabStates', {}));

    // Effect for saving all data to local storage
    // This useEffect will run whenever any of its dependencies change, saving the latest state.
    useEffect(() => {
        // const dataToStore = {
        //     studies,
        //     investigations,
        //     authors,
        //     testSetups,
        //     publications,
        //     selectedTestSetupId,
        //     studyVariables,
        //     studyToStudyVariableMapping,
        //     studyToSensorMeasurementMapping,
        //     studyToSensorProcessingMapping,
        //     studyToAssayMapping
        // };

        localStorage.setItem('globalAppData_studies', JSON.stringify(studies));
        localStorage.setItem('globalAppData_investigations', JSON.stringify(investigations));
        localStorage.setItem('globalAppData_authors', JSON.stringify(authors));
        localStorage.setItem('globalAppData_testSetups', JSON.stringify(testSetups));
        localStorage.setItem('globalAppData_publications', JSON.stringify(publications));
        localStorage.setItem('globalAppData_selectedTestSetupId', JSON.stringify(selectedTestSetupId));
        localStorage.setItem('globalAppData_studyVariables', JSON.stringify(studyVariables));
        localStorage.setItem('globalAppData_processingProtocols', JSON.stringify(processingProtocols));

        localStorage.setItem('globalAppData_studyToStudyVariableMapping', JSON.stringify(studyToStudyVariableMapping));
        localStorage.setItem('globalAppData_studyToSensorMeasurementMapping', JSON.stringify(studyToSensorMeasurementMapping));
        localStorage.setItem('globalAppData_sensorToProcessingProtocolMapping', JSON.stringify(sensorToProcessingProtocolMapping));
        localStorage.setItem('globalAppData_studyToSensorProcessingMapping', JSON.stringify(studyToSensorProcessingMapping));
        localStorage.setItem('globalAppData_studyToAssayMapping', JSON.stringify(studyToAssayMapping));
        localStorage.setItem('globalAppData_pageTabStates', JSON.stringify(pageTabStates));

        // console.log("Global data saved to localStorage:", dataToStore);

    }, [
        studies, investigations, authors, testSetups,
        publications, selectedTestSetupId, studyVariables, processingProtocols,
        studyToStudyVariableMapping, studyToSensorMeasurementMapping,
        sensorToProcessingProtocolMapping, studyToSensorProcessingMapping,
        studyToAssayMapping, pageTabStates
    ]);

    // Auto-generate default studyToAssayMapping entries when none exist.
    // This is non-destructive: if the mapping already contains entries we leave it alone.
    useEffect(() => {
        try {
            if (Array.isArray(studyToAssayMapping) && studyToAssayMapping.length > 0) return; // already populated

            // Build defaults using studies and sensors from testSetups
            const pad = (n) => String(n + 1).padStart(2, '0');
            const defaults = [];

            // If testSetups is empty, nothing to generate
            if (!Array.isArray(testSetups) || testSetups.length === 0) {
                return;
            }

            studies.forEach((study, si) => {
                // choose the first testSetup or iterate all testSetups -- we iterate all to be exhaustive
                testSetups.forEach((setup) => {
                    if (!Array.isArray(setup.sensors)) return;
                    setup.sensors.forEach((sensor, sidx) => {
                        // Default assay filename pattern: ST{studyIdx}_SE{sensorIdx}_ASSO.csv
                        const value = `ST${pad(si)}_SE${pad(sidx)}_ASSO.csv`;
                        defaults.push({ studyId: study.id, sensorId: sensor.id, value });
                    });
                });
            });

            if (defaults.length > 0) {
                setStudyToAssayMapping(defaults);
            }
        } catch (err) {
            console.error('[GlobalDataContext] error generating default studyToAssayMapping', err);
        }
    }, [studies, testSetups, studyToAssayMapping, setStudyToAssayMapping]);


    // submission logic intentionally removed from context; use `useSubmitData` hook instead

    const dataMap = {
        studies: [studies, setStudies],
        authors: [authors, setAuthors],
        testSetups: [testSetups, setTestSetups],
        investigations: [investigations, setInvestigations],
        publications: [publications, setPublications],
        selectedTestSetupId: [selectedTestSetupId, setSelectedTestSetupId],
        studyVariables: [studyVariables, setStudyVariables],
        processingProtocols: [processingProtocols, setProcessingProtocols],
        studyToStudyVariableMapping: [studyToStudyVariableMapping, setStudyToStudyVariableMapping],
        studyToSensorMeasurementMapping: [studyToSensorMeasurementMapping, setStudyToSensorMeasurementMapping],
        sensorToProcessingProtocolMapping: [sensorToProcessingProtocolMapping, setSensorToProcessingProtocolMapping],
        studyToSensorProcessingMapping: [studyToSensorProcessingMapping, setStudyToSensorProcessingMapping],
        studyToAssayMapping: [studyToAssayMapping, setStudyToAssayMapping],
        screenWidth: [screenWidth, setScreenWidth],
        pageTabStates: [pageTabStates, setPageTabStates]
    };


    const value = {
        studies,
        setStudies,
        testSetups,
        setTestSetups,
        investigations,
        setInvestigations,
        authors,
        setAuthors,
        publications,
        setPublications,
        selectedTestSetupId,
        setSelectedTestSetupId,
        studyVariables,
        setStudyVariables,
        processingProtocols,
        setProcessingProtocols,
        studyToStudyVariableMapping,
        setStudyToStudyVariableMapping,
        studyToSensorMeasurementMapping,
        setStudyToSensorMeasurementMapping,
        sensorToProcessingProtocolMapping,
        setSensorToProcessingProtocolMapping,
        studyToSensorProcessingMapping,
        setStudyToSensorProcessingMapping,
        studyToAssayMapping,
        setStudyToAssayMapping,
        screenWidth,
        setScreenWidth,
    pageTabStates,
    setPageTabStates,
    dataMap
    };
    return (
        <GlobalDataContext.Provider value={value}>
            {children}
        </GlobalDataContext.Provider>
    );
};