// src/context/GlobalDataContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import initialStudies from "../data/existingStudies.json"
import initialAuthors from "../data/existingAuthors.json";
import initialTestSetups from "../data/InitialTestSetups.json";
import initialPublications from "../data/existingPublications.json";
import initialStudyVariables from "../data/existingStudyVariables.json";
import existingStudyToStudyVariableMapping from "../data/existingStudyToStudyVariableMapping.json";
import existingStudyToSensorMeasurementMapping from "../data/existingStudyToSensorMeasurementMapping.json";

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

    const [studyToStudyVariableMapping, setStudyToStudyVariableMapping] = useState(() => loadFromLocalStorage('globalAppData_studyToStudyVariableMapping', existingStudyToStudyVariableMapping));
    const [studyToSensorMeasurementMapping, setStudyToSensorMeasurementMapping] = useState(() => loadFromLocalStorage('globalAppData_studyToSensorMeasurementMapping', existingStudyToSensorMeasurementMapping));
    const [studyToSensorProcessingMapping, setStudyToSensorProcessingMapping] = useState(() => loadFromLocalStorage('globalAppData_studyToSensorProcessingMapping', []));
    const [studyToAssayMapping, setStudyToAssayMapping] = useState(() => loadFromLocalStorage('globalAppData_studyToAssayMapping', []));

    const [screenWidth, setScreenWidth] = useState("max-w-5xl");

    // Effect for saving all data to local storage
    // This useEffect will run whenever any of its dependencies change, saving the latest state.
    useEffect(() => {
        const dataToStore = {
            studies,
            investigations,
            authors,
            testSetups,
            publications,
            selectedTestSetupId,
            studyVariables,
            studyToStudyVariableMapping,
            studyToSensorMeasurementMapping,
            studyToSensorProcessingMapping,
            studyToAssayMapping
        };

        localStorage.setItem('globalAppData_studies', JSON.stringify(studies));
        localStorage.setItem('globalAppData_investigations', JSON.stringify(investigations));
        localStorage.setItem('globalAppData_authors', JSON.stringify(authors));
        localStorage.setItem('globalAppData_testSetups', JSON.stringify(testSetups));
        localStorage.setItem('globalAppData_publications', JSON.stringify(publications));
        localStorage.setItem('globalAppData_selectedTestSetupId', JSON.stringify(selectedTestSetupId));
        localStorage.setItem('globalAppData_studyVariables', JSON.stringify(studyVariables));
        localStorage.setItem('globalAppData_studyToStudyVariableMapping', JSON.stringify(studyToStudyVariableMapping));
        localStorage.setItem('globalAppData_studyToSensorMeasurementMapping', JSON.stringify(studyToSensorMeasurementMapping));
        localStorage.setItem('globalAppData_studyToSensorProcessingMapping', JSON.stringify(studyToSensorProcessingMapping));
        localStorage.setItem('globalAppData_studyToAssayMapping', JSON.stringify(studyToAssayMapping));

        // console.log("Global data saved to localStorage:", dataToStore);

    }, [
        studies, investigations, authors, testSetups,
        publications, selectedTestSetupId, studyVariables,
        studyToStudyVariableMapping, studyToSensorMeasurementMapping,
        studyToSensorProcessingMapping, studyToAssayMapping
    ]);


    function submitData() {
        // Function to handle data submission
        console.log("Data submitted:", {
            studies,
            investigations,
            authors,
            publications,
            selectedTestSetupId,
            studyVariables,
            studyToStudyVariableMapping,
            studyToSensorMeasurementMapping,
            studyToSensorProcessingMapping,
            studyToAssayMapping
        });

        console.log(
            JSON.stringify({
                "identifier": investigations.investigationIdentifier,
                "title": investigations.investigationTitle,
                "description": investigations.investigationDescription,
                "license": investigations.license,
                "submission_date": investigations.submissionDate,
                "public_release_date": investigations.publicReleaseDate,
                "publications": publications,
                "authors": authors,
                "studies": [
                    studies.map(study => ({
                        ...study,
                        publications,
                        authors,
                        "used_setup" : testSetups.find(setup => setup.id === selectedTestSetupId),
                    }))
                ]
            }, null, 2)
        )
    }

    const dataMap = {
        studies: [studies, setStudies],
        authors: [authors, setAuthors],
        testSetups: [testSetups, setTestSetups],
        investigations: [investigations, setInvestigations],
        publications: [publications, setPublications],
        selectedTestSetupId: [selectedTestSetupId, setSelectedTestSetupId],
        studyVariables: [studyVariables, setStudyVariables],
        studyToStudyVariableMapping: [studyToStudyVariableMapping, setStudyToStudyVariableMapping],
        studyToSensorMeasurementMapping: [studyToSensorMeasurementMapping, setStudyToSensorMeasurementMapping],
        studyToSensorProcessingMapping: [studyToSensorProcessingMapping, setStudyToSensorProcessingMapping],
        studyToAssayMapping: [studyToAssayMapping, setStudyToAssayMapping],
        screenWidth: [screenWidth, setScreenWidth],
        submitData: [submitData]
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
        studyToStudyVariableMapping,
        setStudyToStudyVariableMapping,
        studyToSensorMeasurementMapping,
        setStudyToSensorMeasurementMapping,
        studyToSensorProcessingMapping,
        setStudyToSensorProcessingMapping,
        studyToAssayMapping,
        setStudyToAssayMapping,
        screenWidth,
        setScreenWidth,
        dataMap,
        submitData
    };

    return (
        <GlobalDataContext.Provider value={value}>
            {children}
        </GlobalDataContext.Provider>
    );
};