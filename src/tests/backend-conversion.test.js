import { describe, it, expect, beforeAll } from 'vitest';
import inputDataRaw from '../data/isa-project-example.json';
import expectedOutput from './isa-phm-out.json';
import { expandStudiesIntoRuns } from '../utils/studyRuns';


/**
 * ISA-PHM Conversion Integration Test Suite
 * 
 * This test suite validates the complete conversion pipeline by:
 * 1. Loading the default project state from isa-project-example.json
 * 2. Extracting localStorage data and preparing the conversion payload
 * 3. Sending the payload to the backend API (localhost:8080)
 * 4. Validating the JSON response matches the golden output (isa-phm-out.json)
 * 
 * PREREQUISITES:
 * - Backend server must be running on http://localhost:8080
 * - Backend /convert endpoint must be available
 * 
 * Run backend first:
 *   cd ../ISA-PHM-Backend
 *   python -m uvicorn main:app --reload --port 8080
 * 
 * Then run this test:
 *   npm test conversion-integration
 */

const BACKEND_URL = 'http://localhost:8080';
const CONVERT_ENDPOINT = `${BACKEND_URL.replace(/\/$/, '')}/convert`;

// Helper function to prepare the conversion payload from localStorage data
function prepareConversionPayload(projectData) {
  const localStorage = projectData.localStorage || {};
  
  // Parse localStorage JSON strings
  const publications = JSON.parse(localStorage.globalAppData_default_publications || '[]');
  const contacts = JSON.parse(localStorage.globalAppData_default_contacts || '[]');
  const studies = JSON.parse(localStorage.globalAppData_default_studies || '[]');
  const testSetups = JSON.parse(localStorage.globalAppData_default_testSetups || '[]');
  const studyVariables = JSON.parse(localStorage.globalAppData_default_studyVariables || '[]');
  const measurementProtocols = JSON.parse(localStorage.globalAppData_default_measurementProtocols || '[]');
  const processingProtocols = JSON.parse(localStorage.globalAppData_default_processingProtocols || '[]');
  const studyToStudyVariableMapping = JSON.parse(localStorage.globalAppData_default_studyToStudyVariableMapping || '[]');
  const sensorToMeasurementProtocolMapping = JSON.parse(localStorage.globalAppData_default_sensorToMeasurementProtocolMapping || '[]');
  const studyToSensorMeasurementMapping = JSON.parse(localStorage.globalAppData_default_studyToSensorMeasurementMapping || '[]');
  const sensorToProcessingProtocolMapping = JSON.parse(localStorage.globalAppData_default_sensorToProcessingProtocolMapping || '[]');
  const studyToSensorProcessingMapping = JSON.parse(localStorage.globalAppData_default_studyToSensorProcessingMapping || '[]');
  const studyToAssayMapping = JSON.parse(localStorage.globalAppData_default_studyToAssayMapping || '[]');
  const investigations = JSON.parse(localStorage.globalAppData_default_investigations || '{}');
  
  // Select the Techport test setup (id: 3e2257b1-9be2-40a5-b88c-9addcbca6ba0)
  const selectedTestSetupId = '3e2257b1-9be2-40a5-b88c-9addcbca6ba0';
  
  const studyRuns = expandStudiesIntoRuns(studies);
  const runsByStudyId = studyRuns.reduce((acc, run) => {
    if (!run?.studyId) return acc;
    if (!acc[run.studyId]) {
      acc[run.studyId] = [];
    }
    acc[run.studyId].push(run);
    return acc;
  }, {});

  const getRunsForStudy = (study) => {
    const runs = runsByStudyId[study.id];
    if (runs && runs.length > 0) {
      return runs;
    }
    return expandStudiesIntoRuns([study]);
  };

  const resolveRunMapping = (mappings = [], sensorId, run) => {
    if (!Array.isArray(mappings)) return null;
    return mappings.find((mapping) => {
      if (!mapping || mapping.sensorId !== sensorId) return false;
      if (mapping.studyRunId) {
        return mapping.studyRunId === run.runId;
      }
      return mapping.studyId === run.studyId;
    }) || null;
  };

  // Helper: normalize protocol mappings for a given sensor id
  const mapProtocolsForSensor = (mappings = [], sensorId) => {
    if (!mappings || mappings.length === 0) return [];
    return mappings
      .filter((m) => String(m.sourceId) === String(sensorId) || String(m.sensorId) === String(sensorId))
      .map((m) => ({
        sourceId: m.sourceId ?? m.sensorId ?? null,
        targetId: m.targetId ?? m.target ?? m.mappingTargetId ?? null,
        value: m.value ?? [],
      }));
  };

  // Build the payload matching useSubmitData.jsx format
  const payload = {
    identifier: investigations?.investigationIdentifier,
    title: investigations?.investigationTitle,
    description: investigations?.investigationDescription,
    license: investigations?.license,
    submission_date: investigations?.submissionDate,
    public_release_date: investigations?.publicReleaseDate,
    publications: publications,
    authors: contacts,
    study_variables: studyVariables,
    measurement_protocols: measurementProtocols,
    processing_protocols: processingProtocols,
    studies: studies.map((study) => {
      const runsForStudy = getRunsForStudy(study);
      return {
        ...study,
        publications,
        contacts,
        used_setup: testSetups.find((setup) => setup.id === selectedTestSetupId),
        study_to_study_variable_mapping: runsForStudy.flatMap((run) =>
          studyToStudyVariableMapping
            .filter((mapping) => {
              if (mapping.studyRunId) {
                return mapping.studyRunId === run.runId;
              }
              return mapping.studyId === run.studyId;
            })
            .map((mapping) => {
              const variable = studyVariables.find((v) => v.id === mapping.studyVariableId);
              return {
                studyId: run.studyId,
                studyRunId: mapping.studyRunId || run.runId,
                runNumber: run.runNumber,
                studyVariableId: mapping.studyVariableId,
                value: mapping.value,
                variableName: variable?.name || 'Unknown Variable',
              };
            })
        ),
        assay_details: runsForStudy.flatMap((run) => {
          const sensors = (testSetups.find((setup) => setup.id === selectedTestSetupId)?.sensors || []);
          return sensors.map((sensor) => {
            const used_sensor = Object.fromEntries(
              Object.entries(sensor).filter(([key]) => !key.startsWith('processingProtocol'))
            );

            const rawMapping = resolveRunMapping(studyToSensorMeasurementMapping, sensor.id, run);
            const processingMapping = resolveRunMapping(studyToSensorProcessingMapping, sensor.id, run);
            const assayMapping = resolveRunMapping(studyToAssayMapping, sensor.id, run);

            return {
              used_sensor,
              run_number: run.runNumber,
              study_run_id: run.runId,
              study_id: run.studyId,
              measurement_protocols: mapProtocolsForSensor(sensorToMeasurementProtocolMapping, sensor.id),
              processing_protocols: mapProtocolsForSensor(sensorToProcessingProtocolMapping, sensor.id),
              raw_file_name: rawMapping?.value || '',
              processed_file_name: processingMapping?.value || '',
              assay_file_name: assayMapping?.value || '',
            };
          });
        }),
      };
    }),
  };

  return payload;
}

