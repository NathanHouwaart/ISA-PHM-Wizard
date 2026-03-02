import { describe, expect, it } from 'vitest';
import { buildConversionPayload } from '../utils/conversionPayload';
import { createStudyRunId } from '../utils/studyRuns';

describe('conversion payload contract', () => {
  it('builds the expected payload shape with protocol and run-aware mappings', () => {
    const studies = [
      { id: 'study-1', name: 'Study 1', runCount: 2 },
      { id: 'study-2', name: 'Study 2', measurementProtocolId: 'mp-a', processingProtocolId: 'pp-a' },
    ];

    const testSetups = [
      {
        id: 'setup-1',
        name: 'Setup 1',
        sensors: [
          {
            id: 'sensor-1',
            alias: 'Vib-1',
            processingProtocolUiState: 'ignore-me',
          },
        ],
        measurementProtocols: [
          { id: 'mp-a', name: 'Measurement A' },
          { id: 'mp-b', name: 'Measurement B' },
        ],
        processingProtocols: [
          { id: 'pp-a', name: 'Processing A' },
          { id: 'pp-b', name: 'Processing B' },
        ],
        sensorToMeasurementProtocolMapping: [
          {
            sourceId: 'sensor-1',
            targetId: 'measure-param-b',
            protocolId: 'mp-b',
            value: { specification: '2048', unit: 'Hz' },
          },
          {
            sourceId: 'sensor-1',
            targetId: 'measure-param-a',
            protocolId: 'mp-a',
            value: ['1024', 'Hz'],
          },
        ],
        sensorToProcessingProtocolMapping: [
          {
            sourceId: 'sensor-1',
            targetId: 'proc-param-b',
            protocolId: 'pp-b',
            value: ['hanning', ''],
          },
          {
            sourceId: 'sensor-1',
            targetId: 'proc-param-a',
            protocolId: 'pp-a',
            value: { specification: 'none', unit: '' },
          },
        ],
      },
    ];

    const study1Run1 = createStudyRunId('study-1', 1);
    const study1Run2 = createStudyRunId('study-1', 2);
    const study2Run1 = createStudyRunId('study-2', 1);

    const payload = buildConversionPayload({
      investigation: {
        investigationIdentifier: 'INV-001',
        investigationTitle: 'Contract Test Investigation',
        investigationDescription: 'Payload builder contract',
        license: 'MIT',
        submissionDate: '2026-03-02',
        publicReleaseDate: '2026-03-03',
      },
      publications: [{ id: 'pub-1', title: 'Paper' }],
      contacts: [{ id: 'contact-1', firstName: 'Alice' }],
      studyVariables: [{ id: 'var-1', name: 'Load' }],
      studies,
      testSetups,
      selectedTestSetupId: 'setup-1',
      experimentType: 'diagnostic-multi',
      studyToStudyVariableMapping: [
        { studyRunId: study1Run1, studyVariableId: 'var-1', value: '10' },
        { studyRunId: study1Run2, studyVariableId: 'var-1', value: '11' },
        { studyId: 'study-2', studyVariableId: 'var-1', value: '20' },
      ],
      studyToSensorMeasurementMapping: [
        { studyRunId: study1Run1, sensorId: 'sensor-1', value: 'study1_run1_raw.csv' },
        { studyRunId: study1Run2, sensorId: 'sensor-1', value: 'study1_run2_raw.csv' },
        { studyId: 'study-2', sensorId: 'sensor-1', value: 'study2_raw.csv' },
      ],
      studyToSensorProcessingMapping: [
        { studyRunId: study1Run1, sensorId: 'sensor-1', value: 'study1_run1_proc.csv' },
        { studyRunId: study1Run2, sensorId: 'sensor-1', value: 'study1_run2_proc.csv' },
        { studyId: 'study-2', sensorId: 'sensor-1', value: 'study2_proc.csv' },
      ],
      studyToMeasurementProtocolSelection: [{ studyId: 'study-1', protocolId: 'mp-b' }],
      studyToProcessingProtocolSelection: [{ studyId: 'study-1', protocolId: 'pp-b' }],
    });

    expect(payload).toEqual(expect.objectContaining({
      identifier: 'INV-001',
      title: 'Contract Test Investigation',
      description: 'Payload builder contract',
      submission_date: '2026-03-02',
      public_release_date: '2026-03-03',
      experiment_type: 'diagnostic-multi',
    }));
    expect(Array.isArray(payload.studies)).toBe(true);
    expect(payload.studies).toHaveLength(2);
    expect(payload.measurement_protocols).toHaveLength(2);
    expect(payload.processing_protocols).toHaveLength(2);

    const firstStudy = payload.studies[0];
    expect(firstStudy.selectedMeasurementProtocolId).toBe('mp-b');
    expect(firstStudy.selectedProcessingProtocolId).toBe('pp-b');
    expect(firstStudy.total_runs).toBe(2);
    expect(firstStudy.study_to_study_variable_mapping).toHaveLength(2);
    expect(firstStudy.assay_details).toHaveLength(1);

    const firstAssay = firstStudy.assay_details[0];
    expect(firstAssay.measurement_protocol_id).toBe('mp-b');
    expect(firstAssay.processing_protocol_id).toBe('pp-b');
    expect(firstAssay.measurement_protocols).toEqual([
      {
        sourceId: 'sensor-1',
        targetId: 'measure-param-b',
        protocolId: 'mp-b',
        value: ['2048', 'Hz'],
      },
    ]);
    expect(firstAssay.processing_protocols).toEqual([
      {
        sourceId: 'sensor-1',
        targetId: 'proc-param-b',
        protocolId: 'pp-b',
        value: ['hanning', ''],
      },
    ]);
    expect(firstAssay.runs).toEqual([
      {
        run_number: 1,
        study_run_id: study1Run1,
        study_id: 'study-1',
        raw_file_name: 'study1_run1_raw.csv',
        processed_file_name: 'study1_run1_proc.csv',
      },
      {
        run_number: 2,
        study_run_id: study1Run2,
        study_id: 'study-1',
        raw_file_name: 'study1_run2_raw.csv',
        processed_file_name: 'study1_run2_proc.csv',
      },
    ]);
    expect(firstAssay.used_sensor.processingProtocolUiState).toBeUndefined();

    const secondStudy = payload.studies[1];
    expect(secondStudy.selectedMeasurementProtocolId).toBe('mp-a');
    expect(secondStudy.selectedProcessingProtocolId).toBe('pp-a');
    expect(secondStudy.total_runs).toBe(1);
    expect(secondStudy.assay_details[0].runs).toEqual([
      {
        run_number: 1,
        study_run_id: study2Run1,
        study_id: 'study-2',
        raw_file_name: 'study2_raw.csv',
        processed_file_name: 'study2_proc.csv',
      },
    ]);
  });

  it('returns a safe payload when no test setup is selected', () => {
    const payload = buildConversionPayload({
      investigation: {},
      studies: [{ id: 'study-1', name: 'Study 1' }],
      testSetups: [],
      selectedTestSetupId: 'missing',
    });

    expect(Array.isArray(payload.measurement_protocols)).toBe(true);
    expect(payload.measurement_protocols).toHaveLength(0);
    expect(Array.isArray(payload.processing_protocols)).toBe(true);
    expect(payload.processing_protocols).toHaveLength(0);
    expect(payload.studies).toHaveLength(1);
    expect(payload.studies[0].used_setup).toBeNull();
    expect(Array.isArray(payload.studies[0].assay_details)).toBe(true);
    expect(payload.studies[0].assay_details).toHaveLength(0);
  });
});
