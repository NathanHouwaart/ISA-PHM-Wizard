import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildConversionPayload } from '../utils/conversionPayload';
import { shouldRunBackendIntegration } from './backendIntegrationGate';

const RUN_BACKEND_INTEGRATION = shouldRunBackendIntegration();
const integrationDescribe = RUN_BACKEND_INTEGRATION ? describe : describe.skip;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const CONVERT_ENDPOINT = `${BACKEND_URL.replace(/\/$/, '')}/convert`;
const FIXTURE_CASES = [
  {
    name: 'example-single-run-nln-emp',
    path: 'src/data/example-single-run-nln-emp.json',
  },
  {
    name: 'example-multi-run-milling',
    path: 'src/data/example-multi-run-milling.json',
  },
];

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

  // Fallback for fixtures where projectId was renamed but embedded
  // localStorage keys still use an older project namespace.
  const suffixes = [`_${key}`];
  if (key === 'investigation') {
    suffixes.push('_investigations');
  }

  const dynamicKey = Object.keys(localStorageState || {}).find((storageKey) => {
    if (candidates.includes(storageKey)) return false;
    if (!storageKey.startsWith('globalAppData_')) return false;
    if (storageKey.startsWith('globalAppData_default_')) return false;
    return suffixes.some((suffix) => storageKey.endsWith(suffix));
  });

  if (dynamicKey) {
    return parseJsonValue(localStorageState[dynamicKey], fallback);
  }

  return fallback;
};

const buildPayloadFromExport = (projectData) => {
  const projectId = projectData?.projectId || 'default';
  const localStorageState =
    projectData?.localStorage && typeof projectData.localStorage === 'object' ? projectData.localStorage : {};

  const publications = readProjectValue(localStorageState, projectId, 'publications', []);
  const contacts = readProjectValue(localStorageState, projectId, 'contacts', []);
  const studies = readProjectValue(localStorageState, projectId, 'studies', []);
  const studyVariables = readProjectValue(localStorageState, projectId, 'studyVariables', []);
  const studyToStudyVariableMapping = readProjectValue(localStorageState, projectId, 'studyToStudyVariableMapping', []);
  const studyToSensorMeasurementMapping = readProjectValue(localStorageState, projectId, 'studyToSensorMeasurementMapping', []);
  const studyToSensorProcessingMapping = readProjectValue(localStorageState, projectId, 'studyToSensorProcessingMapping', []);
  const studyToMeasurementProtocolSelection = readProjectValue(localStorageState, projectId, 'studyToMeasurementProtocolSelection', []);
  const studyToProcessingProtocolSelection = readProjectValue(localStorageState, projectId, 'studyToProcessingProtocolSelection', []);
  const investigation = readProjectValue(localStorageState, projectId, 'investigation', {});
  const experimentType = readProjectValue(localStorageState, projectId, 'experimentType', '');
  const selectedTestSetupId = readProjectValue(localStorageState, projectId, 'selectedTestSetupId', projectData?.selectedTestSetup?.id || null);
  const selectedTestSetup = projectData?.selectedTestSetup || {};

  const testSetups = selectedTestSetupId
    ? [{ ...selectedTestSetup, id: selectedTestSetup.id || selectedTestSetupId }]
    : [selectedTestSetup];

  return {
    payload: buildConversionPayload({
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
    }),
    studies,
    expectedAssayCount: Array.isArray(testSetups[0]?.sensors) ? testSetups[0].sensors.length : 0,
  };
};

const callConversionApi = async (payload) => {
  const { postJsonFile } = await import('./utils/nodeFormFetch.js');
  const response = await postJsonFile(CONVERT_ENDPOINT, payload, 'input.json');
  if (!response.ok) {
    const text = await response.text().catch(() => null);
    throw new Error(`API Error: ${response.status} - ${text || 'Conversion failed'}`);
  }
  return response.json();
};

integrationDescribe('Backend integration with bundled example fixtures', () => {
  it.each(FIXTURE_CASES)('converts $name and preserves study/assay intent', async ({ path: fixtureFile }) => {
    const fixturePath = path.resolve(process.cwd(), fixtureFile);
    const fixtureRaw = await fs.readFile(fixturePath, 'utf8');
    const fixture = JSON.parse(fixtureRaw);

    const { payload, studies, expectedAssayCount } = buildPayloadFromExport(fixture);
    const output = await callConversionApi(payload);

    expect(Array.isArray(output.studies)).toBe(true);
    expect(output.studies.length).toBe(studies.length);

    output.studies.forEach((study) => {
      expect(Array.isArray(study.assays)).toBe(true);
      expect(study.assays.length).toBe(expectedAssayCount);
      expect(Array.isArray(study.processSequence)).toBe(true);
      expect(study.processSequence.length).toBeGreaterThan(0);

      study.assays.forEach((assay) => {
        expect(Array.isArray(assay.dataFiles)).toBe(true);
        expect(assay.dataFiles.length).toBeGreaterThan(0);
        const hasDerivedOutput = assay.dataFiles.some((dataFile) => String(dataFile?.type || '').includes('Derived'));
        expect(hasDerivedOutput).toBe(true);
      });
    });
  }, 30000);
});
