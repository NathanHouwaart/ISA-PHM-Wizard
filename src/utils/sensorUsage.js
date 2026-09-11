export const SENSOR_USAGE_DATASET_OUTPUT = 'dataset-output';
export const SENSOR_USAGE_CONDITION_MONITORING = 'condition-monitoring';
export const SENSOR_USAGE_BOTH = 'both';

export const SENSOR_USAGE_OPTIONS = [
  {
    value: SENSOR_USAGE_DATASET_OUTPUT,
    label: 'Dataset output only',
    description: 'Include this sensor in exported raw and processed output files.'
  },
  {
    value: SENSOR_USAGE_CONDITION_MONITORING,
    label: 'Condition monitoring only',
    description: 'Record this device as test-setup context without output file mappings.'
  },
  {
    value: SENSOR_USAGE_BOTH,
    label: 'Dataset output + condition monitoring',
    description: 'Include this sensor in output files and identify it as condition monitoring.'
  }
];

const KNOWN_SENSOR_USAGES = new Set(SENSOR_USAGE_OPTIONS.map((option) => option.value));

export const normalizeSensorUsage = (usage) => (
  KNOWN_SENSOR_USAGES.has(usage) ? usage : SENSOR_USAGE_DATASET_OUTPUT
);

export const normalizeSensor = (sensor = {}) => ({
  ...sensor,
  usage: normalizeSensorUsage(sensor.usage)
});

export const isSensorIncludedInDatasetOutput = (sensor = {}) => {
  const usage = normalizeSensorUsage(sensor.usage);
  return usage === SENSOR_USAGE_DATASET_OUTPUT || usage === SENSOR_USAGE_BOTH;
};

export const isSensorUsedForConditionMonitoring = (sensor = {}) => {
  const usage = normalizeSensorUsage(sensor.usage);
  return usage === SENSOR_USAGE_CONDITION_MONITORING || usage === SENSOR_USAGE_BOTH;
};

export const getSensorUsageLabel = (sensor = {}) => (
  SENSOR_USAGE_OPTIONS.find((option) => option.value === normalizeSensorUsage(sensor.usage))?.label
  || 'Dataset output only'
);
