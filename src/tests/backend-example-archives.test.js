import { describe, it, expect } from 'vitest';
import { buildConversionPayload } from '../utils/conversionPayload';
import { shouldRunBackendIntegration } from './backendIntegrationGate';
import { readBundledProjectArchive } from './helpers/readProjectArchive';
import { isReplaceableCharacteristic } from '../utils/testSetupCharacteristics';

const RUN_BACKEND_INTEGRATION = shouldRunBackendIntegration();
const integrationDescribe = RUN_BACKEND_INTEGRATION ? describe : describe.skip;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const CONVERT_ENDPOINT = `${BACKEND_URL.replace(/\/$/, '')}/convert`;
const FIXTURE_CASES = [
  {
    name: 'diagnostics example',
    archivePath: 'public/examples/diagnostics-example.isa-phm.zip',
  },
  {
    name: 'XJTU-SY bearing datasets example',
    archivePath: 'public/examples/xjtu-sy-bearing-datasets.isa-phm.zip',
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

  return {
    studies,
    payload,
    expectedAssaysByStudy: payload.studies.map((study) => (
      (study.assay_details || []).map((assay) => (
        (assay.runs || []).flatMap((run) => [run.raw_file_name, run.processed_file_name].filter(Boolean))
      ))
    )),
    uploads: buildArchiveUploads(testSetups[0], projectData.attachments),
  };
};

const buildArchiveUploads = (testSetup = {}, archiveAttachments = []) => {
  const archiveById = new Map(archiveAttachments.map((attachment) => [String(attachment.attachmentId), attachment]));
  const datasheetManifest = [];
  const datasheets = [];
  const imageManifest = [];
  const images = [];

  const addDatasheet = (datasheet, owner) => {
    if (!datasheet?.attachmentId || datasheet.notAvailable) return;
    const attachmentId = String(datasheet.attachmentId);
    const attachment = archiveById.get(attachmentId);
    if (!attachment || attachment.kind !== 'datasheet') {
      throw new Error(`Missing datasheet attachment ${attachmentId} in project archive`);
    }
    datasheetManifest.push({
      attachmentId,
      originalFileName: datasheet.fileName || attachment.fileName,
      owner,
    });
    datasheets.push({ attachmentId, bytes: attachment.bytes });
  };

  (testSetup.characteristics || []).forEach((characteristic) => {
    if (!isReplaceableCharacteristic(characteristic?.isReplaceable)) {
      addDatasheet(characteristic?.datasheet, {
        kind: 'test_setup_characteristic', id: characteristic.id,
      });
    }
  });
  (testSetup.sensorTypes || []).forEach((sensorType) => {
    addDatasheet(sensorType?.datasheet, { kind: 'sensor_type', id: sensorType.id });
  });
  (testSetup.configurationTypes || []).forEach((componentType) => {
    addDatasheet(componentType?.datasheet, { kind: 'component_type', id: componentType.id });
  });
  (testSetup.images || []).forEach((image) => {
    if (!image?.attachmentId) return;
    const attachmentId = String(image.attachmentId);
    const attachment = archiveById.get(attachmentId);
    if (!attachment || attachment.kind !== 'image') {
      throw new Error(`Missing image attachment ${attachmentId} in project archive`);
    }
    imageManifest.push({
      attachmentId,
      originalFileName: image.fileName || attachment.fileName,
      owner: { kind: 'test_setup', id: testSetup.id },
    });
    images.push({ attachmentId, bytes: attachment.bytes, fileName: image.fileName || attachment.fileName, mimeType: attachment.mimeType });
  });

  return { datasheetManifest, datasheets, imageManifest, images };
};

const callConversionApi = async (payload, uploads) => {
  const { postJsonFile, readConversionJson } = await import('./utils/nodeFormFetch.js');
  const response = await postJsonFile(CONVERT_ENDPOINT, payload, 'input.json', uploads);
  if (!response.ok) {
    const text = await response.text().catch(() => null);
    throw new Error(`API Error: ${response.status} - ${text || 'Conversion failed'}`);
  }
  return readConversionJson(response);
};

integrationDescribe('Backend integration with bundled project archives', () => {
  it.each(FIXTURE_CASES)('converts $name and preserves study/assay intent', async ({ archivePath }) => {
    const fixture = await readBundledProjectArchive(archivePath);

    const { payload, studies, expectedAssaysByStudy, uploads } = buildPayloadFromExport(fixture);
    const output = await callConversionApi(payload, uploads);

    expect(Array.isArray(output.studies)).toBe(true);
    expect(output.studies.length).toBe(studies.length);

    output.studies.forEach((study, studyIndex) => {
      const expectedAssayFiles = expectedAssaysByStudy[studyIndex];
      expect(Array.isArray(study.assays)).toBe(true);
      expect(study.assays.length).toBe(expectedAssayFiles.length);
      expect(Array.isArray(study.processSequence)).toBe(true);

      study.assays.forEach((assay, assayIndex) => {
        expect(Array.isArray(assay.dataFiles)).toBe(true);
        expect(assay.dataFiles.map((dataFile) => dataFile.name ?? dataFile.filename)).toEqual(expectedAssayFiles[assayIndex]);
      });
    });
  }, 30000);
});
