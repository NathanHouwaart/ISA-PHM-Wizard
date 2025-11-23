// src/context/GlobalDataContext.js
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import isaProjectExample from "../data/isa-project-example.json";

import { clearTree, importProject, loadTree } from '../utils/indexedTreeStore';
import useDatasetStore from '../hooks/useDatasetStore';
import generateId from '../utils/generateId';
import { expandStudiesIntoRuns, createStudyRunId, normalizeRunCount } from '../utils/studyRuns';
import { DEFAULT_EXPERIMENT_TYPE_ID, getExperimentTypeConfig } from '../constants/experimentTypes';
import {
    setProjectDatasetName,
    clearProjectDatasetName,
    setProjectDatasetStats,
    clearProjectDatasetStats
} from '../utils/projectMetadata';

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
    const DEFAULT_PROJECT_ID = 'example-project';
    const DEFAULT_PROJECT_NAME = 'Example Project';
    const initialProjects = loadFromLocalStorage('globalAppData_projects', [{ id: DEFAULT_PROJECT_ID, name: DEFAULT_PROJECT_NAME }]);
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
        const ls = isaProjectExample.localStorage;
        const lsKey = `globalAppData_default_${key}`;
        if (ls[lsKey]) {
            try { return JSON.parse(ls[lsKey]); } catch (e) { return fallback; }
        }
        return fallback;
    };

    // Lazy initialization for all state variables from per-project localStorage
    const [studies, setStudies] = useState(() => loadFromLocalStorage(projectKey('studies'), getDefaultValue('studies', currentProjectId !== DEFAULT_PROJECT_ID)));
    const [investigations, setInvestigations] = useState(() => loadFromLocalStorage(projectKey('investigations'), getDefaultValue('investigations', currentProjectId !== DEFAULT_PROJECT_ID)));
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
    const [studyToAssayMapping, setStudyToAssayMapping] = useState(() => loadFromLocalStorage(projectKey('studyToAssayMapping'), getDefaultValue('studyToAssayMapping', currentProjectId !== DEFAULT_PROJECT_ID)));

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
        // Protect the default/example project from deletion
        if (id === DEFAULT_PROJECT_ID) {
            console.warn('The default example project cannot be deleted. You can reset it to its original state instead.');
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

    // Reset a project's stored state back to the initial defaults (useful for the built-in example project)
    async function resetProject(id) {
        if (!id) return;
        try {
            // For example project, use isa-project-example.json baseline; for others, use empty defaults
            const isExampleProject = id === DEFAULT_PROJECT_ID;
            const baselineLS = isaProjectExample.localStorage;
            
            const getResetValue = (key) => {
                const fallback = getKeyFallback(key);
                if (!isExampleProject) return fallback;
                const lsKey = `globalAppData_default_${key}`;
                if (baselineLS[lsKey]) {
                    try { return JSON.parse(baselineLS[lsKey]); } catch (e) { return fallback; }
                }
                return fallback;
            };

            // Write the baseline data into per-project localStorage keys
            saveToLocalStorage(`globalAppData_${id}_studies`, getResetValue('studies'));
            saveToLocalStorage(`globalAppData_${id}_investigations`, getResetValue('investigations'));
            saveToLocalStorage(`globalAppData_${id}_contacts`, getResetValue('contacts'));
            // Do NOT write per-project testSetups. Test setups are global across projects.
            // If resetting the example project, seed the global testSetups from the example baseline.
            if (isExampleProject) {
                try { saveToLocalStorage('globalAppData_testSetups', getResetValue('testSetups')); } catch (e) { /* ignore */ }
            }
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
            saveToLocalStorage(`globalAppData_${id}_studyToAssayMapping`, getResetValue('studyToAssayMapping'));

            // Clear IndexedDB tree for this project
            try { await clearTree(id); } catch (e) { console.warn('[GlobalDataContext] resetProject: clearTree failed', e); }
            clearProjectDatasetName(id);
            clearProjectDatasetStats(id);

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
                        if (root) {
                            setProjectDatasetName(id, root.rootName || root.name || null);
                            setProjectDatasetStats(id, root);
                        } else {
                            clearProjectDatasetName(id);
                            clearProjectDatasetStats(id);
                        }
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
                setExperimentType(getResetValue('experimentType'));

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
            setInvestigations(loadFromLocalStorage(`globalAppData_${id}_investigations`, getSwitchDefault('investigations')));
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

    // Effect for saving all data to local storage. Runs when relevant state changes.
    // OPTIMIZED: Split into separate effects to avoid mass writes on every change
    useEffect(() => {
        saveToLocalStorage(projectKey('studies', currentProjectId), studies);
    }, [studies, currentProjectId]);

    useEffect(() => {
        saveToLocalStorage(projectKey('investigations', currentProjectId), investigations);
    }, [investigations, currentProjectId]);

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
        saveToLocalStorage(projectKey('studyToAssayMapping', currentProjectId), studyToAssayMapping);
    }, [studyToAssayMapping, currentProjectId]);

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
                    if (mounted) {
                        if (root) {
                            setProjectDatasetName(DEFAULT_PROJECT_ID, root.rootName || root.name || null);
                            setProjectDatasetStats(DEFAULT_PROJECT_ID, root);
                            setSelectedDataset(root);
                        } else {
                            clearProjectDatasetName(DEFAULT_PROJECT_ID);
                            clearProjectDatasetStats(DEFAULT_PROJECT_ID);
                        }
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

    // Auto-generate default studyToAssayMapping entries when missing.
    // Preserve any existing mappings (including user-edited filenames) and only append
    // defaults for studyId/sensorId combinations that are not yet present.
    useEffect(() => {
        try {
            if (!Array.isArray(testSetups) || testSetups.length === 0) {
                return;
            }

            const pad = (n) => String(n + 1).padStart(2, '0');
            const padRun = (n) => String(n).padStart(2, '0');
            const studyRuns = expandStudiesIntoRuns(studies);
            if (studyRuns.length === 0) {
                return;
            }

            const existing = new Set();
            if (Array.isArray(studyToAssayMapping)) {
                studyToAssayMapping.forEach((m) => {
                    if (!m || !m.sensorId) return;
                    const runKey = m.studyRunId || createStudyRunId(m.studyId, 1);
                    existing.add(`${runKey}|${m.sensorId}`);
                });
            }

            const newEntries = [];

            studyRuns.forEach((run) => {
                testSetups.forEach((setup) => {
                    if (!Array.isArray(setup.sensors)) {
                        return;
                    }
                    setup.sensors.forEach((sensor, sensorIndex) => {
                        const key = `${run.runId}|${sensor.id}`;
                        if (existing.has(key)) {
                            return;
                        }

                        const studyCode = pad(run.studyIndex ?? 0);
                        const sensorCode = pad(sensorIndex);
                        const runSuffix = run.runCount > 1 ? `_RUN${padRun(run.runNumber)}` : '';
                        const value = `ST${studyCode}${runSuffix}_SE${sensorCode}_ASSO.csv`;

                        newEntries.push({
                            studyId: run.studyId,
                            studyRunId: run.runId,
                            sensorId: sensor.id,
                            value
                        });
                        existing.add(key);
                    });
                });
            });

            if (newEntries.length > 0) {
                setStudyToAssayMapping((prev) => {
                    const base = Array.isArray(prev) ? prev : [];
                    return [...base, ...newEntries];
                });
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
        pageTabStates: [pageTabStates, setPageTabStates],
        experimentType: [experimentType, setExperimentType]
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
