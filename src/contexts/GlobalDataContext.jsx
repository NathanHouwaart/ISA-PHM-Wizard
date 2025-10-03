// src/context/GlobalDataContext.js
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import initialStudies from "../data/existingStudies.json"
import initialContacts from "../data/existingContacts.json";
import initialTestSetups from "../data/InitialTestSetups.json";
import initialPublications from "../data/existingPublications.json";
import initialStudyVariables from "../data/existingStudyVariables.json";
import existingStudyToStudyVariableMapping from "../data/existingStudyToStudyVariableMapping.json";
import existingStudyToSensorMeasurementMapping from "../data/existingStudyToSensorMeasurementMapping.json";
import initialProcessingProtocols from "../data/InitialProcessingProtocols.json";

import investigationFormFields from '../data/InvestigationFormFields2.json'
import useDatasetStore from '../hooks/useDatasetStore';
import { v4 as uuidv4 } from 'uuid';

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

// Helper to write JSON to localStorage
const saveToLocalStorage = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        console.error('[GlobalDataContext] saveToLocalStorage error', err);
    }
};

// Main Data Provider Component
export const GlobalDataProvider = ({ children }) => {

    const initialFormState = investigationFormFields.fields.reduce((acc, field) => {
        acc[field.id] = ''; // Initialize each field with an empty string
        return acc;
    }, {});

    // Projects list and currentProjectId (global across the app)
    const initialProjects = loadFromLocalStorage('globalAppData_projects', [{ id: 'default', name: 'Default Project' }]);
    const [projects, setProjects] = useState(() => initialProjects);
    const initialCurrentProjectId = loadFromLocalStorage('globalAppData_currentProjectId', (initialProjects[0] && initialProjects[0].id) || 'default');
    const [currentProjectId, setCurrentProjectId] = useState(() => initialCurrentProjectId);

    // helper to construct per-project storage keys
    const projectKey = (k, projectId = currentProjectId) => `globalAppData_${projectId}_${k}`;

    // Lazy initialization for all state variables from per-project localStorage
    const [studies, setStudies] = useState(() => loadFromLocalStorage(projectKey('studies'), initialStudies));
    const [investigations, setInvestigations] = useState(() => loadFromLocalStorage(projectKey('investigations'), initialFormState));
    const [contacts, setContacts] = useState(() => loadFromLocalStorage(projectKey('contacts'), initialContacts));
    const [testSetups, setTestSetups] = useState(() => loadFromLocalStorage(projectKey('testSetups'), initialTestSetups));
    const [publications, setPublications] = useState(() => loadFromLocalStorage(projectKey('publications'), initialPublications));
    const [selectedTestSetupId, setSelectedTestSetupId] = useState(() => loadFromLocalStorage(projectKey('selectedTestSetupId'), null));
    const [studyVariables, setStudyVariables] = useState(() => loadFromLocalStorage(projectKey('studyVariables'), initialStudyVariables));
    const [measurementProtocols, setMeasurementProtocols] = useState(() => loadFromLocalStorage(projectKey('measurementProtocols'), []));
    const [processingProtocols, setProcessingProtocols] = useState(() => loadFromLocalStorage(projectKey('processingProtocols'), initialProcessingProtocols))

    // Mappings
    const [studyToStudyVariableMapping, setStudyToStudyVariableMapping] = useState(() => loadFromLocalStorage(projectKey('studyToStudyVariableMapping'), existingStudyToStudyVariableMapping));
    const [sensorToMeasurementProtocolMapping, setSensorToMeasurementProtocolMapping] = useState(() => loadFromLocalStorage(projectKey('sensorToMeasurementProtocolMapping'), []));
    const [studyToSensorMeasurementMapping, setStudyToSensorMeasurementMapping] = useState(() => loadFromLocalStorage(projectKey('studyToSensorMeasurementMapping'), existingStudyToSensorMeasurementMapping));
    const [sensorToProcessingProtocolMapping, setSensorToProcessingProtocolMapping] = useState(() => loadFromLocalStorage(projectKey('sensorToProcessingProtocolMapping'), []));
    const [studyToSensorProcessingMapping, setStudyToSensorProcessingMapping] = useState(() => loadFromLocalStorage(projectKey('studyToSensorProcessingMapping'), []));
    const [studyToAssayMapping, setStudyToAssayMapping] = useState(() => loadFromLocalStorage(projectKey('studyToAssayMapping'), []));

    const [screenWidth, setScreenWidth] = useState("max-w-5xl");
    const [pageTabStates, setPageTabStates] = useState(() => loadFromLocalStorage(projectKey('pageTabStates'), {}));
    // Selected dataset (root folder + indexed file tree) — managed by useDatasetStore (scoped to currentProjectId)
    const { selectedDataset, setSelectedDataset, loadDatasetSubtree, initHydrated } = useDatasetStore(currentProjectId);
    // In-app explorer control: allow other components to open the app explorer and await a selection
    const [explorerOpen, setExplorerOpen] = useState(false);
    const explorerResolveRef = useRef(null);
    // Ref that indicates the initial IndexedDB hydration has completed (success or not).
    const initLoadedRef = useRef(false);

    const openExplorer = () => {
        return new Promise((resolve) => {
            explorerResolveRef.current = resolve;
            setExplorerOpen(true);
        });
    };

    const resolveExplorer = (value) => {
        try {
            if (explorerResolveRef.current) explorerResolveRef.current(value);
        } finally {
            explorerResolveRef.current = null;
            setExplorerOpen(false);
        }
    };

    // Project management helpers
    function createProject(name = 'Untitled Project') {
        const id = uuidv4();
        const p = { id, name };
        setProjects((prev) => {
            const next = [...prev, p];
            saveToLocalStorage('globalAppData_projects', next);
            return next;
        });
        // create an empty skeleton for the new project's keys
        setCurrentProjectId(id);
        saveToLocalStorage('globalAppData_currentProjectId', id);
        return id;
    }

    function deleteProject(id) {
        setProjects((prev) => {
            const next = prev.filter((p) => p.id !== id);
            saveToLocalStorage('globalAppData_projects', next);
            return next;
        });
        // if the deleted project was active, switch to the first project if present
        setCurrentProjectId((cur) => {
            if (cur === id) {
                const remaining = loadFromLocalStorage('globalAppData_projects', []);
                const nextId = (remaining[0] && remaining[0].id) || null;
                saveToLocalStorage('globalAppData_currentProjectId', nextId);
                return nextId;
            }
            return cur;
        });
    }

    function renameProject(id, newName) {
        setProjects((prev) => {
            const next = prev.map((p) => (p.id === id ? { ...p, name: newName } : p));
            saveToLocalStorage('globalAppData_projects', next);
            return next;
        });
    }

    // Switch active project and reload per-project state from storage
    function switchProject(id) {
        if (!id) return;
        const prevId = currentProjectId;
        setCurrentProjectId(id);
        saveToLocalStorage('globalAppData_currentProjectId', id);

        // Load each piece of state from the new project's keys and replace local state
        try {
            setStudies(loadFromLocalStorage(`globalAppData_${id}_studies`, initialStudies));
            setInvestigations(loadFromLocalStorage(`globalAppData_${id}_investigations`, initialFormState));
            setContacts(loadFromLocalStorage(`globalAppData_${id}_contacts`, initialContacts));
            setTestSetups(loadFromLocalStorage(`globalAppData_${id}_testSetups`, initialTestSetups));
            setPublications(loadFromLocalStorage(`globalAppData_${id}_publications`, initialPublications));
            setSelectedTestSetupId(loadFromLocalStorage(`globalAppData_${id}_selectedTestSetupId`, null));
            setStudyVariables(loadFromLocalStorage(`globalAppData_${id}_studyVariables`, initialStudyVariables));
            setMeasurementProtocols(loadFromLocalStorage(`globalAppData_${id}_measurementProtocols`, []));
            setProcessingProtocols(loadFromLocalStorage(`globalAppData_${id}_processingProtocols`, initialProcessingProtocols));

            setStudyToStudyVariableMapping(loadFromLocalStorage(`globalAppData_${id}_studyToStudyVariableMapping`, existingStudyToStudyVariableMapping));
            setSensorToMeasurementProtocolMapping(loadFromLocalStorage(`globalAppData_${id}_sensorToMeasurementProtocolMapping`, []));
            setStudyToSensorMeasurementMapping(loadFromLocalStorage(`globalAppData_${id}_studyToSensorMeasurementMapping`, existingStudyToSensorMeasurementMapping));
            setSensorToProcessingProtocolMapping(loadFromLocalStorage(`globalAppData_${id}_sensorToProcessingProtocolMapping`, []));
            setStudyToSensorProcessingMapping(loadFromLocalStorage(`globalAppData_${id}_studyToSensorProcessingMapping`, []));
            setStudyToAssayMapping(loadFromLocalStorage(`globalAppData_${id}_studyToAssayMapping`, []));

            setPageTabStates(loadFromLocalStorage(`globalAppData_${id}_pageTabStates`, {}));
        } catch (err) {
            console.error('[GlobalDataContext] switchProject load error', err);
        }
        // Note: selectedDataset in IndexedDB is currently global; see next steps to scope datasets per project.
    }

    // Effect for saving all data to local storage
    // This useEffect will run whenever any of its dependencies change, saving the latest state.
    useEffect(() => {
        // const dataToStore = {
        //     studies,
        //     investigations,
        //     contacts,
        //     testSetups,
        //     publications,
        //     selectedTestSetupId,
        //     studyVariables,
        //     studyToStudyVariableMapping,
        //     studyToSensorMeasurementMapping,
        //     studyToSensorProcessingMapping,
        //     studyToAssayMapping
        // };

    // per-project storage keys
    saveToLocalStorage(projectKey('studies', currentProjectId), studies);
    saveToLocalStorage(projectKey('investigations', currentProjectId), investigations);
    saveToLocalStorage(projectKey('contacts', currentProjectId), contacts);
    saveToLocalStorage(projectKey('testSetups', currentProjectId), testSetups);
    saveToLocalStorage(projectKey('publications', currentProjectId), publications);
    saveToLocalStorage(projectKey('selectedTestSetupId', currentProjectId), selectedTestSetupId);
    saveToLocalStorage(projectKey('studyVariables', currentProjectId), studyVariables);
    saveToLocalStorage(projectKey('measurementProtocols', currentProjectId), measurementProtocols);
    saveToLocalStorage(projectKey('processingProtocols', currentProjectId), processingProtocols);

    saveToLocalStorage(projectKey('studyToStudyVariableMapping', currentProjectId), studyToStudyVariableMapping);
    saveToLocalStorage(projectKey('sensorToMeasurementProtocolMapping', currentProjectId), sensorToMeasurementProtocolMapping);
    saveToLocalStorage(projectKey('studyToSensorMeasurementMapping', currentProjectId), studyToSensorMeasurementMapping);
    saveToLocalStorage(projectKey('sensorToProcessingProtocolMapping', currentProjectId), sensorToProcessingProtocolMapping);
    saveToLocalStorage(projectKey('studyToSensorProcessingMapping', currentProjectId), studyToSensorProcessingMapping);
    saveToLocalStorage(projectKey('studyToAssayMapping', currentProjectId), studyToAssayMapping);
    saveToLocalStorage(projectKey('pageTabStates', currentProjectId), pageTabStates);

    // store projects list and active project id globally
    saveToLocalStorage('globalAppData_projects', projects);
    saveToLocalStorage('globalAppData_currentProjectId', currentProjectId);
        
        // selectedDataset is persisted to IndexedDB; do not store large trees in localStorage.
        // console.log("Global data saved to localStorage:", dataToStore);
        }, [
        studies, investigations, contacts, testSetups,
        publications, selectedTestSetupId, studyVariables, measurementProtocols, processingProtocols,
        studyToStudyVariableMapping, sensorToMeasurementProtocolMapping, studyToSensorMeasurementMapping,
        sensorToProcessingProtocolMapping, studyToSensorProcessingMapping,
        studyToAssayMapping, pageTabStates
    ]);

    // The dataset store handles persistence and lazy-loading; expose its helpers via context below.

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
        contacts: [contacts, setContacts],
        testSetups: [testSetups, setTestSetups],
        investigations: [investigations, setInvestigations],
        publications: [publications, setPublications],
        selectedTestSetupId: [selectedTestSetupId, setSelectedTestSetupId],
        studyVariables: [studyVariables, setStudyVariables],
        measurementProtocols: [measurementProtocols, setMeasurementProtocols],
        processingProtocols: [processingProtocols, setProcessingProtocols],
        studyToStudyVariableMapping: [studyToStudyVariableMapping, setStudyToStudyVariableMapping],
        sensorToMeasurementProtocolMapping: [sensorToMeasurementProtocolMapping, setSensorToMeasurementProtocolMapping],
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
        studyToAssayMapping,
        setStudyToAssayMapping,
        screenWidth,
        setScreenWidth,
        pageTabStates,
        setPageTabStates,
        selectedDataset,
        setSelectedDataset,
        loadDatasetSubtree,
        explorerOpen,
        setExplorerOpen,
        openExplorer,
        resolveExplorer,
        initDatasetHydrated: initHydrated,
        dataMap
    };
    // add project helpers and list
    value.projects = projects;
    value.currentProjectId = currentProjectId;
    value.createProject = createProject;
    value.deleteProject = deleteProject;
    value.renameProject = renameProject;
    value.switchProject = switchProject;
    return (
        <GlobalDataContext.Provider value={value}>
            {children}
        </GlobalDataContext.Provider>
    );
};