export const DEFAULT_EXPERIMENT_TYPE_ID = 'diagnostic-experiment';

export const EXPERIMENT_TYPE_OPTIONS = [
    {
        id: 'diagnostic-experiment',
        title: 'Diagnostic Experiment',
        subtitle: '',
        description: 'Short-term tests with injected faults – select this when you captured the response of the system to fixed and stable fault scenarios.',
        examples: ['Bearing test with a specific seeded fault', 'Single freezer profile export'],
        supportsMultipleRuns: false,
        singleRunLabel: 'Run 1',
        multiRunLabelFormatter: (runNumber) => `Run ${runNumber}`,
    },
    {
        id: 'prognostics-experiment',
        title: 'Run-to-failure experiment · condition trending',
        subtitle: '',
        description: 'Degradation or Run-to-Failure tests – select this when you captured the response of the system during (long term) degradation, in one or multiple runs or trajectories.',
        examples: ['Milling tool wear with periodic inspection', 'Bearing trending with intermediate checks'],
        supportsMultipleRuns: true,
        singleRunLabel: 'Run 1',
        multiRunLabelFormatter: (runNumber) => `Run ${runNumber}`,
    },
];

const optionMap = EXPERIMENT_TYPE_OPTIONS.reduce((acc, option) => {
    acc[option.id] = option;
    return acc;
}, {});

export const getExperimentTypeConfig = (id) => {
    if (!id || !optionMap[id]) {
        return optionMap[DEFAULT_EXPERIMENT_TYPE_ID];
    }
    return optionMap[id];
};
