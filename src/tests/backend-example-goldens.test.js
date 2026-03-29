import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildConversionPayload } from '../utils/conversionPayload';
import { shouldRunBackendIntegration } from './backendIntegrationGate';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const CONVERT_ENDPOINT = `${BACKEND_URL.replace(/\/$/, '')}/convert`;
const RUN_BACKEND_INTEGRATION = shouldRunBackendIntegration();
const integrationDescribe = RUN_BACKEND_INTEGRATION ? describe : describe.skip;

const GOLDEN_CASES = [
  {
    name: 'single-run-nln-emp',
    inputPath: 'src/data/example-single-run-nln-emp.json',
    goldenPath: 'src/tests/fixtures/golden/isa-phm-out-sietze.json',
  },
  {
    name: 'multi-run-milling',
    inputPath: 'src/data/example-multi-run-milling.json',
    goldenPath: 'src/tests/fixtures/golden/isa-phm-out-milling.json',
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

const buildTestSetups = ({
  testSetups,
  selectedTestSetup,
  selectedTestSetupId,
  measurementProtocols,
  processingProtocols,
  sensorToMeasurementProtocolMapping,
  sensorToProcessingProtocolMapping,
}) => {
  const safeSetups = Array.isArray(testSetups) ? [...testSetups] : [];
  const selectedSetupFromExport =
    selectedTestSetup && typeof selectedTestSetup === 'object' ? selectedTestSetup : null;

  if (selectedSetupFromExport) {
    const exportSetupId = selectedSetupFromExport.id || selectedTestSetupId || null;
    const existingIndex = safeSetups.findIndex((setup) => setup?.id === exportSetupId);
    const normalizedExportSetup = exportSetupId
      ? { ...selectedSetupFromExport, id: exportSetupId }
      : { ...selectedSetupFromExport };

    if (existingIndex >= 0) {
      safeSetups[existingIndex] = { ...safeSetups[existingIndex], ...normalizedExportSetup };
    } else {
      safeSetups.push(normalizedExportSetup);
    }
  }

  const selectedIndex = safeSetups.findIndex((setup) => setup?.id === selectedTestSetupId);
  if (selectedIndex >= 0) {
    const selectedSetup = safeSetups[selectedIndex];
    safeSetups[selectedIndex] = {
      ...selectedSetup,
      measurementProtocols:
        Array.isArray(selectedSetup?.measurementProtocols) && selectedSetup.measurementProtocols.length > 0
          ? selectedSetup.measurementProtocols
          : measurementProtocols,
      processingProtocols:
        Array.isArray(selectedSetup?.processingProtocols) && selectedSetup.processingProtocols.length > 0
          ? selectedSetup.processingProtocols
          : processingProtocols,
      sensorToMeasurementProtocolMapping:
        Array.isArray(selectedSetup?.sensorToMeasurementProtocolMapping) &&
        selectedSetup.sensorToMeasurementProtocolMapping.length > 0
          ? selectedSetup.sensorToMeasurementProtocolMapping
          : sensorToMeasurementProtocolMapping,
      sensorToProcessingProtocolMapping:
        Array.isArray(selectedSetup?.sensorToProcessingProtocolMapping) &&
        selectedSetup.sensorToProcessingProtocolMapping.length > 0
          ? selectedSetup.sensorToProcessingProtocolMapping
          : sensorToProcessingProtocolMapping,
    };
  }

  return safeSetups;
};

const prepareConversionPayload = (projectData) => {
  const projectId = projectData?.projectId || 'default';
  const localStorageState =
    projectData?.localStorage && typeof projectData.localStorage === 'object' ? projectData.localStorage : {};

  const publications = readProjectValue(localStorageState, projectId, 'publications', []);
  const contacts = readProjectValue(localStorageState, projectId, 'contacts', []);
  const studies = readProjectValue(localStorageState, projectId, 'studies', []);
  const rawTestSetups = readProjectValue(localStorageState, projectId, 'testSetups', []);
  const studyVariables = readProjectValue(localStorageState, projectId, 'studyVariables', []);
  const measurementProtocols = readProjectValue(localStorageState, projectId, 'measurementProtocols', []);
  const processingProtocols = readProjectValue(localStorageState, projectId, 'processingProtocols', []);
  const studyToStudyVariableMapping = readProjectValue(localStorageState, projectId, 'studyToStudyVariableMapping', []);
  const sensorToMeasurementProtocolMapping = readProjectValue(
    localStorageState,
    projectId,
    'sensorToMeasurementProtocolMapping',
    []
  );
  const studyToSensorMeasurementMapping = readProjectValue(
    localStorageState,
    projectId,
    'studyToSensorMeasurementMapping',
    []
  );
  const sensorToProcessingProtocolMapping = readProjectValue(
    localStorageState,
    projectId,
    'sensorToProcessingProtocolMapping',
    []
  );
  const studyToSensorProcessingMapping = readProjectValue(
    localStorageState,
    projectId,
    'studyToSensorProcessingMapping',
    []
  );
  const studyToMeasurementProtocolSelection = readProjectValue(
    localStorageState,
    projectId,
    'studyToMeasurementProtocolSelection',
    []
  );
  const studyToProcessingProtocolSelection = readProjectValue(
    localStorageState,
    projectId,
    'studyToProcessingProtocolSelection',
    []
  );
  const investigation = readProjectValue(localStorageState, projectId, 'investigation', {});
  const experimentType = readProjectValue(localStorageState, projectId, 'experimentType', '');

  let selectedTestSetupId = readProjectValue(localStorageState, projectId, 'selectedTestSetupId', null);
  if (!selectedTestSetupId && projectData?.selectedTestSetup?.id) {
    selectedTestSetupId = projectData.selectedTestSetup.id;
  }

  const testSetups = buildTestSetups({
    testSetups: rawTestSetups,
    selectedTestSetup: projectData?.selectedTestSetup,
    selectedTestSetupId,
    measurementProtocols,
    processingProtocols,
    sensorToMeasurementProtocolMapping,
    sensorToProcessingProtocolMapping,
  });

  if (!selectedTestSetupId && testSetups[0]?.id) {
    selectedTestSetupId = testSetups[0].id;
  }

  return buildConversionPayload({
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

const readJson = async (relativePath) => {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  return JSON.parse(raw);
};

const assertCoreParity = (actual, expected) => {
  expect(actual.title).toBe(expected.title);
  expect(actual.description).toBe(expected.description);
  expect(actual.submissionDate).toBe(expected.submissionDate);
  expect(actual.publicReleaseDate).toBe(expected.publicReleaseDate);

  expect(actual.people.length).toBe(expected.people.length);
  expect(actual.publications.length).toBe(expected.publications.length);
  expect(actual.studies.length).toBe(expected.studies.length);

  actual.people.forEach((person, index) => {
    const expectedPerson = expected.people[index];
    expect(person.firstName).toBe(expectedPerson.firstName);
    expect(person.lastName).toBe(expectedPerson.lastName);
    expect(person.email).toBe(expectedPerson.email);
    expect(person.affiliation).toBe(expectedPerson.affiliation);
  });

  actual.studies.forEach((study, studyIndex) => {
    const expectedStudy = expected.studies[studyIndex];
    expect(study.title).toBe(expectedStudy.title);
    expect(study.description).toBe(expectedStudy.description);
    expect(study.assays.length).toBe(expectedStudy.assays.length);
    expect(study.protocols.length).toBe(expectedStudy.protocols.length);
    expect(study.factors.length).toBe(expectedStudy.factors.length);
    expect(study.materials.samples.length).toBe(expectedStudy.materials.samples.length);
    expect(study.materials.sources.length).toBe(expectedStudy.materials.sources.length);

    const actualUnits = (study.unitCategories || []).map((unit) => unit.annotationValue);
    const expectedUnits = (expectedStudy.unitCategories || []).map((unit) => unit.annotationValue);
    expect(actualUnits.length).toBeGreaterThanOrEqual(expectedUnits.length);
    expectedUnits.forEach((unit) => {
      expect(actualUnits.includes(unit)).toBe(true);
    });

    study.assays.forEach((assay, assayIndex) => {
      const expectedAssay = expectedStudy.assays[assayIndex];
      expect(assay.measurementType?.annotationValue).toBe(expectedAssay.measurementType?.annotationValue);
      expect(assay.technologyType?.annotationValue).toBe(expectedAssay.technologyType?.annotationValue);
      expect(assay.dataFiles.length).toBe(expectedAssay.dataFiles.length);

      const actualDataTypes = assay.dataFiles.map((file) => file.type);
      const expectedDataTypes = expectedAssay.dataFiles.map((file) => file.type);
      expect(actualDataTypes).toEqual(expectedDataTypes);

      expect(assay.processSequence.length).toBeGreaterThanOrEqual(2);
      expect(assay.processSequence.length).toBeLessThanOrEqual(expectedAssay.processSequence.length);
    });
  });
};

integrationDescribe('Backend integration against bundled golden examples', () => {
  GOLDEN_CASES.forEach(({ name, inputPath, goldenPath }) => {
    it(`matches stable conversion shape for ${name}`, async () => {
      const inputProject = await readJson(inputPath);
      const expectedOutput = await readJson(goldenPath);
      const payload = prepareConversionPayload(inputProject);
      const actualOutput = await callConversionApi(payload);

      assertCoreParity(actualOutput, expectedOutput);
    }, 120000);
  });
});
