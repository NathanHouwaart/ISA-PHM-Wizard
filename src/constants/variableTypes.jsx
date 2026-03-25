export const VARIABLE_TYPE_OPTIONS = [
    'Qualitative fault specification', 
    'Quantitative fault specification', 
    'Operating condition',
    'Damage',
    'RUL',
    'Other'
];

export const STUDY_VARIABLE_VALUE_MODE_SCALAR = 'scalar';
export const STUDY_VARIABLE_VALUE_MODE_TIMESERIES = 'timeseries';

export const STUDY_VARIABLE_VALUE_MODE_OPTIONS = [
    { label: 'Scalar', value: STUDY_VARIABLE_VALUE_MODE_SCALAR },
    { label: 'Timeseries (.csv)', value: STUDY_VARIABLE_VALUE_MODE_TIMESERIES }
];

export const normalizeStudyVariableValueMode = (
    value,
    fallback = STUDY_VARIABLE_VALUE_MODE_SCALAR
) => {
    const candidate = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (candidate === STUDY_VARIABLE_VALUE_MODE_SCALAR || candidate === STUDY_VARIABLE_VALUE_MODE_TIMESERIES) {
        return candidate;
    }
    return fallback;
};

export const OPERATING_CONDITION_TYPE = 'Operating condition';
export const FAULT_SPEC_TYPES = VARIABLE_TYPE_OPTIONS.filter(type => type !== OPERATING_CONDITION_TYPE);

export const isFaultSpecification = (variable) => {
    return variable?.type !== OPERATING_CONDITION_TYPE;
};

export const isOperatingCondition = (variable) => {
    return variable?.type === OPERATING_CONDITION_TYPE;
};
