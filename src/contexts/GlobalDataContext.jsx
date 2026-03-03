/* eslint-disable react-refresh/only-export-components */
// src/context/GlobalDataContext.js
import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';

import { clearTree } from '../utils/indexedTreeStore';
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
    PROJECT_SCHEMA_VERSION,
    PROJECT_STATE_KEYS,
    ensureProjectSchemaVersion,
    loadGlobalTestSetupsWithMigrations,
    loadProjectStateWithMigrations,
    writeProjectStateSnapshot
} from './storageSchema';
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
    const DEFAULT_PROJECT_NAME = 'Single Run Sietze';
    const MULTI_RUN_EXAMPLE_PROJECT_ID = 'example-multi-run';
    const MULTI_RUN_EXAMPLE_PROJECT_NAME = 'Multi Run Milling';

    // Always merge example projects into the list, deduplicating by id
    const getMergedProjects = () => {
        const loaded = loadFromLocalStorage('globalAppData_projects', []);
        // Example projects from useExampleProjects
        const exampleProjects = [
            { id: DEFAULT_PROJECT_ID, name: DEFAULT_PROJECT_NAME },
            { id: MULTI_RUN_EXAMPLE_PROJECT_ID, name: MULTI_RUN_EXAMPLE_PROJECT_NAME }
        ];
        // Merge and deduplicate by id
        const all = [...loaded, ...exampleProjects];
        const deduped = [];
        const seen = new Set();
        for (const proj of all) {
            if (proj && proj.id && !seen.has(proj.id)) {
                deduped.push(proj);
                seen.add(proj.id);
            }
        }
        // Always put example projects at the top
        const isExample = (p) => exampleProjects.some(e => e.id === p.id);
        return [
            ...deduped.filter(isExample),
            ...deduped.filter(p => !isExample(p))
        ];
    };

    const initialProjects = getMergedProjects();
    const [projects, setProjects] = useState(() => initialProjects);
    const initialCurrentProjectId = loadFromLocalStorage('globalAppData_currentProjectId', (initialProjects[0] && initialProjects[0].id) || DEFAULT_PROJECT_ID);
    const [currentProjectId, setCurrentProjectId] = useState(() => initialCurrentProjectId);
    // Ensure projects list always contains example projects, even if localStorage changes
    useEffect(() => {
        setProjects(getMergedProjects());
    }, []);

    // helper to construct per-project storage keys
    const projectKey = useCallback(
        (k, projectId = currentProjectId) => `globalAppData_${projectId}_${k}`,
        [currentProjectId]
    );

    const KEY_FALLBACKS = {
        selectedTestSetupId: null,
        experimentType: DEFAULT_EXPERIMENT_TYPE_ID,
        investigation: {},
        pageTabStates: {},
    };

    const getKeyFallback = (key) => {
        if (Object.prototype.hasOwnProperty.call(KEY_FALLBACKS, key)) {
            return KEY_FALLBACKS[key];
        }
        return [];
    };

    // Helper to get baseline defaults for example project or empty for new projects
    const getDefaultValue = (key, isEmpty = false, projectId = DEFAULT_PROJECT_ID) => {
        const fallback = getKeyFallback(key);
        if (isEmpty) return fallback;
        const exampleProjectData = getExampleProjectData(projectId);
        if (!exampleProjectData) return fallback;
        const ls = exampleProjectData.localStorage;
        const canonicalKey = `globalAppData_${projectId}_${key}`;
        const legacyInvestigationKey = `globalAppData_${projectId}_investigations`;
        const rawValue = key === 'investigation'
            ? (ls[canonicalKey] ?? ls[legacyInvestigationKey])
            : ls[canonicalKey];
        if (rawValue) {
            try { return JSON.parse(rawValue); } catch (e) { return fallback; }
        }
        return fallback;
    };

    const getProjectDefaultValue = (projectId, key) => {
        const isExample = isExampleProject(projectId);
        return getDefaultValue(key, !isExample, projectId);
    };

    const loadProjectStateSnapshot = (projectId) => {
        return loadProjectStateWithMigrations({
            projectId,
            resolveDefaultValue: (key) => getProjectDefaultValue(projectId, key)
        }).state;
    };

    const [initialProjectState] = useState(() => loadProjectStateSnapshot(initialCurrentProjectId));
    const [initialTestSetupsState] = useState(() => loadGlobalTestSetupsWithMigrations({
        fallback: getDefaultValue('testSetups', false)
    }).testSetups);

    // Lazy initialization for all state variables from per-project localStorage
    const [studies, setStudies] = useState(() => initialProjectState.studies);
    const [investigation, setInvestigation] = useState(() => initialProjectState.investigation);
    const [contacts, setContacts] = useState(() => initialProjectState.contacts);
    // Test setups are global and shared across all projects (not per-project)
    const [testSetups, setTestSetups] = useState(() => initialTestSetupsState);
    const [publications, setPublications] = useState(() => initialProjectState.publications);
    const [selectedTestSetupId, setSelectedTestSetupId] = useState(() => initialProjectState.selectedTestSetupId);
    const [studyVariables, setStudyVariables] = useState(() => initialProjectState.studyVariables);
    const [measurementProtocols, setMeasurementProtocols] = useState(() => initialProjectState.measurementProtocols);
    const [processingProtocols, setProcessingProtocols] = useState(() => initialProjectState.processingProtocols);
    const [studyToMeasurementProtocolSelection, setStudyToMeasurementProtocolSelection] = useState(() => initialProjectState.studyToMeasurementProtocolSelection);
    const [studyToProcessingProtocolSelection, setStudyToProcessingProtocolSelection] = useState(() => initialProjectState.studyToProcessingProtocolSelection);
    const [experimentType, setExperimentType] = useState(() => initialProjectState.experimentType || DEFAULT_EXPERIMENT_TYPE_ID);

    // Mappings
    const [studyToStudyVariableMapping, setStudyToStudyVariableMapping] = useState(() => initialProjectState.studyToStudyVariableMapping);
    const [sensorToMeasurementProtocolMapping, setSensorToMeasurementProtocolMapping] = useState(() => initialProjectState.sensorToMeasurementProtocolMapping);
    const [studyToSensorMeasurementMapping, setStudyToSensorMeasurementMapping] = useState(() => initialProjectState.studyToSensorMeasurementMapping);
    const [sensorToProcessingProtocolMapping, setSensorToProcessingProtocolMapping] = useState(() => initialProjectState.sensorToProcessingProtocolMapping);
    const [studyToSensorProcessingMapping, setStudyToSensorProcessingMapping] = useState(() => initialProjectState.studyToSensorProcessingMapping);

    const [screenWidth, setScreenWidth] = useState("max-w-5xl");
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
    }, [experimentType, setStudies]);
    // Selected dataset (root folder + indexed file tree) — managed by useDatasetStore (scoped to currentProjectId)
    const { selectedDataset, setSelectedDataset, loadDatasetSubtree, initHydrated } = useDatasetStore(currentProjectId);
    // In-app explorer control: promise-based API decoupled from visibility
    // Parent component (IsaQuestionnaire) controls visibility via local state
    // This context only manages the promise resolution for async workflows
    const [explorerOpen, setExplorerOpen] = useState(false);
    const explorerResolveRef = useRef(null);
    // Initialize example projects using hook
    useExampleProjects(setTestSetups, loadFromLocalStorage);

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

    const applyProjectStateToMemory = (nextState) => {
        setStudies(nextState.studies);
        setInvestigation(nextState.investigation);
        setContacts(nextState.contacts);
        setPublications(nextState.publications);
        setSelectedTestSetupId(nextState.selectedTestSetupId);
        setStudyVariables(nextState.studyVariables);
        setMeasurementProtocols(nextState.measurementProtocols);
        setProcessingProtocols(nextState.processingProtocols);
        setExperimentType(nextState.experimentType || DEFAULT_EXPERIMENT_TYPE_ID);
        setStudyToMeasurementProtocolSelection(nextState.studyToMeasurementProtocolSelection);
        setStudyToProcessingProtocolSelection(nextState.studyToProcessingProtocolSelection);
        setStudyToStudyVariableMapping(nextState.studyToStudyVariableMapping);
        setSensorToMeasurementProtocolMapping(nextState.sensorToMeasurementProtocolMapping);
        setStudyToSensorMeasurementMapping(nextState.studyToSensorMeasurementMapping);
        setSensorToProcessingProtocolMapping(nextState.sensorToProcessingProtocolMapping);
        setStudyToSensorProcessingMapping(nextState.studyToSensorProcessingMapping);
        setPageTabStates(nextState.pageTabStates || {});
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
            ensureProjectSchemaVersion({ projectId: id, schemaVersion: PROJECT_SCHEMA_VERSION });
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
                        studyToMeasurementProtocolSelection: setStudyToMeasurementProtocolSelection,
                        studyToProcessingProtocolSelection: setStudyToProcessingProtocolSelection,
                        experimentType: setExperimentType,
                        studyToStudyVariableMapping: setStudyToStudyVariableMapping,
                        sensorToMeasurementProtocolMapping: setSensorToMeasurementProtocolMapping,
                        studyToSensorMeasurementMapping: setStudyToSensorMeasurementMapping,
                        sensorToProcessingProtocolMapping: setSensorToProcessingProtocolMapping,
                        studyToSensorProcessingMapping: setStudyToSensorProcessingMapping,
                        pageTabStates: setPageTabStates
                    }
                });
                ensureProjectSchemaVersion({ projectId: id, schemaVersion: PROJECT_SCHEMA_VERSION });
            } else {
                // For non-example projects, reset to empty defaults
                const resetState = PROJECT_STATE_KEYS.reduce((accumulator, key) => {
                    accumulator[key] = getProjectDefaultValue(id, key);
                    return accumulator;
                }, {});

                writeProjectStateSnapshot({
                    projectId: id,
                    state: resetState,
                    schemaVersion: PROJECT_SCHEMA_VERSION
                });

                // Clear IndexedDB tree for this project
                try { await clearTree(id); } catch (e) { console.warn('[GlobalDataContext] resetProject: clearTree failed', e); }
                clearProjectDatasetName(id);
                clearProjectDatasetStats(id);

                // If the reset project is currently active, reload the in-memory state
                if (currentProjectId === id) {
                    applyProjectStateToMemory(resetState);
                    try { setSelectedDataset(null); } catch (e) { /* ignore */ }
                }
            }

            if (currentProjectId === id) {
                const reloadedState = loadProjectStateSnapshot(id);
                applyProjectStateToMemory(reloadedState);
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
        setCurrentProjectId(id);
        saveToLocalStorage('globalAppData_currentProjectId', id);

        // Load each piece of state from the new project's keys and replace local state
        try {
            const nextState = loadProjectStateSnapshot(id);
            applyProjectStateToMemory(nextState);
        } catch (err) {
            console.error('[GlobalDataContext] switchProject load error', err);
        }
        // Note: selectedDataset will be reloaded by useDatasetStore when projectId changes.
        // The useDatasetStore hook has projectId in its dependency array, so it will:
        // 1. Clear the current dataset (setSelectedDataset(null) implicitly)
        // 2. Load the new project's dataset from IndexedDB
        // This ensures each project has its own isolated dataset.
    }
    const switchProjectRef = useRef(switchProject);
    switchProjectRef.current = switchProject;

    // Effect for saving all data to local storage. Runs when relevant state changes.
    // OPTIMIZED: Split into separate effects to avoid mass writes on every change
    useEffect(() => {
        saveToLocalStorage(projectKey('studies', currentProjectId), studies);
    }, [studies, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage(projectKey('investigation', currentProjectId), investigation);
    }, [investigation, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage(projectKey('contacts', currentProjectId), contacts);
    }, [contacts, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage('globalAppData_testSetups', testSetups);
    }, [testSetups]);

    useEffect(() => {
        saveToLocalStorage(projectKey('publications', currentProjectId), publications);
    }, [publications, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage(projectKey('selectedTestSetupId', currentProjectId), selectedTestSetupId);
    }, [selectedTestSetupId, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage(projectKey('studyVariables', currentProjectId), studyVariables);
    }, [studyVariables, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage(projectKey('measurementProtocols', currentProjectId), measurementProtocols);
    }, [measurementProtocols, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage(projectKey('processingProtocols', currentProjectId), processingProtocols);
    }, [processingProtocols, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage(projectKey('experimentType', currentProjectId), experimentType);
    }, [experimentType, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage(projectKey('studyToMeasurementProtocolSelection', currentProjectId), studyToMeasurementProtocolSelection);
    }, [studyToMeasurementProtocolSelection, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage(projectKey('studyToProcessingProtocolSelection', currentProjectId), studyToProcessingProtocolSelection);
    }, [studyToProcessingProtocolSelection, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage(projectKey('studyToStudyVariableMapping', currentProjectId), studyToStudyVariableMapping);
    }, [studyToStudyVariableMapping, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage(projectKey('sensorToMeasurementProtocolMapping', currentProjectId), sensorToMeasurementProtocolMapping);
    }, [sensorToMeasurementProtocolMapping, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage(projectKey('studyToSensorMeasurementMapping', currentProjectId), studyToSensorMeasurementMapping);
    }, [studyToSensorMeasurementMapping, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage(projectKey('sensorToProcessingProtocolMapping', currentProjectId), sensorToProcessingProtocolMapping);
    }, [sensorToProcessingProtocolMapping, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage(projectKey('studyToSensorProcessingMapping', currentProjectId), studyToSensorProcessingMapping);
    }, [studyToSensorProcessingMapping, currentProjectId, projectKey]);

    useEffect(() => {
        saveToLocalStorage(projectKey('pageTabStates', currentProjectId), pageTabStates);
    }, [pageTabStates, currentProjectId, projectKey]);

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
                    try { switchProjectRef.current?.(currentProjectId); } catch (e) { /* ignore */ }
                }
            } catch (err) {
                console.error('[GlobalDataContext] seed example project error', err);
            }
        })();
        return () => { mounted = false; };
    }, [currentProjectId, initHydrated, selectedDataset, setSelectedDataset]);

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
        studyToMeasurementProtocolSelection,
        setStudyToMeasurementProtocolSelection,
        studyToProcessingProtocolSelection,
        setStudyToProcessingProtocolSelection,
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
