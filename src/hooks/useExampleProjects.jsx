// src/hooks/useExampleProjects.jsx
import { useEffect, useRef } from 'react';
import exampleSingleRunNlnEmp from "../data/example-single-run-nln-emp.json";
import exampleMultiRunMilling from "../data/example-multi-run-milling.json";

import { clearTree, importProject, loadTree } from '../utils/indexedTreeStore';
import {
    setProjectDatasetName,
    clearProjectDatasetName,
    setProjectDatasetStats,
    clearProjectDatasetStats
} from '../utils/projectMetadata';

// Map of available example projects
const EXAMPLE_PROJECTS = {
    'example-single-run': exampleSingleRunNlnEmp,
    'example-multi-run': exampleMultiRunMilling,
};

const EXAMPLE_SEED_VERSION = 2;

const getExampleSeedFlagKey = (projectId) => `globalAppData_${projectId}_seeded_v${EXAMPLE_SEED_VERSION}`;

const clearProjectScopedLocalStorage = (projectId) => {
    const prefix = `globalAppData_${projectId}_`;
    const keysToRemove = [];
    try {
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (key && key.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
        console.warn('[useExampleProjects] clearProjectScopedLocalStorage error', error);
    }
};

const mergeExampleTestSetup = (currentSetups = [], exampleSetup = null) => {
    if (!exampleSetup || !exampleSetup.id) {
        return Array.isArray(currentSetups) ? currentSetups : [];
    }

    const nextSetups = Array.isArray(currentSetups) ? [...currentSetups] : [];
    const existingIndex = nextSetups.findIndex((setup) => (
        setup?.id === exampleSetup.id || setup?.name === exampleSetup.name
    ));

    if (existingIndex >= 0) {
        nextSetups[existingIndex] = exampleSetup;
    } else {
        nextSetups.push(exampleSetup);
    }

    return nextSetups;
};

const upsertExampleTestSetup = ({
    exampleData,
    loadFromLocalStorage,
    setTestSetups
}) => {
    const exampleSetup = exampleData?.selectedTestSetup;
    if (!exampleSetup) return;

    const currentSetups = typeof loadFromLocalStorage === 'function'
        ? loadFromLocalStorage('globalAppData_testSetups', [])
        : [];
    const mergedSetups = mergeExampleTestSetup(currentSetups, exampleSetup);

    try {
        localStorage.setItem('globalAppData_testSetups', JSON.stringify(mergedSetups));
    } catch (error) {
        console.warn('[useExampleProjects] unable to persist merged example test setup', error);
    }

    if (typeof setTestSetups === 'function') {
        setTestSetups(mergedSetups);
    }
};

// Helper to check if a project is an example project
export const isExampleProject = (projectId) => {
    return projectId && Object.prototype.hasOwnProperty.call(EXAMPLE_PROJECTS, projectId);
};

// Get example project IDs
export const getExampleProjectIds = () => Object.keys(EXAMPLE_PROJECTS);

// Get example project data
export const getExampleProjectData = (projectId) => EXAMPLE_PROJECTS[projectId];

/**
 * Hook to manage example project initialization and operations
 * @param {Function} setTestSetups - React state setter for test setups
 * @param {Function} loadFromLocalStorage - Function to load from localStorage
 * @param {Function|null} onProjectsReseeded - Optional callback with reseeded project IDs
 */
export const useExampleProjects = (setTestSetups, loadFromLocalStorage, onProjectsReseeded = null) => {
    const onProjectsReseededRef = useRef(onProjectsReseeded);
    useEffect(() => {
        onProjectsReseededRef.current = onProjectsReseeded;
    }, [onProjectsReseeded]);

    // Initialize all example projects on app start (seeds IndexedDB and localStorage)
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const reseededProjectIds = [];
                for (const projectId of Object.keys(EXAMPLE_PROJECTS)) {
                    const seedFlagKey = getExampleSeedFlagKey(projectId);
                    if (!localStorage.getItem(seedFlagKey)) {
                        const exampleData = EXAMPLE_PROJECTS[projectId];
                        if (exampleData) {
                            console.debug(`[useExampleProjects] force-initializing example project ${projectId}`);
                            try {
                                clearProjectScopedLocalStorage(projectId);
                                await clearTree(projectId);
                                upsertExampleTestSetup({
                                    exampleData,
                                    loadFromLocalStorage,
                                    setTestSetups
                                });
                                await importProject(exampleData, projectId, { skipConflictCheck: true });
                                localStorage.setItem(seedFlagKey, '1');
                                localStorage.removeItem(`globalAppData_${projectId}_seeded_v1`);
                                reseededProjectIds.push(projectId);
                            } catch (e) {
                                console.warn(`[useExampleProjects] failed to initialize ${projectId}`, e);
                            }
                        }
                    }
                }
                // After importing all example projects, reload testSetups from localStorage to ensure
                // any selectedTestSetup objects from the imported projects are loaded into React state
                if (mounted) {
                    const updatedTestSetups = loadFromLocalStorage('globalAppData_testSetups', []);
                    setTestSetups(updatedTestSetups);
                    if (
                        reseededProjectIds.length > 0
                        && typeof onProjectsReseededRef.current === 'function'
                    ) {
                        try {
                            await onProjectsReseededRef.current(reseededProjectIds);
                        } catch (callbackError) {
                            console.warn('[useExampleProjects] onProjectsReseeded callback failed', callbackError);
                        }
                    }
                }
            } catch (err) {
                console.error('[useExampleProjects] initialize example projects error', err);
            }
        })();
        return () => { mounted = false; };
    }, [setTestSetups, loadFromLocalStorage]);

    return {
        isExampleProject,
        getExampleProjectIds,
        getExampleProjectData
    };
};

