import { expandStudiesIntoRuns, normalizeRunCount } from './studyRuns';
import {
  isProcessedOutputEnabled,
  isRawOutputEnabled,
  resolveStudyOutputMode,
} from './studyOutputMode';

const asArray = (value) => (Array.isArray(value) ? value : []);

const asObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return {};
};

const stripUiOnlyFieldsFromVariable = (variable) => {
  if (!variable || typeof variable !== 'object' || Array.isArray(variable)) return variable;
  const { valueMode: _valueMode, ...rest } = variable;
  return rest;
};

const buildSelectionLookup = ({
  studyToMeasurementProtocolSelection = [],
  studyToProcessingProtocolSelection = [],
}) => {
  const measurement = {};
  const processing = {};

  asArray(studyToMeasurementProtocolSelection).forEach((entry) => {
    if (entry?.studyId) {
      measurement[entry.studyId] = entry.protocolId || '';
    }
  });

  asArray(studyToProcessingProtocolSelection).forEach((entry) => {
    if (entry?.studyId) {
      processing[entry.studyId] = entry.protocolId || '';
    }
  });

  return { measurement, processing };
};

const resolveRunMapping = (mappings = [], sensorId, run) => {
  return asArray(mappings).find((mapping) => {
    if (!mapping || mapping.sensorId !== sensorId) return false;
    if (mapping.studyRunId) {
      return mapping.studyRunId === run.runId;
    }
    return mapping.studyId === run.studyId;
  }) || null;
};

const generateAssayFileName = (sensorIndex = 0) => {
  const sensorCode = String(sensorIndex + 1).padStart(2, '0');
  return `se${sensorCode}`;
};

const normalizeProtocolMappingValue = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return [value.specification ?? '', value.unit ?? ''];
  }
  return [];
};

const mapProtocolsForSensor = (mappings = [], sensorId, selectedProtocolId = '') => {
  if (!mappings || mappings.length === 0) return [];

  return asArray(mappings)
    .filter((mapping) => {
      const sensorMatches = String(mapping?.sourceId) === String(sensorId) || String(mapping?.sensorId) === String(sensorId);
      if (!sensorMatches) return false;

      if (!selectedProtocolId) return true;
      return String(mapping?.protocolId || '') === String(selectedProtocolId);
    })
    .map((mapping) => ({
      sourceId: mapping.sourceId ?? mapping.sensorId ?? null,
      targetId: mapping.targetId ?? mapping.target ?? mapping.mappingTargetId ?? null,
      protocolId: mapping.protocolId ?? '',
      value: normalizeProtocolMappingValue(mapping.value),
    }));
};

const buildAssayDetails = ({
  studyRuns = [],
  sensors = [],
  outputMode = 'raw_only',
  selectedMeasurementProtocolId = '',
  selectedProcessingProtocolId = '',
  measurementMappings = [],
  processingMappings = [],
  studyToSensorMeasurementMapping = [],
  studyToSensorProcessingMapping = [],
}) => {
  const safeSensors = asArray(sensors);
  const rawEnabled = isRawOutputEnabled(outputMode);
  const processedEnabled = isProcessedOutputEnabled(outputMode);

  return safeSensors.map((sensor, sensorIndex) => {
    const usedSensor = Object.fromEntries(
      Object.entries(asObject(sensor)).filter(([key]) => !key.startsWith('processingProtocol'))
    );

    const runs = asArray(studyRuns).map((run) => {
      const rawMapping = resolveRunMapping(studyToSensorMeasurementMapping, sensor.id, run);
      const processingMapping = resolveRunMapping(studyToSensorProcessingMapping, sensor.id, run);

      return {
        run_number: run.runNumber,
        study_run_id: run.runId,
        study_id: run.studyId,
        raw_file_name: rawEnabled ? (rawMapping?.value || '') : '',
        processed_file_name: processedEnabled ? (processingMapping?.value || '') : '',
      };
    });

    return {
      assay_file_name: generateAssayFileName(sensorIndex),
      used_sensor: usedSensor,
      measurement_protocol_id: selectedMeasurementProtocolId || '',
      processing_protocol_id: processedEnabled ? (selectedProcessingProtocolId || '') : '',
      measurement_protocols: mapProtocolsForSensor(measurementMappings, sensor.id, selectedMeasurementProtocolId),
      processing_protocols: processedEnabled
        ? mapProtocolsForSensor(processingMappings, sensor.id, selectedProcessingProtocolId)
        : [],
      runs,
    };
  });
};

