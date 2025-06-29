// src/context/GlobalDataContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import initialStudies from "../data/existingStudies.json"
import initialAuthors from "../data/existingAuthors.json";
import initialTestSetups from "../data/InitialTestSetups.json";
import initialPublications from "../data/existingPublications.json";
import initialStudyVariables from "../data/existingStudyVariables.json"; // Assuming you have a file for study variables

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

    // Add more state variables for other data types as needed

    // Example: Load/save all data to local storage (consider using a single key or multiple keys)
    useEffect(() => {
        const storedData = localStorage.getItem('globalAppData');
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            setStudies(parsedData?.studies || initialStudies || []);
            setInvestigations(parsedData?.investigations || {});        // One investigation
            setAuthors(parsedData?.authors || initialAuthors || []);
            setTestSetups(parsedData?.testSetups || initialTestSetups || []);
            setPublications(parsedData?.publications || initialPublications || []);
            setStudyVariables(parsedData?.studyVariables || initialStudyVariables || []); // Load study variables
            // ... set other states
        }
    }, []);

      
    useEffect(() => {
        const dataToStore = {
            studies,
            investigations,
            authors,
            testSetups,
            publications,
            selectedTestSetup,
            studyVariables
            // ... include other states
        };
        localStorage.setItem('globalAppData', JSON.stringify(dataToStore));
    }, [studies, investigations, authors, testSetups, selectedTestSetup, studyVariables]); // Add all dependent states here

    const dataMap = {
        studies: [studies, setStudies],
        authors: [authors, setAuthors],
        testSetups: [testSetups, setTestSetups],
        investigations: [investigations, setInvestigations],
        publications: [publications, setPublications],
        selectedTestSetup: [selectedTestSetup, setSelectedTestSetup],
        studyVariables: [studyVariables, setStudyVariables]
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
        dataMap
    };

    return (
        <GlobalDataContext.Provider value={value}>
            {children}
        </GlobalDataContext.Provider>
    );
};