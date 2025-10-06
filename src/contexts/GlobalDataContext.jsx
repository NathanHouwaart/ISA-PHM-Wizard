// src/context/GlobalDataContext.js
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import isaProjectExample from "../data/isa-project-example.json";

import investigationFormFields from '../data/InvestigationFormFields2.json'
import { clearTree, importProject, loadTree } from '../utils/indexedTreeStore';
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
    const DEFAULT_PROJECT_ID = 'example-project';
    const DEFAULT_PROJECT_NAME = 'Example Project';
    const initialProjects = loadFromLocalStorage('globalAppData_projects', [{ id: DEFAULT_PROJECT_ID, name: DEFAULT_PROJECT_NAME }]);
    const [projects, setProjects] = useState(() => initialProjects);
    const initialCurrentProjectId = loadFromLocalStorage('globalAppData_currentProjectId', (initialProjects[0] && initialProjects[0].id) || DEFAULT_PROJECT_ID);
    const [currentProjectId, setCurrentProjectId] = useState(() => initialCurrentProjectId);

    // helper to construct per-project storage keys
    const projectKey = (k, projectId = currentProjectId) => `globalAppData_${projectId}_${k}`;

    // Helper to get baseline defaults for example project or empty for new projects
    const getDefaultValue = (key, isEmpty = false) => {
        if (isEmpty) return key === 'investigations' ? initialFormState : (key === 'selectedTestSetupId' ? null : []);
        const ls = isaProjectExample.localStorage;
        const lsKey = `globalAppData_default_${key}`;
        if (ls[lsKey]) {
            try { return JSON.parse(ls[lsKey]); } catch (e) { return key === 'investigations' ? initialFormState : (key === 'selectedTestSetupId' ? null : []); }
        }
        return key === 'investigations' ? initialFormState : (key === 'selectedTestSetupId' ? null : []);
    };

    // Lazy initialization for all state variables from per-project localStorage
    const [studies, setStudies] = useState(() => loadFromLocalStorage(projectKey('studies'), getDefaultValue('studies', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [investigations, setInvestigations] = useState(() => loadFromLocalStorage(projectKey('investigations'), initialFormState));
    const [contacts, setContacts] = useState(() => loadFromLocalStorage(projectKey('contacts'), getDefaultValue('contacts', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [testSetups, setTestSetups] = useState(() => loadFromLocalStorage(projectKey('testSetups'), getDefaultValue('testSetups', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [publications, setPublications] = useState(() => loadFromLocalStorage(projectKey('publications'), getDefaultValue('publications', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [selectedTestSetupId, setSelectedTestSetupId] = useState(() => loadFromLocalStorage(projectKey('selectedTestSetupId'), null));
    const [studyVariables, setStudyVariables] = useState(() => loadFromLocalStorage(projectKey('studyVariables'), getDefaultValue('studyVariables', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [measurementProtocols, setMeasurementProtocols] = useState(() => loadFromLocalStorage(projectKey('measurementProtocols'), getDefaultValue('measurementProtocols', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [processingProtocols, setProcessingProtocols] = useState(() => loadFromLocalStorage(projectKey('processingProtocols'), getDefaultValue('processingProtocols', currentProjectId !== DEFAULT_PROJECT_ID)))

    // Mappings
    const [studyToStudyVariableMapping, setStudyToStudyVariableMapping] = useState(() => loadFromLocalStorage(projectKey('studyToStudyVariableMapping'), getDefaultValue('studyToStudyVariableMapping', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [sensorToMeasurementProtocolMapping, setSensorToMeasurementProtocolMapping] = useState(() => loadFromLocalStorage(projectKey('sensorToMeasurementProtocolMapping'), getDefaultValue('sensorToMeasurementProtocolMapping', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [studyToSensorMeasurementMapping, setStudyToSensorMeasurementMapping] = useState(() => loadFromLocalStorage(projectKey('studyToSensorMeasurementMapping'), getDefaultValue('studyToSensorMeasurementMapping', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [sensorToProcessingProtocolMapping, setSensorToProcessingProtocolMapping] = useState(() => loadFromLocalStorage(projectKey('sensorToProcessingProtocolMapping'), getDefaultValue('sensorToProcessingProtocolMapping', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [studyToSensorProcessingMapping, setStudyToSensorProcessingMapping] = useState(() => loadFromLocalStorage(projectKey('studyToSensorProcessingMapping'), getDefaultValue('studyToSensorProcessingMapping', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [studyToAssayMapping, setStudyToAssayMapping] = useState(() => loadFromLocalStorage(projectKey('studyToAssayMapping'), getDefaultValue('studyToAssayMapping', currentProjectId !== DEFAULT_PROJECT_ID)));

    const [screenWidth, setScreenWidth] = useState("max-w-5xl");
    const [pageTabStates, setPageTabStates] = useState(() => loadFromLocalStorage(projectKey('pageTabStates'), {}));
    // Selected dataset (root folder + indexed file tree) — managed by useDatasetStore (scoped to currentProjectId)
    const { selectedDataset, setSelectedDataset, loadDatasetSubtree, initHydrated } = useDatasetStore(currentProjectId);
    // In-app explorer control: promise-based API decoupled from visibility
    // Parent component (IsaQuestionnaire) controls visibility via local state
    // This context only manages the promise resolution for async workflows
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

    const closeExplorer = () => {
        setExplorerOpen(false);
    };

    const resolveExplorerSelection = (value) => {
        if (explorerResolveRef.current) {
            explorerResolveRef.current(value);
            explorerResolveRef.current = null;
        }
        setExplorerOpen(false);
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
        // NOTE: do NOT automatically switch to the new project here. Selection
        // should be explicit by the user in the ProjectSessionsModal.
        return id;
    }

    function deleteProject(id) {
        // Protect the default/example project from deletion
        if (id === DEFAULT_PROJECT_ID) {
            alert('The default example project cannot be deleted. You can reset it to its original state instead.');
            return;
        }
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

    // Reset a project's stored state back to the initial defaults (useful for the built-in example project)
    async function resetProject(id) {
        if (!id) return;
        try {
            // For example project, use isa-project-example.json baseline; for others, use empty defaults
            const isExampleProject = id === DEFAULT_PROJECT_ID;
            const baselineLS = isaProjectExample.localStorage;
            
            const getResetValue = (key) => {
                if (!isExampleProject) return key === 'investigations' ? initialFormState : (key === 'selectedTestSetupId' ? null : []);
                const lsKey = `globalAppData_default_${key}`;
                if (baselineLS[lsKey]) {
                    try { return JSON.parse(baselineLS[lsKey]); } catch (e) { return key === 'investigations' ? initialFormState : (key === 'selectedTestSetupId' ? null : []); }
                }
                return key === 'investigations' ? initialFormState : (key === 'selectedTestSetupId' ? null : []);
            };

            // Write the baseline data into per-project localStorage keys
            saveToLocalStorage(`globalAppData_${id}_studies`, getResetValue('studies'));
            saveToLocalStorage(`globalAppData_${id}_investigations`, getResetValue('investigations'));
            saveToLocalStorage(`globalAppData_${id}_contacts`, getResetValue('contacts'));
            saveToLocalStorage(`globalAppData_${id}_testSetups`, getResetValue('testSetups'));
            saveToLocalStorage(`globalAppData_${id}_publications`, getResetValue('publications'));
            saveToLocalStorage(`globalAppData_${id}_selectedTestSetupId`, getResetValue('selectedTestSetupId'));
            saveToLocalStorage(`globalAppData_${id}_studyVariables`, getResetValue('studyVariables'));
            saveToLocalStorage(`globalAppData_${id}_measurementProtocols`, getResetValue('measurementProtocols'));
            saveToLocalStorage(`globalAppData_${id}_processingProtocols`, getResetValue('processingProtocols'));

            saveToLocalStorage(`globalAppData_${id}_studyToStudyVariableMapping`, getResetValue('studyToStudyVariableMapping'));
            saveToLocalStorage(`globalAppData_${id}_sensorToMeasurementProtocolMapping`, getResetValue('sensorToMeasurementProtocolMapping'));
            saveToLocalStorage(`globalAppData_${id}_studyToSensorMeasurementMapping`, getResetValue('studyToSensorMeasurementMapping'));
            saveToLocalStorage(`globalAppData_${id}_sensorToProcessingProtocolMapping`, getResetValue('sensorToProcessingProtocolMapping'));
            saveToLocalStorage(`globalAppData_${id}_studyToSensorProcessingMapping`, getResetValue('studyToSensorProcessingMapping'));
            saveToLocalStorage(`globalAppData_${id}_studyToAssayMapping`, getResetValue('studyToAssayMapping'));

            // Clear IndexedDB tree for this project
            try { await clearTree(id); } catch (e) { console.warn('[GlobalDataContext] resetProject: clearTree failed', e); }

            // If this is the example project, re-import the compressed nodes into IndexedDB
            if (isExampleProject) {
                const seedFlagKey = `globalAppData_${DEFAULT_PROJECT_ID}_seeded_v1`;
                try {
                    // Import the example package into the DB under the example project id
                    await importProject(isaProjectExample, id);
                    // Mark seeded so other effects won't re-import unnecessarily
                    try { localStorage.setItem(seedFlagKey, '1'); } catch (e) { /* ignore */ }
                    // Load the tree and set in-memory dataset
                    try {
                        const root = await loadTree(id);
                        if (currentProjectId === id) {
                            try { setSelectedDataset(root); } catch (e) { /* ignore */ }
                        }
                    } catch (e) {
                        console.warn('[GlobalDataContext] resetProject: loadTree after import failed', e);
                    }
                } catch (e) {
                    console.warn('[GlobalDataContext] resetProject: importProject failed', e);
                }
            }

            // If the reset project is currently active, reload the in-memory state to match the baseline
            if (currentProjectId === id) {
                setStudies(getResetValue('studies'));
                setInvestigations(getResetValue('investigations'));
                setContacts(getResetValue('contacts'));
                setTestSetups(getResetValue('testSetups'));
                setPublications(getResetValue('publications'));
                setSelectedTestSetupId(getResetValue('selectedTestSetupId'));
                setStudyVariables(getResetValue('studyVariables'));
                setMeasurementProtocols(getResetValue('measurementProtocols'));
                setProcessingProtocols(getResetValue('processingProtocols'));

                setStudyToStudyVariableMapping(getResetValue('studyToStudyVariableMapping'));
                setSensorToMeasurementProtocolMapping(getResetValue('sensorToMeasurementProtocolMapping'));
                setStudyToSensorMeasurementMapping(getResetValue('studyToSensorMeasurementMapping'));
                setSensorToProcessingProtocolMapping(getResetValue('sensorToProcessingProtocolMapping'));
                setStudyToSensorProcessingMapping(getResetValue('studyToSensorProcessingMapping'));
                setStudyToAssayMapping(getResetValue('studyToAssayMapping'));

                // If not already set by import above, ensure dataset is cleared to reflect DB state
                if (!isExampleProject) {
                    try { setSelectedDataset(null); } catch (e) { /* ignore */ }
                }
            }
        } catch (err) {
            console.error('[GlobalDataContext] resetProject error', err);
        }
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
            const isExampleProject = id === DEFAULT_PROJECT_ID;
            const getSwitchDefault = (key) => getDefaultValue(key, !isExampleProject);
            
            setStudies(loadFromLocalStorage(`globalAppData_${id}_studies`, getSwitchDefault('studies')));
            setInvestigations(loadFromLocalStorage(`globalAppData_${id}_investigations`, initialFormState));
            setContacts(loadFromLocalStorage(`globalAppData_${id}_contacts`, getSwitchDefault('contacts')));
            setTestSetups(loadFromLocalStorage(`globalAppData_${id}_testSetups`, getSwitchDefault('testSetups')));
            setPublications(loadFromLocalStorage(`globalAppData_${id}_publications`, getSwitchDefault('publications')));
            setSelectedTestSetupId(loadFromLocalStorage(`globalAppData_${id}_selectedTestSetupId`, null));
            setStudyVariables(loadFromLocalStorage(`globalAppData_${id}_studyVariables`, getSwitchDefault('studyVariables')));
            setMeasurementProtocols(loadFromLocalStorage(`globalAppData_${id}_measurementProtocols`, getSwitchDefault('measurementProtocols')));
            setProcessingProtocols(loadFromLocalStorage(`globalAppData_${id}_processingProtocols`, getSwitchDefault('processingProtocols')));

            setStudyToStudyVariableMapping(loadFromLocalStorage(`globalAppData_${id}_studyToStudyVariableMapping`, getSwitchDefault('studyToStudyVariableMapping')));
            setSensorToMeasurementProtocolMapping(loadFromLocalStorage(`globalAppData_${id}_sensorToMeasurementProtocolMapping`, getSwitchDefault('sensorToMeasurementProtocolMapping')));
            setStudyToSensorMeasurementMapping(loadFromLocalStorage(`globalAppData_${id}_studyToSensorMeasurementMapping`, getSwitchDefault('studyToSensorMeasurementMapping')));
            setSensorToProcessingProtocolMapping(loadFromLocalStorage(`globalAppData_${id}_sensorToProcessingProtocolMapping`, getSwitchDefault('sensorToProcessingProtocolMapping')));
            setStudyToSensorProcessingMapping(loadFromLocalStorage(`globalAppData_${id}_studyToSensorProcessingMapping`, getSwitchDefault('studyToSensorProcessingMapping')));
            setStudyToAssayMapping(loadFromLocalStorage(`globalAppData_${id}_studyToAssayMapping`, getSwitchDefault('studyToAssayMapping')));

            setPageTabStates(loadFromLocalStorage(`globalAppData_${id}_pageTabStates`, {}));
        } catch (err) {
            console.error('[GlobalDataContext] switchProject load error', err);
        }
        // Note: selectedDataset will be reloaded by useDatasetStore when projectId changes.
        // The useDatasetStore hook has projectId in its dependency array, so it will:
        // 1. Clear the current dataset (setSelectedDataset(null) implicitly)
        // 2. Load the new project's dataset from IndexedDB
        // This ensures each project has its own isolated dataset.
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

    // If we are running for the example project and the IndexedDB has no tree yet (fresh incognito)
    // import the compressed nodes and localStorage snapshot from `isa-project-example.json` once.
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (currentProjectId !== DEFAULT_PROJECT_ID) return;
                // only act after dataset hydration attempt finished
                if (!initHydrated) return;

                // If an in-memory dataset already exists, no seeding needed
                if (selectedDataset) return;

                // Use a small localStorage flag to avoid double-imports across reloads
                const seedFlagKey = `globalAppData_${DEFAULT_PROJECT_ID}_seeded_v1`;
                if (!localStorage.getItem(seedFlagKey)) {
                    console.debug('[GlobalDataContext] seeding example project from isa-project-example.json');
                    try {
                        await importProject(isaProjectExample, DEFAULT_PROJECT_ID);
                        localStorage.setItem(seedFlagKey, '1');
                    } catch (e) {
                        console.warn('[GlobalDataContext] example project import failed', e);
                    }
                }

                // Try to load the root from the DB and set it into memory
                try {
                    const root = await loadTree(DEFAULT_PROJECT_ID);
                    if (mounted && root) {
                        setSelectedDataset(root);
                    }
                } catch (e) {
                    console.warn('[GlobalDataContext] loadTree after import failed', e);
                }

                // Refresh in-memory app state from the newly written localStorage keys
                try { switchProject(DEFAULT_PROJECT_ID); } catch (e) { /* ignore */ }
            } catch (err) {
                console.error('[GlobalDataContext] seed example project error', err);
            }
        })();
        return () => { mounted = false; };
    }, [currentProjectId, initHydrated, selectedDataset]);

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
        closeExplorer,
        resolveExplorerSelection,
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
    value.resetProject = resetProject;
    value.DEFAULT_PROJECT_ID = DEFAULT_PROJECT_ID;
    value.DEFAULT_PROJECT_NAME = DEFAULT_PROJECT_NAME;
    return (
        <GlobalDataContext.Provider value={value}>
            {children}
        </GlobalDataContext.Provider>
    );
};