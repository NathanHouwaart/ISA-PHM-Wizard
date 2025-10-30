export const CONTRIBUTION_LEVELS = [
  {
    value: 'lead',
    label: 'Lead Author',
    description: 'Primary driver of the work, responsible for overall direction and delivery.',
    weight: 3,
  },
  {
    value: 'major',
    label: 'Major Contributor',
    description: 'Significant intellectual or experimental contributions with shared responsibility.',
    weight: 2,
  },
  {
    value: 'supporting',
    label: 'Supporting Contributor',
    description: 'Provided targeted assistance, data, or review support.',
    weight: 1,
  },
];

export const CONTRIBUTION_LEVEL_OPTIONS = CONTRIBUTION_LEVELS.map(({ value, label }) => ({
  value,
  label,
}));

export const getContributionLabel = (value) => {
  const match = CONTRIBUTION_LEVELS.find(level => level.value === value);
  return match ? match.label : 'Supporting Contributor';
};

export const getContributionWeight = (value) => {
  const match = CONTRIBUTION_LEVELS.find(level => level.value === value);
  return match ? match.weight : 1;
};
