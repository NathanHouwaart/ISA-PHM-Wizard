// src/context/GlobalDataContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import initialStudies from "../data/existingStudies.json"
import initialAuthors from "../data/existingAuthors.json";
import initialTestSetups from "../data/InitialTestSetups.json";
import initialPublications from "../data/existingPublications.json";
import initialStudyVariables from "../data/existingStudyVariables.json"; // Assuming you have a file for study variables
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

export const GlobalDataProvider = ({ children }) => {

    const initialFormState = investigationFormFields.fields.reduce((acc, field) => {
        acc[field.id] = ''; // Initialize each field with an empty string
        return acc;
    }, {});


    // const [pageIsaQuestionnareState, setPageIsaQuestionnareState] = useState({});


    const [studies, setStudies] = useState(initialStudies);
    const [investigations, setInvestigations] = useState(initialFormState);
    const [authors, setAuthors] = useState(initialAuthors);
    const [testSetups, setTestSetups] = useState(initialTestSetups);
    const [publications, setPublications] = useState(initialPublications);
    const [selectedTestSetup, setSelectedTestSetup] = useState(null);
    const [studyVariables, setStudyVariables] = useState(initialStudyVariables); // For study variables

    const [studyToStudyVariableMapping, setStudyToStudyVariableMapping] = useState(existingStudyToStudyVariableMapping);
    const [studyToSensorMeasurementMapping, setStudyToSensorMeasurementMapping] = useState([]); // For study measurements

    const [screenWidth, setScreenWidth] = useState("max-w-5xl");

    useEffect(() => {
        console.log("study variables", studyToStudyVariableMapping);
    }, [studyToStudyVariableMapping]);

    // Add more state variables for other data types as needed

    // Example: Load/save all data to local storage (consider using a single key or multiple keys)
    useEffect(() => {
        const storedData = localStorage.getItem('globalAppData');
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            console.log("Parsed Data from Local Storage:", parsedData);
            setStudies(parsedData?.studies || initialStudies || []);
            setInvestigations(parsedData?.investigations || {});        // One investigation
            setAuthors(parsedData?.authors || initialAuthors || []);
            setTestSetups(parsedData?.testSetups || initialTestSetups || []);
            setSelectedTestSetup(parsedData?.selectedTestSetup || null);
            setPublications(parsedData?.publications || initialPublications || []);
            setStudyVariables(parsedData?.studyVariables || initialStudyVariables || []); // Load study variables
            setStudyToStudyVariableMapping(parsedData?.studyToStudyVariableMapping || existingStudyToStudyVariableMapping || []);
            setStudyToSensorMeasurementMapping(parsedData?.studyToSensorMeasurementMapping || existingStudyToSensorMeasurementMapping || []);
            // ... set other states
        }
    }, []);

    function submitData() {
        // Function to handle data submission
        // This could be an API call or any other logic you want to implement
        console.log("Data submitted:", {
            studies,
            investigations,
            authors,
            publications,
            selectedTestSetup,
            studyVariables,
            studyToStudyVariableMapping,
            studyToSensorMeasurementMapping
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
            }, null, 2)
        )
    }




    useEffect(() => {
        const dataToStore = {
            studies,
            investigations,
            authors,
            testSetups,
            publications,
            selectedTestSetup,
            studyVariables,
            studyToStudyVariableMapping,
            studyToSensorMeasurementMapping,
            // ... include othmer states
        };
        console.log("Data to be stored in localStorage:", dataToStore);
        localStorage.setItem('globalAppData', JSON.stringify(dataToStore));
    },
        [
            studies, investigations, authors, testSetups,
            selectedTestSetup, studyVariables, studyToStudyVariableMapping,
            studyToSensorMeasurementMapping
        ]
    ); // Add all dependent states here

    const dataMap = {
        studies: [studies, setStudies],
        authors: [authors, setAuthors],
        testSetups: [testSetups, setTestSetups],
        investigations: [investigations, setInvestigations],
        publications: [publications, setPublications],
        selectedTestSetup: [selectedTestSetup, setSelectedTestSetup],
        studyVariables: [studyVariables, setStudyVariables],
        studyToStudyVariableMapping: [studyToStudyVariableMapping, setStudyToStudyVariableMapping],
        studyToSensorMeasurementMapping: [studyToSensorMeasurementMapping, setStudyToSensorMeasurementMapping],
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
        selectedTestSetup,
        setSelectedTestSetup,
        studyVariables,
        setStudyVariables,
        studyToStudyVariableMapping,
        setStudyToStudyVariableMapping,
        studyToSensorMeasurementMapping,
        setStudyToSensorMeasurementMapping,
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