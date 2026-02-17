export const VARIABLE_TYPE_OPTIONS = [
    'Qualitative fault specification', 
    'Quantitative fault specification', 
    'Operating condition',
    'Time',
    'Damage',
    'Other'
];

export const OPERATING_CONDITION_TYPE = 'Operating condition';
export const FAULT_SPEC_TYPES = VARIABLE_TYPE_OPTIONS.filter(type => type !== OPERATING_CONDITION_TYPE);

export const isFaultSpecification = (variable) => {
    return variable?.type !== OPERATING_CONDITION_TYPE;
};

export const isOperatingCondition = (variable) => {
    return variable?.type === OPERATING_CONDITION_TYPE;
};