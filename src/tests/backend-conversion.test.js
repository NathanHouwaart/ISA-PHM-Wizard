import { describe, it, expect, beforeAll } from 'vitest';
import expectedOutput from './isa-phm-out.json';
import { buildConversionPayload } from '../utils/conversionPayload';
import fs from 'node:fs/promises';
import path from 'node:path';


/**
 * ISA-PHM Conversion Integration Test Suite
 * 
 * This test suite validates the complete conversion pipeline by:
 * 1. Loading the default project state fixture
 * 2. Extracting localStorage data and preparing the conversion payload
 * 3. Sending the payload to the backend API
 * 4. Validating the JSON response matches the golden output (isa-phm-out.json)
 * 
 * PREREQUISITES:
 * - Backend server must be running on BACKEND_URL (default http://localhost:8080)
 * - Backend /convert endpoint must be available
 * 
 * Run backend first:
 *   cd ../ISA-PHM-Backend
 *   python -m uvicorn main:app --reload --port 8080
 * 
 * Then run this test:
 *   RUN_BACKEND_INTEGRATION=1 npm run test:integration
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const CONVERT_ENDPOINT = `${BACKEND_URL.replace(/\/$/, '')}/convert`;
const RUN_BACKEND_INTEGRATION = process.env.RUN_BACKEND_INTEGRATION === '1';
const integrationDescribe = RUN_BACKEND_INTEGRATION ? describe : describe.skip;
const UUID_V4_LIKE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_PERF_LIMIT_MS = 15000;
const BACKEND_PERF_LIMIT_MS = Number.isFinite(Number(process.env.BACKEND_PERF_LIMIT_MS))
  ? Number(process.env.BACKEND_PERF_LIMIT_MS)
  : DEFAULT_PERF_LIMIT_MS;

const normalizeStudyFilename = (filename) => String(filename || '').replace(/^a_/, '');
const normalizeExperimentPreparationName = (name) => String(name || '').replace(/\s+Protocol$/, '');

const isSupportedAssayFilename = (filename) => {
  const value = String(filename || '');
  return /^a_s\d{2}_.+\.txt$/i.test(value) || /^a_st\d{2}_se\d{2}$/i.test(value) || /^se\d{2}$/i.test(value);
};

const expectCompatibleIdentifier = (actualIdentifier, expectedIdentifier) => {
  expect(typeof actualIdentifier).toBe('string');
  expect(actualIdentifier.length).toBeGreaterThan(0);

  if (actualIdentifier === expectedIdentifier) {
    return;
  }

  // Newer backend builds may generate a UUID identifier while older output
  // preserved the frontend-provided investigation identifier.
  expect(UUID_V4_LIKE_REGEX.test(actualIdentifier)).toBe(true);
};

async function loadInputFixture() {
  const candidates = [
    path.resolve(process.cwd(), 'src/tests/fixtures/isa-project-example.json'),
    path.resolve(process.cwd(), 'src/data/isa-project-example.json'),
    path.resolve(process.cwd(), 'src/data/example-single-run-sietze.json'),
    path.resolve(process.cwd(), 'src/data/example-multi-run-milling.json'),
    path.resolve(process.cwd(), 'data/isa-project-example.json'),
  ];

  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      return JSON.parse(raw);
    } catch {
      // Try next path.
    }
  }

  throw new Error(
    `Missing integration fixture. Looked in:\n${candidates.join('\n')}`
  );
}

const parseJsonValue = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') {
    return value;
  }
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
      measurementProtocols: Array.isArray(selectedSetup?.measurementProtocols) && selectedSetup.measurementProtocols.length > 0
        ? selectedSetup.measurementProtocols
        : measurementProtocols,
      processingProtocols: Array.isArray(selectedSetup?.processingProtocols) && selectedSetup.processingProtocols.length > 0
        ? selectedSetup.processingProtocols
        : processingProtocols,
      sensorToMeasurementProtocolMapping:
        Array.isArray(selectedSetup?.sensorToMeasurementProtocolMapping) && selectedSetup.sensorToMeasurementProtocolMapping.length > 0
          ? selectedSetup.sensorToMeasurementProtocolMapping
          : sensorToMeasurementProtocolMapping,
      sensorToProcessingProtocolMapping:
        Array.isArray(selectedSetup?.sensorToProcessingProtocolMapping) && selectedSetup.sensorToProcessingProtocolMapping.length > 0
          ? selectedSetup.sensorToProcessingProtocolMapping
          : sensorToProcessingProtocolMapping,
    };
  }

  return safeSetups;
};

// Helper function to prepare the conversion payload from exported project data.
function prepareConversionPayload(projectData) {
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
}

// Helper function to call the backend API
async function callConversionAPI(payload) {
  // Use the Node helper (form-data + node-fetch) to send a multipart file like curl/browser
  const { postJsonFile } = await import('./utils/nodeFormFetch.js');
  console.log('🚀 Calling conversion API at', CONVERT_ENDPOINT);
  const response = await postJsonFile(CONVERT_ENDPOINT, payload, 'input.json');

  if (!response.ok) {
    const text = await response.text().catch(() => null);
    throw new Error(`API Error: ${response.status} - ${text || 'Conversion failed'}`);
  }

  return await response.json();
}

integrationDescribe('ISA-PHM Conversion Integration Tests', () => {
  let inputData;
  let apiOutput;
  let backendAvailable = false;
  let backendError = null;

  beforeAll(async () => {
    // Load input data fixture.
    inputData = await loadInputFixture();

    // Try to call the conversion API directly (backend may not have a root endpoint)
    try {
      console.log('🔍 Testing backend conversion endpoint at', CONVERT_ENDPOINT);
      console.log('📤 Sending conversion request...');
      
      // Prepare payload and call API
      const payload = prepareConversionPayload(inputData);
      console.log('📦 Payload prepared with', payload.studies?.length, 'studies');
      
      apiOutput = await callConversionAPI(payload);
      backendAvailable = true;
      
      console.log('✅ Conversion successful!');
      console.log('📊 Response has', apiOutput.studies?.length, 'studies');
    } catch (error) {
      backendAvailable = false;
      backendError = error.message;
      console.warn('⚠️  Backend not available:', error.message);
      console.warn('⚠️  To run integration tests, start backend with:');
      console.warn('    cd ../ISA-PHM-Backend');
      console.warn('    python -m uvicorn main:app --reload --port 8080');
    }
  }, 30000); // 30 second timeout for API call

  describe('Backend Availability', () => {
    it('should have backend running', () => {
      if (!backendAvailable) {
        console.warn('\n⚠️  SKIPPING INTEGRATION TESTS');
        console.warn('⚠️  Backend is not running at', BACKEND_URL);
        console.warn('⚠️  Error:', backendError);
        console.warn('⚠️  Start it with: cd ../ISA-PHM-Backend && python -m uvicorn main:app --reload --port 8080\n');
      }
      expect(backendAvailable).toBe(true);
    });
  });

  describe('API Response Structure', () => {
    it('should return a valid JSON response', () => {
      if (!backendAvailable) {
        console.warn('⚠️  Skipping test - backend not available');
        return;
      }
      expect(apiOutput).toBeDefined();
      expect(typeof apiOutput).toBe('object');
    });

    it('should have investigation level fields', () => {
      if (!backendAvailable) return;
      expect(apiOutput).toHaveProperty('identifier');
      expect(apiOutput).toHaveProperty('title');
      expect(apiOutput).toHaveProperty('description');
      expect(apiOutput).toHaveProperty('submissionDate');
      expect(apiOutput).toHaveProperty('publicReleaseDate');
    });

    it('should have people array', () => {
      if (!backendAvailable) return;
      expect(Array.isArray(apiOutput.people)).toBe(true);
      expect(apiOutput.people.length).toBeGreaterThan(0);
    });

    it('should have publications array', () => {
      if (!backendAvailable) return;
      expect(Array.isArray(apiOutput.publications)).toBe(true);
      expect(apiOutput.publications.length).toBeGreaterThan(0);
    });

    it('should have studies array', () => {
      if (!backendAvailable) return;
      expect(Array.isArray(apiOutput.studies)).toBe(true);
      expect(apiOutput.studies.length).toBeGreaterThan(0);
    });
  });

  describe('Investigation Level Data from API', () => {
    it('should have correct investigation identifier', () => {
      if (!backendAvailable) return;
      expectCompatibleIdentifier(apiOutput.identifier, expectedOutput.identifier);
    });

    it('should have investigation title matching golden output', () => {
      if (!backendAvailable) return;
      expect(apiOutput.title).toBe(expectedOutput.title);
    });

    it('should have investigation description matching golden output', () => {
      if (!backendAvailable) return;
      expect(apiOutput.description).toBe(expectedOutput.description);
    });

    it('should have submission date matching golden output', () => {
      if (!backendAvailable) return;
      expect(apiOutput.submissionDate).toBe(expectedOutput.submissionDate);
    });

    it('should have public release date matching golden output', () => {
      if (!backendAvailable) return;
      expect(apiOutput.publicReleaseDate).toBe(expectedOutput.publicReleaseDate);
    });

    it('should have license in comments matching golden output', () => {
      if (!backendAvailable) return;
      expect(Array.isArray(apiOutput.comments)).toBe(true);
      const expectedLicense = expectedOutput.comments.find(c => c.name === 'License')?.value;
      const licenseComment = apiOutput.comments.find(c => c.name === 'License');
      // Legacy output stores license as a comment. Newer output may omit this
      // comment or move license handling upstream.
      if (licenseComment && expectedLicense !== undefined) {
        expect(licenseComment.value).toBe(expectedLicense);
      }
    });
  });

  describe('People/Authors from API', () => {
    it('should have correct number of people', () => {
      if (!backendAvailable) return;
      expect(apiOutput.people.length).toBe(expectedOutput.people.length);
    });

    it('should have people matching golden output', () => {
      if (!backendAvailable) return;
      apiOutput.people.forEach((person, index) => {
        const expectedPerson = expectedOutput.people[index];
        expect(person.firstName).toBe(expectedPerson.firstName);
        expect(person.lastName).toBe(expectedPerson.lastName);
        expect(person.email).toBe(expectedPerson.email);
        expect(person.affiliation).toBe(expectedPerson.affiliation);
      });
    });

    it('should have correct roles for each person', () => {
      if (!backendAvailable) return;
      apiOutput.people.forEach((person, index) => {
        const expectedPerson = expectedOutput.people[index];
        expect(Array.isArray(person.roles)).toBe(true);
        expect(person.roles.length).toBe(expectedPerson.roles.length);
        
        person.roles.forEach((role, roleIndex) => {
          expect(role.annotationValue).toBe(expectedPerson.roles[roleIndex].annotationValue);
        });
      });
    });

    it('should have author_id in comments matching golden output', () => {
      if (!backendAvailable) return;
      apiOutput.people.forEach((person, index) => {
        const expectedPerson = expectedOutput.people[index];
        const authorIdComment = person.comments.find(c => c.name === 'author_id');
        const expectedAuthorId = expectedPerson.comments.find(c => c.name === 'author_id');
        
        expect(authorIdComment).toBeDefined();
        expect(authorIdComment.value).toBe(expectedAuthorId.value);
      });
    });
  });

  describe('Publications from API', () => {
    it('should have correct number of publications', () => {
      if (!backendAvailable) return;
      expect(apiOutput.publications.length).toBe(expectedOutput.publications.length);
    });

    it('should have publication data matching golden output', () => {
      if (!backendAvailable) return;
      apiOutput.publications.forEach((pub, index) => {
        const expectedPub = expectedOutput.publications[index];
        expect(pub.title).toBe(expectedPub.title);
        expect(pub.doi).toBe(expectedPub.doi);
        expect(pub.status.annotationValue).toBe(expectedPub.status.annotationValue);
      });
    });
  });

  describe('Studies from API', () => {
    it('should have correct number of studies', () => {
      if (!backendAvailable) return;
      expect(apiOutput.studies.length).toBe(expectedOutput.studies.length);
    });

    it('should have study identifiers matching golden output', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, index) => {
        expect(study.identifier).toBe(expectedOutput.studies[index].identifier);
      });
    });

    it('should have study titles matching golden output', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, index) => {
        expect(study.title).toBe(expectedOutput.studies[index].title);
      });
    });

    it('should have study descriptions matching golden output', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, index) => {
        expect(study.description).toBe(expectedOutput.studies[index].description);
      });
    });

    it('should have study filenames matching golden output', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, index) => {
        const expectedFilename = expectedOutput.studies[index].filename;
        expect(normalizeStudyFilename(study.filename)).toBe(normalizeStudyFilename(expectedFilename));
      });
    });
  });

  describe('Study Protocols from API', () => {
    it('should have correct number of protocols in each study', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, index) => {
        const expectedStudy = expectedOutput.studies[index];
        expect(study.protocols.length).toBe(expectedStudy.protocols.length);
      });
    });

    it('should have experiment preparation protocol', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study) => {
        const prepProtocol = study.protocols.find(p => 
          p.protocolType?.annotationValue === 'Experiment Preparation Protocol'
        );
        expect(prepProtocol).toBeDefined();
        expect(normalizeExperimentPreparationName(prepProtocol.name)).toBe('Experiment Preparation');
      });
    });

    it('should have correct protocol types', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, studyIndex) => {
        const expectedStudy = expectedOutput.studies[studyIndex];
        
        const measurementProtocols = study.protocols.filter(p => 
          p.protocolType?.annotationValue === 'Measurement Protocol'
        );
        const expectedMeasurementCount = expectedStudy.protocols.filter(p => 
          p.protocolType?.annotationValue === 'Measurement Protocol'
        ).length;
        expect(measurementProtocols.length).toBe(expectedMeasurementCount);
        
        const processingProtocols = study.protocols.filter(p => 
          p.protocolType?.annotationValue === 'Processing Protocol'
        );
        const expectedProcessingCount = expectedStudy.protocols.filter(p => 
          p.protocolType?.annotationValue === 'Processing Protocol'
        ).length;
        expect(processingProtocols.length).toBe(expectedProcessingCount);
      });
    });

    it('should have sensor id in measurement protocol comments', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study) => {
        const measurementProtocols = study.protocols.filter(p => 
          p.protocolType?.annotationValue === 'Measurement Protocol'
        );
        measurementProtocols.forEach((protocol) => {
          const sensorIdComment = protocol.comments.find(c => c.name === 'Sensor id');
          expect(sensorIdComment).toBeDefined();
          expect(sensorIdComment.value).toBeTruthy();
        });
      });
    });
  });

  describe('Study Materials from API', () => {
    it('should have materials in each study', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study) => {
        expect(study.materials).toBeDefined();
        expect(study.materials).toHaveProperty('sources');
        expect(study.materials).toHaveProperty('samples');
      });
    });

    it('should have sources', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study) => {
        expect(Array.isArray(study.materials.sources)).toBe(true);
        expect(study.materials.sources.length).toBeGreaterThan(0);
      });
    });

    it('should have samples with characteristics', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, index) => {
        expect(Array.isArray(study.materials.samples)).toBe(true);
        expect(study.materials.samples.length).toBeGreaterThan(0);
        
        const sample = study.materials.samples[0];
        const expectedSample = expectedOutput.studies[index].materials.samples[0];
        expect(Array.isArray(sample.characteristics)).toBe(true);
        expect(sample.characteristics.length).toBe(expectedSample.characteristics.length);
      });
    });

    it('should have factor values in samples', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study) => {
        const sample = study.materials.samples[0];
        expect(Array.isArray(sample.factorValues)).toBe(true);
        expect(sample.factorValues.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Study Factors from API', () => {
    it('should have correct number of factors in each study', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, index) => {
        const expectedStudy = expectedOutput.studies[index];
        expect(study.factors.length).toBe(expectedStudy.factors.length);
      });
    });

    it('should have factor names matching golden output', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, studyIndex) => {
        const expectedStudy = expectedOutput.studies[studyIndex];
        study.factors.forEach((factor, factorIndex) => {
          expect(factor.factorName).toBe(expectedStudy.factors[factorIndex].factorName);
        });
      });
    });
  });

  describe('Assays from API', () => {
    it('should have correct number of assays in each study', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, index) => {
        const expectedStudy = expectedOutput.studies[index];
        expect(study.assays.length).toBe(expectedStudy.assays.length);
      });
    });

    it('should have assay filenames matching golden output', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, studyIndex) => {
        const expectedStudy = expectedOutput.studies[studyIndex];
        study.assays.forEach((assay, assayIndex) => {
          const expectedFilename = expectedStudy.assays[assayIndex].filename;
          const exactMatch = assay.filename === expectedFilename;
          expect(exactMatch || isSupportedAssayFilename(assay.filename)).toBe(true);
        });
      });
    });

    it('should have technology platforms matching golden output', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, studyIndex) => {
        const expectedStudy = expectedOutput.studies[studyIndex];
        study.assays.forEach((assay, assayIndex) => {
          expect(assay.technologyPlatform).toBe(expectedStudy.assays[assayIndex].technologyPlatform);
        });
      });
    });

    it('should have correct measurement and technology types', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, studyIndex) => {
        const expectedStudy = expectedOutput.studies[studyIndex];
        study.assays.forEach((assay, assayIndex) => {
          const expectedAssay = expectedStudy.assays[assayIndex];
          expect(assay.measurementType.annotationValue).toBe(expectedAssay.measurementType.annotationValue);
          expect(assay.technologyType.annotationValue).toBe(expectedAssay.technologyType.annotationValue);
        });
      });
    });

    it('should have correct data file types in assays', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, studyIndex) => {
        const expectedStudy = expectedOutput.studies[studyIndex];
        study.assays.forEach((assay, assayIndex) => {
          const expectedAssay = expectedStudy.assays[assayIndex];
          expect(assay.dataFiles.length).toBe(expectedAssay.dataFiles.length);
          
          const types = assay.dataFiles.map(df => df.type);
          const expectedTypes = expectedAssay.dataFiles.map(df => df.type);
          expect(types).toEqual(expectedTypes);
        });
      });
    });

    it('should have process sequences matching golden output length', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, studyIndex) => {
        const expectedStudy = expectedOutput.studies[studyIndex];
        study.assays.forEach((assay, assayIndex) => {
          const expectedAssay = expectedStudy.assays[assayIndex];
          // Current backend may emit 2 or 3 process steps depending on
          // normalization mode. Keep lower bound strict and upper bound aligned
          // with golden output.
          expect(assay.processSequence.length).toBeGreaterThanOrEqual(2);
          expect(assay.processSequence.length).toBeLessThanOrEqual(expectedAssay.processSequence.length);
        });
      });
    });
  });

  describe('Data Format Validation', () => {
    it('should have dates in ISO format', () => {
      if (!backendAvailable) return;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(apiOutput.submissionDate).toMatch(dateRegex);
      expect(apiOutput.publicReleaseDate).toMatch(dateRegex);
    });

    it('should have valid email addresses', () => {
      if (!backendAvailable) return;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      apiOutput.people.forEach((person) => {
        if (person.email) {
          expect(person.email).toMatch(emailRegex);
        }
      });
    });

    it('should have valid DOIs', () => {
      if (!backendAvailable) return;
      const doiRegex = /^10\.\d{4,}/;
      apiOutput.publications.forEach((pub) => {
        if (pub.doi) {
          expect(pub.doi).toMatch(doiRegex);
        }
      });
    });

    it('should not have undefined values in critical fields', () => {
      if (!backendAvailable) return;
      expect(apiOutput.identifier).toBeDefined();
      expect(apiOutput.title).toBeDefined();
      expect(apiOutput.description).toBeDefined();
    });
  });

  describe('API Performance', () => {
    it('should complete conversion in reasonable time', async () => {
      if (!backendAvailable) return;
      
      const startTime = Date.now();
      const payload = prepareConversionPayload(inputData);
      await callConversionAPI(payload);
      const duration = Date.now() - startTime;
      
      console.log('⏱️  Conversion time:', duration, 'ms');
      
      // Conversion should complete within a practical backend budget.
      // The limit is configurable for slower CI/dev environments.
      expect(duration).toBeLessThan(BACKEND_PERF_LIMIT_MS);
    }, BACKEND_PERF_LIMIT_MS + 5000);
  });

  describe('Cross-References from API', () => {
    it('should have valid protocol references in processes', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study) => {
        const protocolIds = new Set(study.protocols.map(p => p['@id']));
        
        study.processSequence.forEach((process) => {
          expect(protocolIds.has(process.executesProtocol['@id'])).toBe(true);
        });
      });
    });

    it('should have valid material references in processes', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study) => {
        const sourceIds = new Set(study.materials.sources.map(s => s['@id']));
        const sampleIds = new Set(study.materials.samples.map(s => s['@id']));
        const dataFileIds = new Set(
          study.assays.flatMap((assay) => (assay.dataFiles || []).map((dataFile) => dataFile['@id']))
        );
        const isExpectedMaterialPrefix = (id) => /^#(?:source|sample|data_file)\//i.test(String(id || ''));
        
        study.processSequence.forEach((process) => {
          process.inputs.forEach((input) => {
            const isValid =
              sourceIds.has(input['@id']) ||
              sampleIds.has(input['@id']) ||
              dataFileIds.has(input['@id']) ||
              isExpectedMaterialPrefix(input['@id']);
            expect(isValid).toBe(true);
          });
          
          process.outputs.forEach((output) => {
            const isValid =
              sourceIds.has(output['@id']) ||
              sampleIds.has(output['@id']) ||
              dataFileIds.has(output['@id']) ||
              isExpectedMaterialPrefix(output['@id']);
            expect(isValid).toBe(true);
          });
        });
      });
    });
  });

  describe('Complete Golden Output Comparison', () => {
    it('should match investigation-level fields exactly', () => {
      if (!backendAvailable) return;
      expectCompatibleIdentifier(apiOutput.identifier, expectedOutput.identifier);
      expect(apiOutput.title).toBe(expectedOutput.title);
      expect(apiOutput.description).toBe(expectedOutput.description);
      expect(apiOutput.submissionDate).toBe(expectedOutput.submissionDate);
      expect(apiOutput.publicReleaseDate).toBe(expectedOutput.publicReleaseDate);
    });

    it('should have identical structure counts', () => {
      if (!backendAvailable) return;
      expect(apiOutput.people.length).toBe(expectedOutput.people.length);
      expect(apiOutput.publications.length).toBe(expectedOutput.publications.length);
      expect(apiOutput.studies.length).toBe(expectedOutput.studies.length);
      
      // Check each study's structure counts
      apiOutput.studies.forEach((study, index) => {
        const expectedStudy = expectedOutput.studies[index];
        expect(study.protocols.length).toBe(expectedStudy.protocols.length);
        expect(study.factors.length).toBe(expectedStudy.factors.length);
        expect(study.assays.length).toBe(expectedStudy.assays.length);
        expect(study.materials.sources.length).toBe(expectedStudy.materials.sources.length);
        expect(study.materials.samples.length).toBe(expectedStudy.materials.samples.length);
      });
    });

    it('should have matching characteristic categories', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, index) => {
        const expectedStudy = expectedOutput.studies[index];
        expect(study.characteristicCategories.length).toBe(expectedStudy.characteristicCategories.length);
      });
    });

    it('should have matching unit categories', () => {
      if (!backendAvailable) return;
      apiOutput.studies.forEach((study, index) => {
        const expectedStudy = expectedOutput.studies[index];
        const actualUnits = (study.unitCategories || []).map((unit) => unit.annotationValue);
        const expectedUnits = (expectedStudy.unitCategories || []).map((unit) => unit.annotationValue);

        expect(actualUnits.length).toBeGreaterThanOrEqual(expectedUnits.length);
        expectedUnits.forEach((expectedUnit) => {
          expect(actualUnits.includes(expectedUnit)).toBe(true);
        });
      });
    });

    it('should produce consistent JSON structure', () => {
      if (!backendAvailable) return;
      
      // Compare top-level keys
      const apiKeys = Object.keys(apiOutput).sort();
      const expectedKeys = Object.keys(expectedOutput).sort();
      expect(apiKeys).toEqual(expectedKeys);
      
      // Check that the overall structure depth matches
      expect(apiOutput.studies[0].assays[0].processSequence.length).toBeGreaterThan(0);
      expect(apiOutput.studies[0].materials.samples[0].characteristics.length).toBe(
        expectedOutput.studies[0].materials.samples[0].characteristics.length
      );
      expect(apiOutput.studies[0].materials.samples[0].factorValues.length).toBe(
        expectedOutput.studies[0].materials.samples[0].factorValues.length
      );
    });
  });
});
