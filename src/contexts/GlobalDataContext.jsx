/* eslint-disable react-refresh/only-export-components */
// src/context/GlobalDataContext.js
import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';

import { clearTree } from '../utils/indexedTreeStore';
import useDatasetStore from '../hooks/useDatasetStore';
import generateId from '../utils/generateId';
import { DEFAULT_EXPERIMENT_TYPE_ID } from '../constants/experimentTypes';
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
    decodeJsonFromStorage,
    encodeJsonForStorage,
    isQuotaExceededError
} from '../utils/storageCodec';
import { 
    useExampleProjects, 
    isExampleProject, 
    getExampleProjectData,
    resetExampleProject,
    seedExampleProject
} from '../hooks/useExampleProjects';
import useProjectCatalog from '../state/session/useProjectCatalog';
import {
    DEFAULT_PROJECT_ID,
    DEFAULT_PROJECT_NAME,
    MULTI_RUN_EXAMPLE_PROJECT_ID,
    getKeyFallback
} from '../state/session/projectSessionConfig';
import useExplorerController from '../state/ui/useExplorerController';
import useProjectDataState from '../state/project/useProjectDataState';
import useProjectPersistence from '../state/project/useProjectPersistence';

const GlobalDataContext = createContext();

export const useGlobalDataContext = () => {
    const context = useContext(GlobalDataContext);
    if (!context) {
        throw new Error('useGlobalDataContext must be used within a GlobalDataProvider');
    }
    return context;
};

// Explicit contract hooks to discourage broad direct context reads.
export const useProjectData = () => {
    const context = useGlobalDataContext();

    return {
        studies: context.studies,
        testSetups: context.testSetups,
        investigation: context.investigation,
        contacts: context.contacts,
        publications: context.publications,
        selectedTestSetupId: context.selectedTestSetupId,
        studyVariables: context.studyVariables,
        measurementProtocols: context.measurementProtocols,
        processingProtocols: context.processingProtocols,
        studyToMeasurementProtocolSelection: context.studyToMeasurementProtocolSelection,
        studyToProcessingProtocolSelection: context.studyToProcessingProtocolSelection,
        studyToStudyVariableMapping: context.studyToStudyVariableMapping,
        sensorToMeasurementProtocolMapping: context.sensorToMeasurementProtocolMapping,
        studyToSensorMeasurementMapping: context.studyToSensorMeasurementMapping,
        sensorToProcessingProtocolMapping: context.sensorToProcessingProtocolMapping,
        studyToSensorProcessingMapping: context.studyToSensorProcessingMapping,
        screenWidth: context.screenWidth,
        experimentType: context.experimentType,
        pageTabStates: context.pageTabStates,
        selectedDataset: context.selectedDataset,
        explorerOpen: context.explorerOpen,
        initDatasetHydrated: context.initDatasetHydrated,
        dataMap: context.dataMap,
        projects: context.projects,
        currentProjectId: context.currentProjectId,
        DEFAULT_PROJECT_ID: context.DEFAULT_PROJECT_ID,
        MULTI_RUN_EXAMPLE_PROJECT_ID: context.MULTI_RUN_EXAMPLE_PROJECT_ID,
        DEFAULT_PROJECT_NAME: context.DEFAULT_PROJECT_NAME
    };
};

export const useProjectActions = () => {
    const context = useGlobalDataContext();

    return {
        setStudies: context.setStudies,
        setTestSetups: context.setTestSetups,
        setInvestigation: context.setInvestigation,
        setContacts: context.setContacts,
        setPublications: context.setPublications,
        setSelectedTestSetupId: context.setSelectedTestSetupId,
        setStudyVariables: context.setStudyVariables,
        setMeasurementProtocols: context.setMeasurementProtocols,
        setProcessingProtocols: context.setProcessingProtocols,
        setStudyToMeasurementProtocolSelection: context.setStudyToMeasurementProtocolSelection,
        setStudyToProcessingProtocolSelection: context.setStudyToProcessingProtocolSelection,
        setStudyToStudyVariableMapping: context.setStudyToStudyVariableMapping,
        setSensorToMeasurementProtocolMapping: context.setSensorToMeasurementProtocolMapping,
        setStudyToSensorMeasurementMapping: context.setStudyToSensorMeasurementMapping,
        setSensorToProcessingProtocolMapping: context.setSensorToProcessingProtocolMapping,
        setStudyToSensorProcessingMapping: context.setStudyToSensorProcessingMapping,
        setScreenWidth: context.setScreenWidth,
        setExperimentType: context.setExperimentType,
        setPageTabStates: context.setPageTabStates,
        setSelectedDataset: context.setSelectedDataset,
        loadDatasetSubtree: context.loadDatasetSubtree,
        setExplorerOpen: context.setExplorerOpen,
        openExplorer: context.openExplorer,
        closeExplorer: context.closeExplorer,
        resolveExplorerSelection: context.resolveExplorerSelection,
        // Backward-compatible alias used by legacy/demo callers.
        resolveExplorer: context.resolveExplorerSelection,
        createProject: context.createProject,
        deleteProject: context.deleteProject,
        renameProject: context.renameProject,
        switchProject: context.switchProject,
        resetProject: context.resetProject,
        updateProjectExperimentType: context.updateProjectExperimentType
    };
};

