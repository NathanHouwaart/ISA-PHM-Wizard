import { describe, expect, it } from 'vitest';
import { createStudyRunId } from './studyRuns';
import {
  OUTPUT_MODE_PROCESSED_ONLY,
  OUTPUT_MODE_RAW_AND_PROCESSED,
  OUTPUT_MODE_RAW_ONLY,
  isProcessedOutputEnabled,
  isRawOutputEnabled,
  normalizeStudyOutputMode,
  resolveStudyOutputMode,
} from './studyOutputMode';

describe('studyOutputMode', () => {
  it('normalizes and validates output modes', () => {
    expect(normalizeStudyOutputMode('RAW_ONLY')).toBe(OUTPUT_MODE_RAW_ONLY);
    expect(normalizeStudyOutputMode('processed_only')).toBe(OUTPUT_MODE_PROCESSED_ONLY);
    expect(normalizeStudyOutputMode('unknown-mode')).toBe(OUTPUT_MODE_RAW_ONLY);
  });

  it('reports enabled output channels correctly', () => {
    expect(isRawOutputEnabled(OUTPUT_MODE_RAW_ONLY)).toBe(true);
    expect(isProcessedOutputEnabled(OUTPUT_MODE_RAW_ONLY)).toBe(false);
    expect(isRawOutputEnabled(OUTPUT_MODE_PROCESSED_ONLY)).toBe(false);
    expect(isProcessedOutputEnabled(OUTPUT_MODE_PROCESSED_ONLY)).toBe(true);
    expect(isRawOutputEnabled(OUTPUT_MODE_RAW_AND_PROCESSED)).toBe(true);
    expect(isProcessedOutputEnabled(OUTPUT_MODE_RAW_AND_PROCESSED)).toBe(true);
  });

  it('infers processed-only mode when only processed output is mapped', () => {
    const runId = createStudyRunId('study-1', 1);
    const mode = resolveStudyOutputMode(
      { id: 'study-1' },
      {
        studyRuns: [{ runId, studyId: 'study-1' }],
        measurementMappings: [],
        processingMappings: [{ studyRunId: runId, sensorId: 'sensor-1', value: 'proc/f.csv' }],
        selectedProcessingProtocolId: 'pp-1',
      }
    );
    expect(mode).toBe(OUTPUT_MODE_PROCESSED_ONLY);
  });

  it('infers raw+processed mode when both sides are present', () => {
    const runId = createStudyRunId('study-1', 1);
    const mode = resolveStudyOutputMode(
      { id: 'study-1' },
      {
        studyRuns: [{ runId, studyId: 'study-1' }],
        measurementMappings: [{ studyRunId: runId, sensorId: 'sensor-1', value: 'raw/f.csv' }],
        processingMappings: [{ studyRunId: runId, sensorId: 'sensor-1', value: 'proc/f.csv' }],
        selectedProcessingProtocolId: '',
      }
    );
    expect(mode).toBe(OUTPUT_MODE_RAW_AND_PROCESSED);
  });
});
