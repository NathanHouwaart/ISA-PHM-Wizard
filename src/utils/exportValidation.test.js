import { describe, expect, it } from 'vitest';
import { createStudyRunId } from './studyRuns';
import { buildExportValidationReport } from './exportValidation';
import {
  OUTPUT_MODE_PROCESSED_ONLY,
  OUTPUT_MODE_RAW_ONLY
} from './studyOutputMode';

const makeBaseInput = () => ({
  studyToStudyVariableMapping: [
    { studyRunId: createStudyRunId('study-1', 1), studyId: 'study-1', studyVariableId: 'var-fault', value: 'BPFO' },
    { studyRunId: createStudyRunId('study-1', 1), studyId: 'study-1', studyVariableId: 'var-op', value: '1800' },
    { studyRunId: createStudyRunId('study-1', 2), studyId: 'study-1', studyVariableId: 'var-fault', value: 'BPFI' },
    { studyRunId: createStudyRunId('study-1', 2), studyId: 'study-1', studyVariableId: 'var-op', value: '1700' },
  ],
  investigation: {
    investigationTitle: 'Validation Test Project',
    investigationDescription: 'Validation baseline payload',
  },
  contacts: [
    { id: 'contact-1', firstName: 'Alex', lastName: 'Doe', email: 'alex@example.com' },
  ],
  studyVariables: [
    { id: 'var-fault', name: 'Fault Type', type: 'Qualitative fault specification' },
    { id: 'var-op', name: 'Speed', type: 'Operating condition' },
  ],
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

  it('reports missing project metadata and variable setup', () => {
    const report = buildExportValidationReport({
      ...makeBaseInput(),
      investigation: {
        investigationTitle: '',
        investigationDescription: '',
      },
      contacts: [],
      studies: [],
      studyVariables: [],
      studyToMeasurementProtocolSelection: [],
      studyToSensorMeasurementMapping: [],
      studyToSensorProcessingMapping: [],
    });

    expect(report.hasBlockingErrors).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'missing-project-title')).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'missing-studies')).toBe(true);
    expect(report.warningIssues.some((issue) => issue.id === 'missing-project-description')).toBe(true);
    expect(report.warningIssues.some((issue) => issue.id === 'missing-contacts')).toBe(true);
    expect(report.warningIssues.some((issue) => issue.id === 'missing-fault-specifications')).toBe(true);
    expect(report.warningIssues.some((issue) => issue.id === 'missing-operating-conditions')).toBe(true);
  });

  it('flags missing test matrix values as blocking errors', () => {
    const run1 = createStudyRunId('study-1', 1);
    const run2 = createStudyRunId('study-1', 2);

    const report = buildExportValidationReport({
      ...makeBaseInput(),
      studyToMeasurementProtocolSelection: [{ studyId: 'study-1', protocolId: 'mp-1' }],
      studyToSensorMeasurementMapping: [
        { studyRunId: run1, sensorId: 'sensor-1', value: 'raw/r1_s1.csv' },
        { studyRunId: run1, sensorId: 'sensor-2', value: 'raw/r1_s2.csv' },
        { studyRunId: run2, sensorId: 'sensor-1', value: 'raw/r2_s1.csv' },
        { studyRunId: run2, sensorId: 'sensor-2', value: 'raw/r2_s2.csv' },
      ],
      studyToSensorProcessingMapping: [],
      studyToStudyVariableMapping: [
        { studyRunId: run1, studyId: 'study-1', studyVariableId: 'var-fault', value: 'BPFO' },
        { studyRunId: run1, studyId: 'study-1', studyVariableId: 'var-op', value: '1800' },
        { studyRunId: run2, studyId: 'study-1', studyVariableId: 'var-fault', value: '' },
        { studyRunId: run2, studyId: 'study-1', studyVariableId: 'var-op', value: '1700' },
      ],
    });

    expect(report.hasBlockingErrors).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'missing-test-matrix-mappings')).toBe(true);
    expect(report.stats.requiredStudyVariableMappings).toBe(4);
    expect(report.stats.missingStudyVariableMappings).toBe(1);
  });

  it('flags missing test setup selection as blocking', () => {
    const report = buildExportValidationReport({
      ...makeBaseInput(),
      selectedTestSetupId: null,
    });

    expect(report.hasBlockingErrors).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'missing-test-setup')).toBe(true);
  });

  it('warns on contact rows that violate required fields or email format', () => {
    const report = buildExportValidationReport({
      ...makeBaseInput(),
      contacts: [
        { id: 'contact-1', firstName: 'Alex', lastName: '', email: 'alex@example.com' },
        { id: 'contact-2', firstName: 'Jamie', lastName: 'Doe', email: 'not-an-email' },
      ],
    });

    expect(report.warningIssues.some((issue) => issue.id === 'incomplete-contacts')).toBe(true);
    expect(report.warningIssues.some((issue) => issue.id === 'invalid-contact-emails')).toBe(true);
  });

  it('flags absolute and non-csv output mappings as blocking', () => {
    const run1 = createStudyRunId('study-1', 1);
    const run2 = createStudyRunId('study-1', 2);

    const report = buildExportValidationReport({
      ...makeBaseInput(),
      studyToMeasurementProtocolSelection: [{ studyId: 'study-1', protocolId: 'mp-1' }],
      studyToSensorMeasurementMapping: [
        { studyRunId: run1, sensorId: 'sensor-1', value: 'C:\\dataset\\r1_s1.csv' },
        { studyRunId: run1, sensorId: 'sensor-2', value: 'raw/r1_s2.txt' },
        { studyRunId: run2, sensorId: 'sensor-1', value: 'raw/r2_s1.csv' },
        { studyRunId: run2, sensorId: 'sensor-2', value: 'raw/r2_s2.csv' },
      ],
      studyToSensorProcessingMapping: [],
    });

    expect(report.hasBlockingErrors).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'absolute-file-path-assignments')).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'non-csv-file-assignments')).toBe(true);
  });

  it('flags experiments with missing name or invalid run count in multi-run templates', () => {
    const report = buildExportValidationReport({
      ...makeBaseInput(),
      experimentType: 'prognostics-experiment',
      studies: [
        { id: 'study-1', name: '', runCount: 0, outputMode: OUTPUT_MODE_RAW_ONLY },
      ],
    });

    expect(report.hasBlockingErrors).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'missing-study-name')).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'invalid-study-run-count')).toBe(true);
  });

  it('does not flag missing run count for single-run templates', () => {
    const report = buildExportValidationReport({
      ...makeBaseInput(),
      experimentType: 'diagnostic-experiment',
      studies: [
        { id: 'study-1', name: 'Study 1', outputMode: OUTPUT_MODE_RAW_ONLY },
      ],
      studyToMeasurementProtocolSelection: [{ studyId: 'study-1', protocolId: 'mp-1' }],
      studyToSensorMeasurementMapping: [
        { studyRunId: createStudyRunId('study-1', 1), sensorId: 'sensor-1', value: 'raw/r1_s1.csv' },
        { studyRunId: createStudyRunId('study-1', 1), sensorId: 'sensor-2', value: 'raw/r1_s2.csv' },
      ],
      studyToSensorProcessingMapping: [],
      studyToStudyVariableMapping: [
        { studyRunId: createStudyRunId('study-1', 1), studyId: 'study-1', studyVariableId: 'var-fault', value: 'BPFO' },
        { studyRunId: createStudyRunId('study-1', 1), studyId: 'study-1', studyVariableId: 'var-op', value: '1800' },
      ],
    });

    expect(report.blockingIssues.some((issue) => issue.id === 'invalid-study-run-count')).toBe(false);
  });

  it('validates test matrix values as relative .csv only for timeseries-mode variables', () => {
    const run1 = createStudyRunId('study-1', 1);
    const run2 = createStudyRunId('study-1', 2);

    const report = buildExportValidationReport({
      ...makeBaseInput(),
      studyVariables: [
        { id: 'var-fault', name: 'Fault Type', type: 'Qualitative fault specification', valueMode: 'scalar' },
        { id: 'var-op', name: 'Signal', type: 'Operating condition', valueMode: 'timeseries' },
      ],
      studyToMeasurementProtocolSelection: [{ studyId: 'study-1', protocolId: 'mp-1' }],
      studyToSensorMeasurementMapping: [
        { studyRunId: run1, sensorId: 'sensor-1', value: 'raw/r1_s1.csv' },
        { studyRunId: run1, sensorId: 'sensor-2', value: 'raw/r1_s2.csv' },
        { studyRunId: run2, sensorId: 'sensor-1', value: 'raw/r2_s1.csv' },
        { studyRunId: run2, sensorId: 'sensor-2', value: 'raw/r2_s2.csv' },
      ],
      studyToSensorProcessingMapping: [],
      studyToStudyVariableMapping: [
        { studyRunId: run1, studyId: 'study-1', studyVariableId: 'var-fault', value: 'BPFO' },
        { studyRunId: run2, studyId: 'study-1', studyVariableId: 'var-fault', value: 'BPFI' },
        { studyRunId: run1, studyId: 'study-1', studyVariableId: 'var-op', value: 'C:\\dataset\\run1.txt' },
        { studyRunId: run2, studyId: 'study-1', studyVariableId: 'var-op', value: './runs/run2.txt' },
      ],
    });

    expect(report.hasBlockingErrors).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'absolute-test-matrix-file-values')).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'non-csv-test-matrix-file-values')).toBe(true);
  });

  it('blocks file-like values for scalar-mode variables', () => {
    const run1 = createStudyRunId('study-1', 1);
    const run2 = createStudyRunId('study-1', 2);

    const report = buildExportValidationReport({
      ...makeBaseInput(),
      studyVariables: [
        { id: 'var-fault', name: 'Fault Type', type: 'Qualitative fault specification', valueMode: 'scalar' },
        { id: 'var-op', name: 'Speed', type: 'Operating condition', valueMode: 'scalar' },
      ],
      studyToMeasurementProtocolSelection: [{ studyId: 'study-1', protocolId: 'mp-1' }],
      studyToSensorMeasurementMapping: [
        { studyRunId: run1, sensorId: 'sensor-1', value: 'raw/r1_s1.csv' },
        { studyRunId: run1, sensorId: 'sensor-2', value: 'raw/r1_s2.csv' },
        { studyRunId: run2, sensorId: 'sensor-1', value: 'raw/r2_s1.csv' },
        { studyRunId: run2, sensorId: 'sensor-2', value: 'raw/r2_s2.csv' },
      ],
      studyToSensorProcessingMapping: [],
      studyToStudyVariableMapping: [
        { studyRunId: run1, studyId: 'study-1', studyVariableId: 'var-fault', value: './vars/fault_profile.csv' },
        { studyRunId: run2, studyId: 'study-1', studyVariableId: 'var-fault', value: 'BPFI' },
        { studyRunId: run1, studyId: 'study-1', studyVariableId: 'var-op', value: '1800' },
        { studyRunId: run2, studyId: 'study-1', studyVariableId: 'var-op', value: '1700' },
      ],
    });

    expect(report.hasBlockingErrors).toBe(true);
    expect(report.blockingIssues.some((issue) => issue.id === 'file-like-scalar-test-matrix-values')).toBe(true);
  });
});
