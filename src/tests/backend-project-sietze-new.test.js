import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildConversionPayload } from '../utils/conversionPayload';

const RUN_BACKEND_INTEGRATION = process.env.RUN_BACKEND_INTEGRATION === '1';
const integrationDescribe = RUN_BACKEND_INTEGRATION ? describe : describe.skip;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const CONVERT_ENDPOINT = `${BACKEND_URL.replace(/\/$/, '')}/convert`;

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

integrationDescribe('Backend integration with project-sietze-new fixture', () => {
  it('converts fixture and preserves study/assay intent', async () => {
    const fixturePath = path.resolve(process.cwd(), 'src/data/project-sietze-new.json');
    const fixtureRaw = await fs.readFile(fixturePath, 'utf8');
    const fixture = JSON.parse(fixtureRaw);

    const { payload, studies } = buildPayloadFromExport(fixture);
    const output = await callConversionApi(payload);

    expect(Array.isArray(output.studies)).toBe(true);
    expect(output.studies.length).toBe(studies.length);

    output.studies.forEach((study) => {
      expect(Array.isArray(study.assays)).toBe(true);
      expect(study.assays.length).toBe(11);
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
