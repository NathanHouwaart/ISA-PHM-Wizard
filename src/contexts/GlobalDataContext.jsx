// src/context/GlobalDataContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import initialStudies from "../data/existingStudies.json"
import initialAuthors from "../data/existingAuthors.json";
import initialTestSetups from "../data/InitialTestSetups.json";

const GlobalDataContext = createContext();

export const useGlobalDataContext = () => {
    const context = useContext(GlobalDataContext);
    if (!context) {
        throw new Error('useGlobalDataContext must be used within a GlobalDataProvider');
    }
    return context;
};

export const GlobalDataProvider = ({ children }) => {
    const [studies, setStudies] = useState(initialStudies);
    const [investigations, setInvestigations] = useState();
    const [authors, setAuthors] = useState(initialAuthors);
    const [testSetups, setTestSetups] = useState(initialTestSetups);
    // Add more state variables for other data types as needed

    // Example: Load/save all data to local storage (consider using a single key or multiple keys)
    useEffect(() => {
        const storedData = localStorage.getItem('globalAppData');
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            setStudies(parsedData.studies || initialStudies);
            setInvestigations(parsedData.investigations);
            setAuthors(parsedData.authors || initialAuthors);
            setTestSetups(parsedData.testSetups || initialTestSetups);
            // ... set other states
        }
    }, []);

    useEffect(() => {
        const dataToStore = {
            studies,
            investigations,
            authors,
            testSetups
            // ... include other states
        };
        localStorage.setItem('globalAppData', JSON.stringify(dataToStore));
    }, [studies, investigations, authors, testSetups]); // Add all dependent states here

    const value = {
        studies,
        setStudies,
        testSetups,
        setTestSetups,
        investigations,
        setInvestigations,
        authors,
        setAuthors,
        // ... include other states and their setters
    };

    return (
        <GlobalDataContext.Provider value={value}>
            {children}
        </GlobalDataContext.Provider>
    );
};