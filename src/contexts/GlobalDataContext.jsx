// src/context/GlobalDataContext.js
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

import { clearTree, importProject, loadTree } from '../utils/indexedTreeStore';
import useDatasetStore from '../hooks/useDatasetStore';
import generateId from '../utils/generateId';
import { normalizeRunCount } from '../utils/studyRuns';
import { DEFAULT_EXPERIMENT_TYPE_ID, getExperimentTypeConfig } from '../constants/experimentTypes';
import {
    setProjectDatasetName,
    clearProjectDatasetName,
    setProjectDatasetStats,
    clearProjectDatasetStats
} from '../utils/projectMetadata';
import { 
    useExampleProjects, 
    isExampleProject, 
    getExampleProjectData,
    resetExampleProject,
    seedExampleProject
} from '../hooks/useExampleProjects';

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

    // Projects list and currentProjectId (global across the app)
    const DEFAULT_PROJECT_ID = 'example-single-run';
    const DEFAULT_PROJECT_NAME = 'Single Run Sietse';
    const MULTI_RUN_EXAMPLE_PROJECT_ID = 'example-multi-run';
    const MULTI_RUN_EXAMPLE_PROJECT_NAME = 'Multi Run Milling';
    const initialProjects = loadFromLocalStorage('globalAppData_projects', [
        { id: DEFAULT_PROJECT_ID, name: DEFAULT_PROJECT_NAME },
        { id: MULTI_RUN_EXAMPLE_PROJECT_ID, name: MULTI_RUN_EXAMPLE_PROJECT_NAME }
    ]);
    const [projects, setProjects] = useState(() => initialProjects);
    const initialCurrentProjectId = loadFromLocalStorage('globalAppData_currentProjectId', (initialProjects[0] && initialProjects[0].id) || DEFAULT_PROJECT_ID);
    const [currentProjectId, setCurrentProjectId] = useState(() => initialCurrentProjectId);

    // helper to construct per-project storage keys
    const projectKey = (k, projectId = currentProjectId) => `globalAppData_${projectId}_${k}`;

    const KEY_FALLBACKS = {
        selectedTestSetupId: null,
        experimentType: DEFAULT_EXPERIMENT_TYPE_ID,
        pageTabStates: {},
    };

    const getKeyFallback = (key) => {
        if (Object.prototype.hasOwnProperty.call(KEY_FALLBACKS, key)) {
            return KEY_FALLBACKS[key];
        }
        return [];
    };

    // Helper to get baseline defaults for example project or empty for new projects
    const getDefaultValue = (key, isEmpty = false) => {
        const fallback = getKeyFallback(key);
        if (isEmpty) return fallback;
        const exampleProjectData = getExampleProjectData(DEFAULT_PROJECT_ID);
        if (!exampleProjectData) return fallback;
        const ls = exampleProjectData.localStorage;
        const lsKey = `globalAppData_default_${key}`;
        if (ls[lsKey]) {
            try { return JSON.parse(ls[lsKey]); } catch (e) { return fallback; }
        }
        return fallback;
    };

    // Lazy initialization for all state variables from per-project localStorage
    const [studies, setStudies] = useState(() => loadFromLocalStorage(projectKey('studies'), getDefaultValue('studies', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [investigation, setInvestigation] = useState(() => loadFromLocalStorage(projectKey('investigation'), getDefaultValue('investigation', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [contacts, setContacts] = useState(() => loadFromLocalStorage(projectKey('contacts'), getDefaultValue('contacts', currentProjectId !== DEFAULT_PROJECT_ID)));
    // Test setups are global and shared across all projects (not per-project)
    const [testSetups, setTestSetups] = useState(() => loadFromLocalStorage('globalAppData_testSetups', getDefaultValue('testSetups', false)));
    const [publications, setPublications] = useState(() => loadFromLocalStorage(projectKey('publications'), getDefaultValue('publications', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [selectedTestSetupId, setSelectedTestSetupId] = useState(() => loadFromLocalStorage(projectKey('selectedTestSetupId'), null));
    const [studyVariables, setStudyVariables] = useState(() => loadFromLocalStorage(projectKey('studyVariables'), getDefaultValue('studyVariables', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [measurementProtocols, setMeasurementProtocols] = useState(() => loadFromLocalStorage(projectKey('measurementProtocols'), getDefaultValue('measurementProtocols', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [processingProtocols, setProcessingProtocols] = useState(() => loadFromLocalStorage(projectKey('processingProtocols'), getDefaultValue('processingProtocols', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [experimentType, setExperimentType] = useState(() => loadFromLocalStorage(projectKey('experimentType'), DEFAULT_EXPERIMENT_TYPE_ID));

    // Mappings
    const [studyToStudyVariableMapping, setStudyToStudyVariableMapping] = useState(() => loadFromLocalStorage(projectKey('studyToStudyVariableMapping'), getDefaultValue('studyToStudyVariableMapping', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [sensorToMeasurementProtocolMapping, setSensorToMeasurementProtocolMapping] = useState(() => loadFromLocalStorage(projectKey('sensorToMeasurementProtocolMapping'), getDefaultValue('sensorToMeasurementProtocolMapping', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [studyToSensorMeasurementMapping, setStudyToSensorMeasurementMapping] = useState(() => loadFromLocalStorage(projectKey('studyToSensorMeasurementMapping'), getDefaultValue('studyToSensorMeasurementMapping', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [sensorToProcessingProtocolMapping, setSensorToProcessingProtocolMapping] = useState(() => loadFromLocalStorage(projectKey('sensorToProcessingProtocolMapping'), getDefaultValue('sensorToProcessingProtocolMapping', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [studyToSensorProcessingMapping, setStudyToSensorProcessingMapping] = useState(() => loadFromLocalStorage(projectKey('studyToSensorProcessingMapping'), getDefaultValue('studyToSensorProcessingMapping', currentProjectId !== DEFAULT_PROJECT_ID)));

    const [screenWidth, setScreenWidth] = useState("max-w-5xl");
    const [pageTabStates, setPageTabStates] = useState(() => loadFromLocalStorage(projectKey('pageTabStates'), {}));

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
    }, [experimentType, setStudies]);
    // Selected dataset (root folder + indexed file tree) — managed by useDatasetStore (scoped to currentProjectId)
    const { selectedDataset, setSelectedDataset, loadDatasetSubtree, initHydrated } = useDatasetStore(currentProjectId);
    // In-app explorer control: promise-based API decoupled from visibility
    // Parent component (IsaQuestionnaire) controls visibility via local state
    // This context only manages the promise resolution for async workflows
    const [explorerOpen, setExplorerOpen] = useState(false);
    const explorerResolveRef = useRef(null);
    // Ref that indicates the initial IndexedDB hydration has completed (success or not).
    const initLoadedRef = useRef(false);
    
    // Initialize example projects using hook
    useExampleProjects(setTestSetups, loadFromLocalStorage);

    // Migration: Add version and lastModified fields to existing test setups (runs once on mount)
    useEffect(() => {
        let migrated = false;
        setTestSetups((prev) => {
            const updated = prev.map((setup) => {
                if (setup.version === undefined || setup.lastModified === undefined) {
                    migrated = true;
                    return {
                        ...setup,
                        version: setup.version ?? 1,
                        lastModified: setup.lastModified ?? Date.now()
                    };
                }
                return setup;
            });
            return migrated ? updated : prev;
        });
    }, []); // Empty dependency array = runs once on mount

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
    function createProject(name = 'Untitled Project', initialExperimentType = DEFAULT_EXPERIMENT_TYPE_ID) {
        const id = generateId();
        const p = { id, name };
        setProjects((prev) => {
            const next = [...prev, p];
            saveToLocalStorage('globalAppData_projects', next);
            return next;
        });
        try {
            saveToLocalStorage(projectKey('experimentType', id), initialExperimentType || DEFAULT_EXPERIMENT_TYPE_ID);
        } catch (err) {
            console.warn('[GlobalDataContext] unable to seed experiment type for project', err);
        }
        // create an empty skeleton for the new project's keys
        // NOTE: do NOT automatically switch to the new project here. Selection
        // should be explicit by the user in the ProjectSessionsModal.
        return id;
    }

    const updateProjectExperimentType = (projectId, newType = DEFAULT_EXPERIMENT_TYPE_ID) => {
        if (!projectId) return;
        try {
            saveToLocalStorage(projectKey('experimentType', projectId), newType);
        } catch (err) {
            console.warn('[GlobalDataContext] unable to persist experiment type for project', projectId, err);
        }
        if (projectId === currentProjectId) {
            setExperimentType(newType);
        }
    };

    function deleteProject(id) {
        // Protect the example projects from deletion
        if (isExampleProject(id)) {
            console.warn('Example projects cannot be deleted. You can reset them to their original state instead.');
            return false;
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
        return true;
    }

    // Reset a project's stored state back to the initial defaults
    async function resetProject(id) {
        if (!id) return;
        try {
            const isExample = isExampleProject(id);

            if (isExample) {
                // Use the example projects hook for example project reset
                await resetExampleProject(id, {
                    getKeyFallback,
                    setTestSetups,
                    saveToLocalStorage,
                    currentProjectId,
                    setSelectedDataset,
                    stateSetter: {
                        studies: setStudies,
                        investigation: setInvestigation,
                        contacts: setContacts,
                        publications: setPublications,
                        selectedTestSetupId: setSelectedTestSetupId,
                        studyVariables: setStudyVariables,
                        measurementProtocols: setMeasurementProtocols,
                        processingProtocols: setProcessingProtocols,
                        experimentType: setExperimentType,
                        studyToStudyVariableMapping: setStudyToStudyVariableMapping,
                        sensorToMeasurementProtocolMapping: setSensorToMeasurementProtocolMapping,
                        studyToSensorMeasurementMapping: setStudyToSensorMeasurementMapping,
                        sensorToProcessingProtocolMapping: setSensorToProcessingProtocolMapping,
                        studyToSensorProcessingMapping: setStudyToSensorProcessingMapping
                    }
                });
            } else {
                // For non-example projects, reset to empty defaults
                const getResetValue = (key) => getKeyFallback(key);

                // Write empty baseline data into per-project localStorage keys
                saveToLocalStorage(`globalAppData_${id}_studies`, getResetValue('studies'));
                saveToLocalStorage(`globalAppData_${id}_investigation`, getResetValue('investigation'));
                saveToLocalStorage(`globalAppData_${id}_contacts`, getResetValue('contacts'));
                saveToLocalStorage(`globalAppData_${id}_publications`, getResetValue('publications'));
                saveToLocalStorage(`globalAppData_${id}_selectedTestSetupId`, getResetValue('selectedTestSetupId'));
                saveToLocalStorage(`globalAppData_${id}_studyVariables`, getResetValue('studyVariables'));
                saveToLocalStorage(`globalAppData_${id}_measurementProtocols`, getResetValue('measurementProtocols'));
                saveToLocalStorage(`globalAppData_${id}_processingProtocols`, getResetValue('processingProtocols'));
                saveToLocalStorage(`globalAppData_${id}_experimentType`, getResetValue('experimentType'));

                saveToLocalStorage(`globalAppData_${id}_studyToStudyVariableMapping`, getResetValue('studyToStudyVariableMapping'));
                saveToLocalStorage(`globalAppData_${id}_sensorToMeasurementProtocolMapping`, getResetValue('sensorToMeasurementProtocolMapping'));
                saveToLocalStorage(`globalAppData_${id}_studyToSensorMeasurementMapping`, getResetValue('studyToSensorMeasurementMapping'));
                saveToLocalStorage(`globalAppData_${id}_sensorToProcessingProtocolMapping`, getResetValue('sensorToProcessingProtocolMapping'));
                saveToLocalStorage(`globalAppData_${id}_studyToSensorProcessingMapping`, getResetValue('studyToSensorProcessingMapping'));

                // Clear IndexedDB tree for this project
                try { await clearTree(id); } catch (e) { console.warn('[GlobalDataContext] resetProject: clearTree failed', e); }
                clearProjectDatasetName(id);
                clearProjectDatasetStats(id);

                // If the reset project is currently active, reload the in-memory state
                if (currentProjectId === id) {
                    setStudies(getResetValue('studies'));
                    setInvestigation(getResetValue('investigation'));
                    setContacts(getResetValue('contacts'));
                    setPublications(getResetValue('publications'));
                    setSelectedTestSetupId(getResetValue('selectedTestSetupId'));
                    setStudyVariables(getResetValue('studyVariables'));
                    setMeasurementProtocols(getResetValue('measurementProtocols'));
                    setProcessingProtocols(getResetValue('processingProtocols'));
                    setExperimentType(getResetValue('experimentType'));

                    setStudyToStudyVariableMapping(getResetValue('studyToStudyVariableMapping'));
                    setSensorToMeasurementProtocolMapping(getResetValue('sensorToMeasurementProtocolMapping'));
                    setStudyToSensorMeasurementMapping(getResetValue('studyToSensorMeasurementMapping'));
                    setSensorToProcessingProtocolMapping(getResetValue('sensorToProcessingProtocolMapping'));
                    setStudyToSensorProcessingMapping(getResetValue('studyToSensorProcessingMapping'));

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
            const isExample = isExampleProject(id);
            const getSwitchDefault = (key) => getDefaultValue(key, !isExample);
            
            setStudies(loadFromLocalStorage(`globalAppData_${id}_studies`, getSwitchDefault('studies')));
            setInvestigation(loadFromLocalStorage(`globalAppData_${id}_investigation`, getSwitchDefault('investigation')));
            setContacts(loadFromLocalStorage(`globalAppData_${id}_contacts`, getSwitchDefault('contacts')));
                // testSetups are global; do not replace them when switching projects.
                // keep existing testSetups in memory
            setPublications(loadFromLocalStorage(`globalAppData_${id}_publications`, getSwitchDefault('publications')));
            setSelectedTestSetupId(loadFromLocalStorage(`globalAppData_${id}_selectedTestSetupId`, null));
            setStudyVariables(loadFromLocalStorage(`globalAppData_${id}_studyVariables`, getSwitchDefault('studyVariables')));
            setMeasurementProtocols(loadFromLocalStorage(`globalAppData_${id}_measurementProtocols`, getSwitchDefault('measurementProtocols')));
            setProcessingProtocols(loadFromLocalStorage(`globalAppData_${id}_processingProtocols`, getSwitchDefault('processingProtocols')));
            setExperimentType(loadFromLocalStorage(`globalAppData_${id}_experimentType`, getSwitchDefault('experimentType')));

            setStudyToStudyVariableMapping(loadFromLocalStorage(`globalAppData_${id}_studyToStudyVariableMapping`, getSwitchDefault('studyToStudyVariableMapping')));
            setSensorToMeasurementProtocolMapping(loadFromLocalStorage(`globalAppData_${id}_sensorToMeasurementProtocolMapping`, getSwitchDefault('sensorToMeasurementProtocolMapping')));
            setStudyToSensorMeasurementMapping(loadFromLocalStorage(`globalAppData_${id}_studyToSensorMeasurementMapping`, getSwitchDefault('studyToSensorMeasurementMapping')));
            setSensorToProcessingProtocolMapping(loadFromLocalStorage(`globalAppData_${id}_sensorToProcessingProtocolMapping`, getSwitchDefault('sensorToProcessingProtocolMapping')));
            setStudyToSensorProcessingMapping(loadFromLocalStorage(`globalAppData_${id}_studyToSensorProcessingMapping`, getSwitchDefault('studyToSensorProcessingMapping')));

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

    // Effect for saving all data to local storage. Runs when relevant state changes.
    // OPTIMIZED: Split into separate effects to avoid mass writes on every change
    useEffect(() => {
        saveToLocalStorage(projectKey('studies', currentProjectId), studies);
    }, [studies, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage(projectKey('investigation', currentProjectId), investigation);
    }, [investigation, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage(projectKey('contacts', currentProjectId), contacts);
    }, [contacts, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage('globalAppData_testSetups', testSetups);
    }, [testSetups]);

    useEffect(() => {
        saveToLocalStorage(projectKey('publications', currentProjectId), publications);
    }, [publications, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage(projectKey('selectedTestSetupId', currentProjectId), selectedTestSetupId);
    }, [selectedTestSetupId, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage(projectKey('studyVariables', currentProjectId), studyVariables);
    }, [studyVariables, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage(projectKey('measurementProtocols', currentProjectId), measurementProtocols);
    }, [measurementProtocols, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage(projectKey('processingProtocols', currentProjectId), processingProtocols);
    }, [processingProtocols, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage(projectKey('experimentType', currentProjectId), experimentType);
    }, [experimentType, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage(projectKey('studyToStudyVariableMapping', currentProjectId), studyToStudyVariableMapping);
    }, [studyToStudyVariableMapping, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage(projectKey('sensorToMeasurementProtocolMapping', currentProjectId), sensorToMeasurementProtocolMapping);
    }, [sensorToMeasurementProtocolMapping, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage(projectKey('studyToSensorMeasurementMapping', currentProjectId), studyToSensorMeasurementMapping);
    }, [studyToSensorMeasurementMapping, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage(projectKey('sensorToProcessingProtocolMapping', currentProjectId), sensorToProcessingProtocolMapping);
    }, [sensorToProcessingProtocolMapping, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage(projectKey('studyToSensorProcessingMapping', currentProjectId), studyToSensorProcessingMapping);
    }, [studyToSensorProcessingMapping, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage(projectKey('pageTabStates', currentProjectId), pageTabStates);
    }, [pageTabStates, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage('globalAppData_projects', projects);
    }, [projects]);

    useEffect(() => {
        saveToLocalStorage('globalAppData_currentProjectId', currentProjectId);
    }, [currentProjectId]);

    // The dataset store handles persistence and lazy-loading; expose its helpers via context below.

    // Lazy-load example project dataset if needed
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Check if we're in an example project
                if (!isExampleProject(currentProjectId)) return;
                
                // only act after dataset hydration attempt finished
                if (!initHydrated) return;

                // If an in-memory dataset already exists, no seeding needed
                if (selectedDataset) return;

                // Use the hook's seedExampleProject function
                await seedExampleProject(currentProjectId, {
                    setSelectedDataset,
                    setProjectDatasetName,
                    setProjectDatasetStats,
                    clearProjectDatasetName,
                    clearProjectDatasetStats
                });

                // Refresh in-memory app state from the newly written localStorage keys
                if (mounted) {
                    try { switchProject(currentProjectId); } catch (e) { /* ignore */ }
                }
            } catch (err) {
                console.error('[GlobalDataContext] seed example project error', err);
            }
        })();
        return () => { mounted = false; };
    }, [currentProjectId, initHydrated, selectedDataset]);

    // submission logic intentionally removed from context; use `useSubmitData` hook instead

    const dataMap = {
        studies: [studies, setStudies],
        contacts: [contacts, setContacts],
        testSetups: [testSetups, setTestSetups],
        investigation: [investigation, setInvestigation],
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
        screenWidth: [screenWidth, setScreenWidth],
        pageTabStates: [pageTabStates, setPageTabStates],
        experimentType: [experimentType, setExperimentType]
    };


    const value = {
        studies,
        setStudies,
        testSetups,
        setTestSetups,
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
        screenWidth,
        setScreenWidth,
        experimentType,
        setExperimentType,
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
    value.DEFAULT_PROJECT_ID = DEFAULT_PROJECT_ID;
    value.MULTI_RUN_EXAMPLE_PROJECT_ID = MULTI_RUN_EXAMPLE_PROJECT_ID;
    value.createProject = createProject;
    value.deleteProject = deleteProject;
    value.renameProject = renameProject;
    value.switchProject = switchProject;
    value.resetProject = resetProject;
    value.updateProjectExperimentType = updateProjectExperimentType;
    value.DEFAULT_PROJECT_ID = DEFAULT_PROJECT_ID;
    value.DEFAULT_PROJECT_NAME = DEFAULT_PROJECT_NAME;
    return (
        <GlobalDataContext.Provider value={value}>
            {children}
        </GlobalDataContext.Provider>
    );
};
