export const isPrognosticsExperiment = (experimentType) => experimentType === 'prognostics-experiment';

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