// Helper function to read from local storage and parse
const loadFromLocalStorage = (key, initialValue) => {
    try {
        const { exists, value } = decodeJsonFromStorage(localStorage.getItem(key));
        if (exists && value !== undefined) return value;
    } catch (error) {
        console.error("Error parsing data from localStorage", error);
        // Fallback to initial value if parsing fails
    }
    return initialValue;
};

const quotaFailedKeys = new Set();

// Helper to write JSON to localStorage
const saveToLocalStorage = (key, value) => {
    try {
        const payload = encodeJsonForStorage(value);
        localStorage.setItem(key, payload);
        quotaFailedKeys.delete(key);
        return true;
    } catch (err) {
        if (isQuotaExceededError(err)) {
            try {
                // Retry with forced compression for near-quota payloads.
                const compressedPayload = encodeJsonForStorage(value, { forceCompression: true });
                localStorage.setItem(key, compressedPayload);
                quotaFailedKeys.delete(key);
                return true;
            } catch (retryErr) {
                if (!quotaFailedKeys.has(key)) {
                    console.error('[GlobalDataContext] saveToLocalStorage quota error', key, retryErr);
                    quotaFailedKeys.add(key);
                }
                return false;
            }
        }
        console.error('[GlobalDataContext] saveToLocalStorage error', err);
        return false;
    }
};

// Main Data Provider Component
export const GlobalDataProvider = ({ children }) => {

    // Project catalog (ids + names + active project) is extracted into its own store hook.
    const {
        projects,
        setProjects,
        currentProjectId,
        setCurrentProjectId,
        initialCurrentProjectId
    } = useProjectCatalog({ loadFromLocalStorage });

    // helper to construct per-project storage keys
    const projectKey = useCallback(
        (k, projectId = currentProjectId) => `globalAppData_${projectId}_${k}`,
        [currentProjectId]
    );

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
    const {
        studies,
        setStudies,
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
        experimentType,
        setExperimentType,
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
        testSetups,
        setTestSetups,
        screenWidth,
        setScreenWidth,
        pageTabStates,
        setPageTabStates,
        applyProjectStateToMemory,
        stateSetter,
        dataMap
    } = useProjectDataState({
        initialProjectState,
        initialTestSetupsState
    });

    // Selected dataset (root folder + indexed file tree) managed by useDatasetStore (scoped to currentProjectId)
    const { selectedDataset, setSelectedDataset, loadDatasetSubtree, initHydrated } = useDatasetStore(currentProjectId);
    const { explorerOpen, setExplorerOpen, openExplorer, closeExplorer, resolveExplorerSelection } = useExplorerController();

    // Initialize example projects using hook
    useExampleProjects(setTestSetups, loadFromLocalStorage);

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
                    stateSetter
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

    useProjectPersistence({
        currentProjectId,
        projectKey,
        saveToLocalStorage,
        projects,
        testSetups,
        studies,
        investigation,
        contacts,
        publications,
        selectedTestSetupId,
        studyVariables,
        measurementProtocols,
        processingProtocols,
        experimentType,
        studyToMeasurementProtocolSelection,
        studyToProcessingProtocolSelection,
        studyToStudyVariableMapping,
        sensorToMeasurementProtocolMapping,
        studyToSensorMeasurementMapping,
        sensorToProcessingProtocolMapping,
        studyToSensorProcessingMapping,
        pageTabStates
    });

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