/**
 * Reset an example project to its baseline state
 * @param {string} projectId - The project ID to reset
 * @param {Object} options - Options for reset operation
 * @returns {Promise<void>}
 */
export const resetExampleProject = async (projectId, options = {}) => {
    const {
        getKeyFallback,
        setTestSetups,
        saveToLocalStorage,
        currentProjectId,
        setSelectedDataset,
        stateSetter
    } = options;

    if (!isExampleProject(projectId)) {
        throw new Error(`Project ${projectId} is not an example project`);
    }

    try {
        const exampleProjectData = EXAMPLE_PROJECTS[projectId];
        const baselineLS = exampleProjectData.localStorage;

        const getResetValue = (key) => {
            const fallback = getKeyFallback(key);
            const canonicalKey = `globalAppData_${projectId}_${key}`;
            const legacyInvestigationKey = `globalAppData_${projectId}_investigations`;
            const rawValue = key === 'investigation'
                ? (baselineLS[canonicalKey] ?? baselineLS[legacyInvestigationKey])
                : baselineLS[canonicalKey];

            if (rawValue) {
                try { return JSON.parse(rawValue); } catch (e) { return fallback; }
            }
            return fallback;
        };

        clearProjectScopedLocalStorage(projectId);

        // Restore example project's test setup by merging with current global test setups
        if (exampleProjectData?.selectedTestSetup) {
            const exampleTestSetup = exampleProjectData.selectedTestSetup;
            setTestSetups((currentSetups) => {
                // Check if this test setup already exists (by id or name)
                const exists = currentSetups.some(
                    (setup) => setup.id === exampleTestSetup.id || setup.name === exampleTestSetup.name
                );
                if (exists) {
                    // Replace the existing one with the fresh example version
                    return currentSetups.map((setup) =>
                        setup.id === exampleTestSetup.id || setup.name === exampleTestSetup.name
                            ? exampleTestSetup
                            : setup
                    );
                } else {
                    // Add the example test setup back
                    return [...currentSetups, exampleTestSetup];
                }
            });
        }

        // Write the baseline data into per-project localStorage keys
        const keysToReset = [
            'studies', 'investigation', 'contacts', 'publications', 'selectedTestSetupId',
            'studyVariables', 'measurementProtocols', 'processingProtocols', 'experimentType',
            'studyToMeasurementProtocolSelection', 'studyToProcessingProtocolSelection',
            'studyToStudyVariableMapping', 'sensorToMeasurementProtocolMapping',
            'studyToSensorMeasurementMapping', 'sensorToProcessingProtocolMapping', 'studyToSensorProcessingMapping',
            'pageTabStates'
        ];

        keysToReset.forEach(key => {
            saveToLocalStorage(`globalAppData_${projectId}_${key}`, getResetValue(key));
        });

        // Clear IndexedDB tree for this project
        try { await clearTree(projectId); } catch (e) { 
            console.warn('[useExampleProjects] resetExampleProject: clearTree failed', e); 
        }
        clearProjectDatasetName(projectId);
        clearProjectDatasetStats(projectId);

        // Re-import the compressed nodes into IndexedDB
        const seedFlagKey = getExampleSeedFlagKey(projectId);
        try {
            await importProject(exampleProjectData, projectId, { skipConflictCheck: true });
            try { localStorage.setItem(seedFlagKey, '1'); } catch (e) { /* ignore */ }
            try { localStorage.removeItem(`globalAppData_${projectId}_seeded_v1`); } catch (e) { /* ignore */ }
            
            // Load the tree and set in-memory dataset
            try {
                const root = await loadTree(projectId);
                if (root) {
                    setProjectDatasetName(projectId, root.rootName || root.name || null);
                    setProjectDatasetStats(projectId, root);
                } else {
                    clearProjectDatasetName(projectId);
                    clearProjectDatasetStats(projectId);
                }
                if (currentProjectId === projectId) {
                    try { setSelectedDataset(root); } catch (e) { /* ignore */ }
                }
            } catch (e) {
                console.warn('[useExampleProjects] resetExampleProject: loadTree after import failed', e);
            }
        } catch (e) {
            console.warn('[useExampleProjects] resetExampleProject: importProject failed', e);
        }

        // If the reset project is currently active, reload the in-memory state
        if (currentProjectId === projectId && stateSetter) {
            keysToReset.forEach(key => {
                if (key !== 'testSetups' && stateSetter[key]) {
                    stateSetter[key](getResetValue(key));
                }
            });
        }
    } catch (err) {
        console.error('[useExampleProjects] resetExampleProject error', err);
        throw err;
    }
};

