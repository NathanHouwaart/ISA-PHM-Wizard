export const OUTPUT_MODE_RAW_ONLY = 'raw_only';
export const OUTPUT_MODE_PROCESSED_ONLY = 'processed_only';
export const OUTPUT_MODE_RAW_AND_PROCESSED = 'raw_and_processed';

const OUTPUT_MODE_SET = new Set([
  OUTPUT_MODE_RAW_ONLY,
  OUTPUT_MODE_PROCESSED_ONLY,
  OUTPUT_MODE_RAW_AND_PROCESSED,
]);

export const OUTPUT_MODE_OPTIONS = [
  { value: OUTPUT_MODE_RAW_ONLY, label: 'Raw only' },
  { value: OUTPUT_MODE_PROCESSED_ONLY, label: 'Processed only' },
  { value: OUTPUT_MODE_RAW_AND_PROCESSED, label: 'Raw + processed' },
];

export const normalizeStudyOutputMode = (value, fallback = OUTPUT_MODE_RAW_ONLY) => {
  const candidate = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (OUTPUT_MODE_SET.has(candidate)) {
    return candidate;
  }
  return fallback;
};

export const isRawOutputEnabled = (mode) => {
  const normalized = normalizeStudyOutputMode(mode, OUTPUT_MODE_RAW_ONLY);
  return normalized === OUTPUT_MODE_RAW_ONLY || normalized === OUTPUT_MODE_RAW_AND_PROCESSED;
};

export const isProcessedOutputEnabled = (mode) => {
  const normalized = normalizeStudyOutputMode(mode, OUTPUT_MODE_RAW_ONLY);
  return normalized === OUTPUT_MODE_PROCESSED_ONLY || normalized === OUTPUT_MODE_RAW_AND_PROCESSED;
};

export const hasFilledValue = (value) => {
  if (Array.isArray(value)) {
    return value.some((entry) => String(entry ?? '').trim() !== '');
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((entry) => String(entry ?? '').trim() !== '');
  }
  return String(value ?? '').trim() !== '';
};

const hasFilledMappingForStudy = (mappings = [], studyId = '', runIds = new Set()) => {
  const safeStudyId = String(studyId || '');
  if (!safeStudyId) return false;

  return (Array.isArray(mappings) ? mappings : []).some((mapping) => {
    if (!mapping) return false;

    if (mapping.studyRunId) {
      if (!runIds.has(String(mapping.studyRunId))) return false;
      return hasFilledValue(mapping.value);
    }

    if (String(mapping.studyId || '') !== safeStudyId) return false;
    return hasFilledValue(mapping.value);
  });
};

export const resolveStudyOutputMode = (study, options = {}) => {
  const explicit = normalizeStudyOutputMode(study?.outputMode, '');
  if (explicit) {
    return explicit;
  }

  const {
    studyRuns = [],
    measurementMappings = [],
    processingMappings = [],
    selectedProcessingProtocolId = '',
  } = options || {};

  const runIds = new Set(
    (Array.isArray(studyRuns) ? studyRuns : [])
      .map((run) => run?.runId)
      .filter(Boolean)
      .map((runId) => String(runId))
  );

  const safeStudyId = study?.id || '';
  const hasRaw = hasFilledMappingForStudy(measurementMappings, safeStudyId, runIds);
  const hasProcessed = hasFilledMappingForStudy(processingMappings, safeStudyId, runIds);
  const hasProcessingProtocol = String(selectedProcessingProtocolId || '').trim() !== '';

  if (hasProcessed && !hasRaw) {
    return OUTPUT_MODE_PROCESSED_ONLY;
  }
  if (hasProcessed || hasProcessingProtocol) {
    return hasRaw ? OUTPUT_MODE_RAW_AND_PROCESSED : OUTPUT_MODE_PROCESSED_ONLY;
  }
  return OUTPUT_MODE_RAW_ONLY;
};

export default {
  OUTPUT_MODE_RAW_ONLY,
  OUTPUT_MODE_PROCESSED_ONLY,
  OUTPUT_MODE_RAW_AND_PROCESSED,
  OUTPUT_MODE_OPTIONS,
  normalizeStudyOutputMode,
  isRawOutputEnabled,
  isProcessedOutputEnabled,
  hasFilledValue,
  resolveStudyOutputMode,
};
