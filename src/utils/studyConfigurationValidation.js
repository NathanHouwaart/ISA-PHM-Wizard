export const isPrognosticsExperiment = (experimentType) => experimentType === 'prognostics-experiment';

export const getStudyComponentAssignments = (study = {}) => (
    Array.isArray(study?.componentAssignments) ? study.componentAssignments : []
);

export const getAssignedComponentInstanceId = (study, replaceableCharacteristicId) => (
    getStudyComponentAssignments(study).find(
        (assignment) => assignment.replaceableCharacteristicId === replaceableCharacteristicId
    )?.componentInstanceId || ''
);

export const getDuplicateComponentInstanceIds = (studies = []) => {
    const instanceCounts = new Map();

    studies.forEach((study) => {
        getStudyComponentAssignments(study).forEach((assignment) => {
            const instanceId = String(assignment?.componentInstanceId || '').trim();
            if (!instanceId) return;
            instanceCounts.set(instanceId, (instanceCounts.get(instanceId) || 0) + 1);
        });
    });

    return new Set(
        [...instanceCounts.entries()]
            .filter(([, count]) => count > 1)
            .map(([instanceId]) => instanceId)
    );
};

// Retained for callers and persisted projects that still use the former field.
export const getDuplicateConfigurationIds = (studies = []) => {
    const configurationCounts = new Map();
    studies.forEach((study) => {
        const configurationId = String(study?.configurationId || '').trim();
        if (!configurationId) return;
        configurationCounts.set(configurationId, (configurationCounts.get(configurationId) || 0) + 1);
    });
    return new Set(
        [...configurationCounts.entries()]
            .filter(([, count]) => count > 1)
            .map(([configurationId]) => configurationId)
    );
};
