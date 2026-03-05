import { useEffect, useState } from 'react';
import { DEFAULT_PROJECT_ID, mergeProjectsWithExamples } from './projectSessionConfig';

const PROJECTS_STORAGE_KEY = 'globalAppData_projects';
const CURRENT_PROJECT_STORAGE_KEY = 'globalAppData_currentProjectId';

export default function useProjectCatalog({ loadFromLocalStorage }) {
    const [initialCatalog] = useState(() => {
        const mergedProjects = mergeProjectsWithExamples(
            loadFromLocalStorage(PROJECTS_STORAGE_KEY, [])
        );
        const firstProjectId = mergedProjects[0]?.id || DEFAULT_PROJECT_ID;
        const initialCurrentProjectId = loadFromLocalStorage(CURRENT_PROJECT_STORAGE_KEY, firstProjectId);

        return {
            projects: mergedProjects,
            currentProjectId: initialCurrentProjectId
        };
    });

    const [projects, setProjects] = useState(() => initialCatalog.projects);
    const [currentProjectId, setCurrentProjectId] = useState(() => initialCatalog.currentProjectId);

    // Keep example project shells present even if localStorage payload is missing them.
    useEffect(() => {
        setProjects(mergeProjectsWithExamples(
            loadFromLocalStorage(PROJECTS_STORAGE_KEY, [])
        ));
    }, [loadFromLocalStorage]);

    return {
        projects,
        setProjects,
        currentProjectId,
        setCurrentProjectId,
        initialCurrentProjectId: initialCatalog.currentProjectId,
    };
}
