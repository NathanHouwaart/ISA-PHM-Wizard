import { describe, expect, it } from 'vitest';
import { buildConversionPayload } from '../utils/conversionPayload';
import { createStudyRunId } from '../utils/studyRuns';
import fs from 'node:fs/promises';
import path from 'node:path';

const parseJsonValue = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const readProjectValue = (localStorageState, projectId, key, fallback) => {
  const candidates = [
    `globalAppData_${projectId}_${key}`,
    `globalAppData_default_${key}`,
    `globalAppData_${key}`,
  ];

  if (key === 'investigation') {
    candidates.push(`globalAppData_${projectId}_investigations`);
    candidates.push('globalAppData_default_investigations');
  }

  for (const storageKey of candidates) {
    if (hasOwn(localStorageState, storageKey)) {
      return parseJsonValue(localStorageState[storageKey], fallback);
    }
  }

  return fallback;
};

const FIXTURE_CASES = [
  {
    name: 'example-single-run-sietze',
    path: 'src/data/example-single-run-sietze.json',
  },
  {
    name: 'example-multi-run-milling',
    path: 'src/data/example-multi-run-milling.json',
  },
];

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
    expect(firstAssay.assay_file_name).toBe('se01');
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
    expect(secondStudy.assay_details[0].assay_file_name).toBe('se01');
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

  it('normalizes runCount to integer when source study stores it as a string', () => {
    const payload = buildConversionPayload({
      studies: [{ id: 'study-1', name: 'Study 1', runCount: '20' }],
      testSetups: [],
      selectedTestSetupId: null,
    });

    expect(payload.studies).toHaveLength(1);
    expect(payload.studies[0].runCount).toBe(20);
    expect(typeof payload.studies[0].runCount).toBe('number');
    expect(payload.studies[0].total_runs).toBe(20);
  });

  it('applies output mode rules to raw/processed fields', () => {
    const processedRun = createStudyRunId('study-processed', 1);
    const rawRun = createStudyRunId('study-raw', 1);

    const payload = buildConversionPayload({
      studies: [
        {
          id: 'study-processed',
          name: 'Processed Study',
          runCount: 1,
          outputMode: 'processed_only',
          measurementProtocolId: 'mp-1',
          processingProtocolId: 'pp-1',
        },
        {
          id: 'study-raw',
          name: 'Raw Study',
          runCount: 1,
          outputMode: 'raw_only',
          measurementProtocolId: 'mp-1',
          processingProtocolId: 'pp-1',
        },
      ],
      testSetups: [
        {
          id: 'setup-1',
          sensors: [{ id: 'sensor-1', alias: 'S1' }],
          measurementProtocols: [{ id: 'mp-1', name: 'Measurement 1' }],
          processingProtocols: [{ id: 'pp-1', name: 'Processing 1' }],
          sensorToMeasurementProtocolMapping: [],
          sensorToProcessingProtocolMapping: [],
        },
      ],
      selectedTestSetupId: 'setup-1',
      studyToSensorMeasurementMapping: [
        { studyRunId: processedRun, sensorId: 'sensor-1', value: 'raw/processed-study.csv' },
        { studyRunId: rawRun, sensorId: 'sensor-1', value: 'raw/raw-study.csv' },
      ],
      studyToSensorProcessingMapping: [
        { studyRunId: processedRun, sensorId: 'sensor-1', value: 'proc/processed-study.csv' },
        { studyRunId: rawRun, sensorId: 'sensor-1', value: 'proc/raw-study.csv' },
      ],
    });

    const processedStudy = payload.studies.find((study) => study.id === 'study-processed');
    const rawStudy = payload.studies.find((study) => study.id === 'study-raw');

    expect(processedStudy).toBeTruthy();
    expect(rawStudy).toBeTruthy();

    const processedAssay = processedStudy.assay_details[0];
    expect(processedAssay.processing_protocol_id).toBe('pp-1');
    expect(processedAssay.runs[0].raw_file_name).toBe('');
    expect(processedAssay.runs[0].processed_file_name).toBe('proc/processed-study.csv');

    const rawAssay = rawStudy.assay_details[0];
    expect(rawAssay.processing_protocol_id).toBe('');
    expect(rawAssay.processing_protocols).toEqual([]);
    expect(rawAssay.runs[0].raw_file_name).toBe('raw/raw-study.csv');
    expect(rawAssay.runs[0].processed_file_name).toBe('');
  });

  it.each(FIXTURE_CASES)('builds a valid payload from $name fixture', async ({ path: fixtureFile }) => {
    const fixturePath = path.resolve(process.cwd(), fixtureFile);
    const fixtureRaw = await fs.readFile(fixturePath, 'utf8');
    const fixture = JSON.parse(fixtureRaw);

    const projectId = fixture?.projectId || 'default';
    const localStorageState =
      fixture?.localStorage && typeof fixture.localStorage === 'object' ? fixture.localStorage : {};

    const studies = readProjectValue(localStorageState, projectId, 'studies', []);
    const studyVariables = readProjectValue(localStorageState, projectId, 'studyVariables', []);
    const publications = readProjectValue(localStorageState, projectId, 'publications', []);
    const contacts = readProjectValue(localStorageState, projectId, 'contacts', []);
    const investigation = readProjectValue(localStorageState, projectId, 'investigation', {});
    const experimentType = readProjectValue(localStorageState, projectId, 'experimentType', '');
    const studyToStudyVariableMapping = readProjectValue(localStorageState, projectId, 'studyToStudyVariableMapping', []);
    const studyToSensorMeasurementMapping = readProjectValue(localStorageState, projectId, 'studyToSensorMeasurementMapping', []);
    const studyToSensorProcessingMapping = readProjectValue(localStorageState, projectId, 'studyToSensorProcessingMapping', []);
    const studyToMeasurementProtocolSelection = readProjectValue(localStorageState, projectId, 'studyToMeasurementProtocolSelection', []);
    const studyToProcessingProtocolSelection = readProjectValue(localStorageState, projectId, 'studyToProcessingProtocolSelection', []);
    const selectedTestSetupId = readProjectValue(localStorageState, projectId, 'selectedTestSetupId', fixture?.selectedTestSetup?.id || null);

    const selectedTestSetup = fixture?.selectedTestSetup || {};
    const testSetups = selectedTestSetupId
      ? [{ ...selectedTestSetup, id: selectedTestSetup.id || selectedTestSetupId }]
      : [selectedTestSetup];
    const setup = testSetups[0] || {};

    const studyIds = new Set((studies || []).map((study) => study?.id).filter(Boolean));
    const studyRunIds = new Set(
      (studies || []).flatMap((study) => {
        const runCount = Number(study?.runCount ?? study?.total_runs ?? 1);
        return Array.from({ length: Number.isFinite(runCount) && runCount > 0 ? runCount : 1 }, (_, index) => (
          `${study.id}::run-${String(index + 1).padStart(2, '0')}`
        ));
      })
    );
    const studyVariableIds = new Set((studyVariables || []).map((item) => item?.id).filter(Boolean));
    const sensorIds = new Set((setup?.sensors || []).map((sensor) => sensor?.id).filter(Boolean));
    const measurementProtocolIds = new Set((setup?.measurementProtocols || []).map((protocol) => protocol?.id).filter(Boolean));
    const processingProtocolIds = new Set((setup?.processingProtocols || []).map((protocol) => protocol?.id).filter(Boolean));
    const measurementParameterIds = new Set(
      (setup?.measurementProtocols || []).flatMap((protocol) => (protocol?.parameters || []).map((parameter) => parameter?.id)).filter(Boolean)
    );
    const processingParameterIds = new Set(
      (setup?.processingProtocols || []).flatMap((protocol) => (protocol?.parameters || []).map((parameter) => parameter?.id)).filter(Boolean)
    );

    studyToStudyVariableMapping.forEach((mapping) => {
      expect(studyVariableIds.has(mapping.studyVariableId)).toBe(true);
      if (mapping.studyRunId) expect(studyRunIds.has(mapping.studyRunId)).toBe(true);
      if (mapping.studyId) expect(studyIds.has(mapping.studyId)).toBe(true);
    });

    studyToSensorMeasurementMapping.forEach((mapping) => {
      expect(sensorIds.has(mapping.sensorId)).toBe(true);
      if (mapping.studyRunId) expect(studyRunIds.has(mapping.studyRunId)).toBe(true);
      if (mapping.studyId) expect(studyIds.has(mapping.studyId)).toBe(true);
    });

    studyToSensorProcessingMapping.forEach((mapping) => {
      expect(sensorIds.has(mapping.sensorId)).toBe(true);
      if (mapping.studyRunId) expect(studyRunIds.has(mapping.studyRunId)).toBe(true);
      if (mapping.studyId) expect(studyIds.has(mapping.studyId)).toBe(true);
    });

    (setup?.sensorToMeasurementProtocolMapping || []).forEach((mapping) => {
      expect(sensorIds.has(mapping.sourceId || mapping.sensorId)).toBe(true);
      expect(measurementParameterIds.has(mapping.targetId)).toBe(true);
      if (mapping.protocolId) expect(measurementProtocolIds.has(mapping.protocolId)).toBe(true);
    });

    (setup?.sensorToProcessingProtocolMapping || []).forEach((mapping) => {
      expect(sensorIds.has(mapping.sourceId || mapping.sensorId)).toBe(true);
      expect(processingParameterIds.has(mapping.targetId)).toBe(true);
      if (mapping.protocolId) expect(processingProtocolIds.has(mapping.protocolId)).toBe(true);
    });

    studyToMeasurementProtocolSelection.forEach((mapping) => {
      expect(studyIds.has(mapping.studyId)).toBe(true);
      expect(measurementProtocolIds.has(mapping.protocolId)).toBe(true);
    });

    studyToProcessingProtocolSelection.forEach((mapping) => {
      expect(studyIds.has(mapping.studyId)).toBe(true);
      expect(processingProtocolIds.has(mapping.protocolId)).toBe(true);
    });

    const payload = buildConversionPayload({
      investigation,
      publications,
      contacts,
      studyVariables,
      studies,
      testSetups,
      selectedTestSetupId,
      experimentType,
      studyToStudyVariableMapping,
      studyToSensorMeasurementMapping,
      studyToSensorProcessingMapping,
      studyToMeasurementProtocolSelection,
      studyToProcessingProtocolSelection,
    });

    expect(payload.studies).toHaveLength(studies.length);
    expect(payload.study_variables).toHaveLength(studyVariables.length);
    expect(payload.processing_protocols).toHaveLength(
      Array.isArray(testSetups[0]?.processingProtocols) ? testSetups[0].processingProtocols.length : 0
    );
    expect(payload.measurement_protocols).toHaveLength(
      Array.isArray(testSetups[0]?.measurementProtocols) ? testSetups[0].measurementProtocols.length : 0
    );

    const setupSensorCount = Array.isArray(testSetups[0]?.sensors) ? testSetups[0].sensors.length : 0;

    payload.studies.forEach((study) => {
      expect(study.total_runs).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(study.assay_details)).toBe(true);
      expect(study.assay_details).toHaveLength(setupSensorCount);
      expect(Array.isArray(study.study_to_study_variable_mapping)).toBe(true);
      expect(study.study_to_study_variable_mapping.length).toBeGreaterThanOrEqual(0);

      study.assay_details.forEach((assay) => {
        expect(/^se\d{2}$/i.test(assay.assay_file_name)).toBe(true);
        expect(Array.isArray(assay.runs)).toBe(true);
        expect(assay.runs).toHaveLength(study.total_runs);
        if (assay.runs.length > 0) {
          expect(typeof assay.runs[0].processed_file_name).toBe('string');
        }
      });
    });
  });
});
