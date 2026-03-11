// src/hooks/useExampleProjects.jsx
import { useEffect } from 'react';
import exampleSingleRunSietse from "../data/example-single-run-sietze.json";
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
    'example-single-run': exampleSingleRunSietse,
    'example-multi-run': exampleMultiRunMilling,
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
 */
export const useExampleProjects = (setTestSetups, loadFromLocalStorage) => {
    // Initialize all example projects on app start (seeds IndexedDB and localStorage)
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                for (const projectId of Object.keys(EXAMPLE_PROJECTS)) {
                    const seedFlagKey = `globalAppData_${projectId}_seeded_v1`;
                    if (!localStorage.getItem(seedFlagKey)) {
                        const exampleData = EXAMPLE_PROJECTS[projectId];
                        if (exampleData) {
                            console.debug(`[useExampleProjects] initializing example project ${projectId}`);
                            try {
                                await importProject(exampleData, projectId);
                                localStorage.setItem(seedFlagKey, '1');
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
        const seedFlagKey = `globalAppData_${projectId}_seeded_v1`;
        try {
            await importProject(exampleProjectData, projectId);
            try { localStorage.setItem(seedFlagKey, '1'); } catch (e) { /* ignore */ }
            
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
    const { setSelectedDataset, setProjectDatasetName, setProjectDatasetStats, clearProjectDatasetName, clearProjectDatasetStats } = options;

    if (!isExampleProject(projectId)) {
        return;
    }

    const seedFlagKey = `globalAppData_${projectId}_seeded_v1`;
    if (localStorage.getItem(seedFlagKey)) {
        return; // Already seeded
    }

    const exampleData = EXAMPLE_PROJECTS[projectId];
    if (!exampleData) {
        return;
    }

    console.debug(`[useExampleProjects] seeding example project ${projectId}`);
    try {
        await importProject(exampleData, projectId);
        localStorage.setItem(seedFlagKey, '1');
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
