import { DEFAULT_EXPERIMENT_TYPE_ID } from '../../constants/experimentTypes';

export const DEFAULT_PROJECT_ID = 'example-single-run';
export const DEFAULT_PROJECT_NAME = 'Single Run Sietze';
export const MULTI_RUN_EXAMPLE_PROJECT_ID = 'example-multi-run';
export const MULTI_RUN_EXAMPLE_PROJECT_NAME = 'Multi Run Milling';

export const EXAMPLE_PROJECT_SHELLS = Object.freeze([
    { id: DEFAULT_PROJECT_ID, name: DEFAULT_PROJECT_NAME },
    { id: MULTI_RUN_EXAMPLE_PROJECT_ID, name: MULTI_RUN_EXAMPLE_PROJECT_NAME }
]);

const KEY_FALLBACKS = Object.freeze({
    selectedTestSetupId: null,
    experimentType: DEFAULT_EXPERIMENT_TYPE_ID,
    investigation: {},
    pageTabStates: {}
});

export const getKeyFallback = (key) => {
    if (Object.prototype.hasOwnProperty.call(KEY_FALLBACKS, key)) {
        return KEY_FALLBACKS[key];
    }
    return [];
};

export const mergeProjectsWithExamples = (loadedProjects = []) => {
    const safeLoadedProjects = Array.isArray(loadedProjects) ? loadedProjects : [];
    const allProjects = [...safeLoadedProjects, ...EXAMPLE_PROJECT_SHELLS];
    const deduplicatedProjects = [];
    const seenProjectIds = new Set();

    for (const project of allProjects) {
        if (project && project.id && !seenProjectIds.has(project.id)) {
            deduplicatedProjects.push(project);
            seenProjectIds.add(project.id);
        }
    }

    const isExampleProjectShell = (project) => (
        EXAMPLE_PROJECT_SHELLS.some((exampleProject) => exampleProject.id === project.id)
    );

    return [
        ...deduplicatedProjects.filter(isExampleProjectShell),
        ...deduplicatedProjects.filter((project) => !isExampleProjectShell(project))
    ];
};