/**
 * Seed an example project on demand (used in lazy-loading effect)
 * @param {string} projectId - The project ID to seed
 * @param {Object} options - Options for seeding
 * @returns {Promise<void>}
 */
export const seedExampleProject = async (projectId, options = {}) => {
    const {
        setSelectedDataset,
        setProjectDatasetName,
        setProjectDatasetStats,
        clearProjectDatasetName,
        clearProjectDatasetStats,
        setTestSetups,
        loadFromLocalStorage
    } = options;

    if (!isExampleProject(projectId)) {
        return;
    }

    const seedFlagKey = getExampleSeedFlagKey(projectId);
    if (localStorage.getItem(seedFlagKey)) {
        return; // Already seeded
    }

    const exampleData = EXAMPLE_PROJECTS[projectId];
    if (!exampleData) {
        return;
    }

    console.debug(`[useExampleProjects] seeding example project ${projectId}`);
    try {
        clearProjectScopedLocalStorage(projectId);
        await clearTree(projectId);
        upsertExampleTestSetup({
            exampleData,
            loadFromLocalStorage,
            setTestSetups
        });
        await importProject(exampleData, projectId, { skipConflictCheck: true });
        localStorage.setItem(seedFlagKey, '1');
        localStorage.removeItem(`globalAppData_${projectId}_seeded_v1`);
    } catch (e) {
        console.warn('[useExampleProjects] example project import failed', e);
        throw e;
    }

    // Try to load the root from the DB and set it into memory
    try {
        const root = await loadTree(projectId);
        if (root) {
            setProjectDatasetName(projectId, root.rootName || root.name || null);
            setProjectDatasetStats(projectId, root);
            setSelectedDataset(root);
        } else {
            clearProjectDatasetName(projectId);
            clearProjectDatasetStats(projectId);
        }
    } catch (e) {
        console.warn('[useExampleProjects] loadTree after import failed', e);
        throw e;
    }
};
