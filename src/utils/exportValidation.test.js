import { describe, expect, it } from 'vitest';
import { createStudyRunId } from './studyRuns';
import { buildExportValidationReport } from './exportValidation';
import {
  OUTPUT_MODE_PROCESSED_ONLY,
  OUTPUT_MODE_RAW_ONLY
} from './studyOutputMode';

const makeBaseInput = () => ({
  studies: [
    { id: 'study-1', name: 'Study 1', runCount: 2, outputMode: OUTPUT_MODE_RAW_ONLY },
  ],
  testSetups: [
    {
      id: 'setup-1',
      sensors: [
        { id: 'sensor-1', alias: 'S1' },
        { id: 'sensor-2', alias: 'S2' },
      ],
    },
  ],
  selectedTestSetupId: 'setup-1',
  selectedDataset: {
    tree: [
      {
        name: 'raw',
        relPath: 'raw',
        isDirectory: true,
        childrenLoaded: true,
        children: [
          { name: 'run1_s1.csv', relPath: 'raw/run1_s1.csv', isDirectory: false },
        ],
      },
    ],
  },
});

describe('buildExportValidationReport', () => {
  it('flags missing measurement protocol as blocking', () => {
    const run1 = createStudyRunId('study-1', 1);
    const run2 = createStudyRunId('study-1', 2);

    const report = buildExportValidationReport({
      ...makeBaseInput(),
      studyToMeasurementProtocolSelection: [],
      studyToSensorMeasurementMapping: [
        { studyRunId: run1, sensorId: 'sensor-1', value: 'raw/r1_s1.csv' },
        { studyRunId: run1, sensorId: 'sensor-2', value: 'raw/r1_s2.csv' },
        { studyRunId: run2, sensorId: 'sensor-1', value: 'raw/r2_s1.csv' },
        { studyRunId: run2, sensorId: 'sensor-2', value: 'raw/r2_s2.csv' },
      ],
      studyToSensorProcessingMapping: [],
    });

    expect(report.hasBlockingErrors).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'missing-measurement-protocol')).toBe(true);
  });

  it('enforces processed-only mode without requiring raw mappings', () => {
    const run1 = createStudyRunId('study-1', 1);
    const run2 = createStudyRunId('study-1', 2);

    const report = buildExportValidationReport({
      ...makeBaseInput(),
      studies: [
        {
          id: 'study-1',
          name: 'Study 1',
          runCount: 2,
          outputMode: OUTPUT_MODE_PROCESSED_ONLY,
        },
      ],
      studyToMeasurementProtocolSelection: [{ studyId: 'study-1', protocolId: 'mp-1' }],
      studyToProcessingProtocolSelection: [],
      studyToSensorMeasurementMapping: [
        { studyRunId: run1, sensorId: 'sensor-1', value: '' },
        { studyRunId: run2, sensorId: 'sensor-1', value: '' },
      ],
      studyToSensorProcessingMapping: [],
    });

    expect(report.hasBlockingErrors).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'missing-processing-protocol')).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'missing-processing-mappings')).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'missing-measurement-mappings')).toBe(false);
  });

  it('flags directory assignments as blocking errors and duplicates as warnings', () => {
    const run1 = createStudyRunId('study-1', 1);
    const run2 = createStudyRunId('study-1', 2);

    const report = buildExportValidationReport({
      ...makeBaseInput(),
      studyToMeasurementProtocolSelection: [{ studyId: 'study-1', protocolId: 'mp-1' }],
      studyToSensorMeasurementMapping: [
        { studyRunId: run1, sensorId: 'sensor-1', value: './raw' },
        { studyRunId: run1, sensorId: 'sensor-2', value: 'raw/shared.csv' },
        { studyRunId: run2, sensorId: 'sensor-1', value: 'raw/shared.csv' },
        { studyRunId: run2, sensorId: 'sensor-2', value: 'raw/r2_s2.csv' },
      ],
      studyToSensorProcessingMapping: [],
    });

    expect(report.hasBlockingErrors).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'directory-assignment')).toBe(true);
    expect(report.warningIssues.some((issue) => issue.id === 'duplicate-file-assignments')).toBe(true);
  });

  it('returns clean summary when required mappings are complete by output mode', () => {
    const run1 = createStudyRunId('study-1', 1);
    const run2 = createStudyRunId('study-1', 2);

    const report = buildExportValidationReport({
      ...makeBaseInput(),
      studies: [
        { id: 'study-1', name: 'Study 1', runCount: 2, outputMode: OUTPUT_MODE_RAW_ONLY },
      ],
      studyToMeasurementProtocolSelection: [{ studyId: 'study-1', protocolId: 'mp-1' }],
      studyToSensorMeasurementMapping: [
        { studyRunId: run1, sensorId: 'sensor-1', value: 'raw/r1_s1.csv' },
        { studyRunId: run1, sensorId: 'sensor-2', value: 'raw/r1_s2.csv' },
        { studyRunId: run2, sensorId: 'sensor-1', value: 'raw/r2_s1.csv' },
        { studyRunId: run2, sensorId: 'sensor-2', value: 'raw/r2_s2.csv' },
      ],
      studyToSensorProcessingMapping: [],
    });

    expect(report.summary.errors).toBe(0);
    expect(report.summary.warnings).toBe(0);
    expect(report.hasBlockingErrors).toBe(false);
    expect(report.stats.requiredRawAssignments).toBe(4);
    expect(report.stats.requiredProcessedAssignments).toBe(0);
    expect(report.stats.missingMeasurement).toBe(0);
    expect(report.stats.missingProcessing).toBe(0);
  });
});
