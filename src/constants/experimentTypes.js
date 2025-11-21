export const DEFAULT_EXPERIMENT_TYPE_ID = 'diagnostic-single';

export const EXPERIMENT_TYPE_OPTIONS = [
    {
        id: 'diagnostic-single',
        title: 'Diagnostic experiment · single run',
        subtitle: 'One controlled test with a single output file.',
        description: 'Select this when you captured one measurement for a fixed fault scenario or condition.',
        examples: ['Bearing test with a specific seeded fault', 'Single freezer profile export'],
        supportsMultipleRuns: false,
        singleRunLabel: 'Run 1',
        multiRunLabelFormatter: (runNumber) => `Run ${runNumber}`,
    },
    {
        id: 'rtf-single',
        title: 'Run-to-failure experiment · single condition measurement',
        subtitle: 'Trajectory with only an end-of-life label.',
        description: 'Use for run-to-failure tests where you only annotate the last point (e.g. RUL label or damage quantification).',
        examples: ['Bearing run-to-failure with final damage inspection'],
        supportsMultipleRuns: false,
        singleRunLabel: 'Run 1',
        multiRunLabelFormatter: (runNumber) => `Run ${runNumber}`,
    },
    {
        id: 'diagnostic-multi',
        title: 'Diagnostic experiment · multiple tests',
        subtitle: 'Repeated tests for the same configuration.',
        description: 'Choose this when you execute multiple diagnostic trials or daily exports under the same setup.',
        examples: ['Daily freezer measurements', 'Repeated bearing tests with identical faults'],
        supportsMultipleRuns: true,
        singleRunLabel: 'Run 1',
        multiRunLabelFormatter: (runNumber) => `Run ${runNumber}`,
    },
    {
        id: 'rtf-multi',
        title: 'Run-to-failure experiment · condition trending',
        subtitle: 'Trajectory with intermediate condition measurements.',
        description: 'Ideal for tests such as tool wear monitoring where condition indicators are logged multiple times.',
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