// Helper function to call the backend API
async function callConversionAPI(payload) {
  // Use the Node helper (form-data + node-fetch) to send a multipart file like curl/browser
  try {
    const { postJsonFile } = await import('./utils/nodeFormFetch.js');
    console.log('🚀 Calling conversion API at', CONVERT_ENDPOINT);
    const response = await postJsonFile(CONVERT_ENDPOINT, payload, 'input.json');

    if (!response.ok) {
      const text = await response.text().catch(() => null);
      throw new Error(`API Error: ${response.status} - ${text || 'Conversion failed'}`);
    }

    return await response.json();
  } catch (err) {
    // Re-throw to be handled by caller
    throw err;
  }
}

describe('ISA-PHM Conversion Integration Tests', () => {
  let inputData;
  let apiOutput;
  let backendAvailable = false;
  let backendError = null;

  beforeAll(async () => {
    // Load input data
    inputData = JSON.parse(JSON.stringify(inputDataRaw));

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
    it('should have backend running on localhost:8080', () => {
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
      expect(apiOutput.identifier).toBe(expectedOutput.identifier);
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
      const licenseComment = apiOutput.comments.find(c => c.name === 'License');
      expect(licenseComment).toBeDefined();
      expect(licenseComment.value).toBe(expectedOutput.comments.find(c => c.name === 'License').value);
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
        expect(study.filename).toBe(expectedOutput.studies[index].filename);
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
        expect(prepProtocol.name).toBe('Experiment Preparation');
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
      apiOutput.studies.forEach((study) => {
        expect(Array.isArray(study.materials.samples)).toBe(true);
        expect(study.materials.samples.length).toBeGreaterThan(0);
        
        const sample = study.materials.samples[0];
        expect(Array.isArray(sample.characteristics)).toBe(true);
        expect(sample.characteristics.length).toBeGreaterThan(0);
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
          expect(assay.filename).toBe(expectedStudy.assays[assayIndex].filename);
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
          expect(assay.processSequence.length).toBe(expectedAssay.processSequence.length);
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
      
      // Conversion should complete in less than 10 seconds
      expect(duration).toBeLessThan(10000);
    }, 15000); // 15 second timeout
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
        
        study.processSequence.forEach((process) => {
          process.inputs.forEach((input) => {
            const isValid = sourceIds.has(input['@id']) || sampleIds.has(input['@id']);
            expect(isValid).toBe(true);
          });
          
          process.outputs.forEach((output) => {
            const isValid = sourceIds.has(output['@id']) || sampleIds.has(output['@id']);
            expect(isValid).toBe(true);
          });
        });
      });
    });
  });

  describe('Complete Golden Output Comparison', () => {
    it('should match investigation-level fields exactly', () => {
      if (!backendAvailable) return;
      expect(apiOutput.identifier).toBe(expectedOutput.identifier);
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
        expect(study.unitCategories.length).toBe(expectedStudy.unitCategories.length);
        
        study.unitCategories.forEach((unit, unitIndex) => {
          expect(unit.annotationValue).toBe(expectedStudy.unitCategories[unitIndex].annotationValue);
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
      expect(apiOutput.studies[0].materials.samples[0].characteristics.length).toBeGreaterThan(0);
      expect(apiOutput.studies[0].materials.samples[0].factorValues.length).toBeGreaterThan(0);
    });
  });
});