const buildRunsByStudyId = (studies = []) => {
  const allStudyRuns = expandStudiesIntoRuns(studies);

  return allStudyRuns.reduce((accumulator, run) => {
    if (!run?.studyId) return accumulator;
    if (!accumulator[run.studyId]) {
      accumulator[run.studyId] = [];
    }
    accumulator[run.studyId].push(run);
    return accumulator;
  }, {});
};

export const buildConversionPayload = ({
  investigation = {},
  publications = [],
  contacts = [],
  studyVariables = [],
  studies = [],
  testSetups = [],
  selectedTestSetupId = null,
  experimentType = '',
  studyToStudyVariableMapping = [],
  studyToSensorMeasurementMapping = [],
  studyToSensorProcessingMapping = [],
  studyToMeasurementProtocolSelection = [],
  studyToProcessingProtocolSelection = [],
}) => {
  const safeStudies = asArray(studies);
  const safeVariables = asArray(studyVariables);
  const payloadStudyVariables = safeVariables.map(stripUiOnlyFieldsFromVariable);
  const safeSetups = asArray(testSetups);
  const safePublications = asArray(publications);
  const safeContacts = asArray(contacts);

  const selectedSetup = safeSetups.find((setup) => setup?.id === selectedTestSetupId) || null;
  const selectedMeasurementProtocols = asArray(selectedSetup?.measurementProtocols);
  const selectedProcessingProtocols = asArray(selectedSetup?.processingProtocols);
  const sensors = asArray(selectedSetup?.sensors);
  const measurementMappings = asArray(selectedSetup?.sensorToMeasurementProtocolMapping);
  const processingMappings = asArray(selectedSetup?.sensorToProcessingProtocolMapping);

  const selectionLookup = buildSelectionLookup({
    studyToMeasurementProtocolSelection,
    studyToProcessingProtocolSelection,
  });

  const runsByStudyId = buildRunsByStudyId(safeStudies);
  const getRunsForStudy = (study) => {
    const runs = runsByStudyId[study.id];
    if (runs && runs.length > 0) {
      return runs;
    }
    return expandStudiesIntoRuns([study]);
  };

  const payload = {
    identifier: investigation?.investigationIdentifier,
    title: investigation?.investigationTitle,
    description: investigation?.investigationDescription,
    license: investigation?.license,
    submission_date: investigation?.submissionDate,
    public_release_date: investigation?.publicReleaseDate,
    experiment_type: experimentType,
    publications: safePublications,
    contacts: safeContacts,
    study_variables: payloadStudyVariables,
    measurement_protocols: selectedMeasurementProtocols,
    processing_protocols: selectedProcessingProtocols,
    studies: safeStudies.map((study) => {
      const studyRuns = getRunsForStudy(study);
      const selectedMeasurementProtocolId = study?.measurementProtocolId || selectionLookup.measurement[study.id] || '';
      const selectedProcessingProtocolId = study?.processingProtocolId || selectionLookup.processing[study.id] || '';
      const outputMode = resolveStudyOutputMode(study, {
        studyRuns,
        measurementMappings: studyToSensorMeasurementMapping,
        processingMappings: studyToSensorProcessingMapping,
        selectedProcessingProtocolId,
      });
      const normalizedRunCount = normalizeRunCount(study?.runCount ?? study?.total_runs);
      const totalRuns = Array.isArray(studyRuns) && studyRuns.length > 0 ? studyRuns.length : normalizedRunCount;

      return {
        ...study,
        runCount: normalizedRunCount,
        total_runs: totalRuns,
        publications: safePublications,
        contacts: safeContacts,
        selectedMeasurementProtocolId,
        selectedProcessingProtocolId,
        used_setup: selectedSetup,
        study_to_study_variable_mapping: asArray(studyRuns).flatMap((run) => (
          asArray(studyToStudyVariableMapping)
            .filter((mapping) => {
              if (mapping.studyRunId) {
                return mapping.studyRunId === run.runId;
              }
              return mapping.studyId === run.studyId;
            })
            .map((mapping) => {
              const variable = safeVariables.find((candidate) => candidate.id === mapping.studyVariableId);
              return {
                studyId: run.studyId,
                studyRunId: mapping.studyRunId || run.runId,
                runNumber: run.runNumber,
                studyVariableId: mapping.studyVariableId,
                value: mapping.value,
                variableName: variable?.name || 'Unknown Variable',
              };
            })
        )),
        assay_details: buildAssayDetails({
          studyRuns,
          sensors,
          outputMode,
          selectedMeasurementProtocolId,
          selectedProcessingProtocolId,
          measurementMappings,
          processingMappings,
          studyToSensorMeasurementMapping,
          studyToSensorProcessingMapping,
        }),
      };
    }),
  };

  return payload;
};

export default buildConversionPayload;
