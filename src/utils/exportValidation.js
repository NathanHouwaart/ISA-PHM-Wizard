import { expandStudiesIntoRuns } from './studyRuns';
import {
  hasFilledValue,
  isProcessedOutputEnabled,
  isRawOutputEnabled,
  normalizeStudyOutputMode,
  OUTPUT_MODE_RAW_ONLY,
  OUTPUT_MODE_PROCESSED_ONLY,
  OUTPUT_MODE_RAW_AND_PROCESSED,
} from './studyOutputMode';
import { isValidEmail } from './validation';
import { getExperimentTypeConfig } from '../constants/experimentTypes';
import {
  STUDY_VARIABLE_VALUE_MODE_SCALAR,
  STUDY_VARIABLE_VALUE_MODE_TIMESERIES,
  normalizeStudyVariableValueMode
} from '../constants/variableTypes';

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizePath = (value) => {
  if (typeof value !== 'string') return '';
  let next = value.trim();
  if (!next) return '';

  next = next.replace(/\\/g, '/');
  next = next.replace(/^\.\/+/, '');
  next = next.replace(/^\/+/, '');
  next = next.replace(/\/{2,}/g, '/');
  next = next.replace(/\/+$/, '');
  return next;
};

const isAbsolutePath = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^[a-zA-Z]:[\\/]/.test(trimmed)) return true;
  if (/^[\\/]/.test(trimmed)) return true;
  return false;
};

const hasCsvExtension = (value) => {
  if (typeof value !== 'string') return false;
  return /\.csv$/i.test(value.trim());
};

const hasLikelyFileExtension = (value) => {
  if (typeof value !== 'string') return false;
  return /\.[a-zA-Z0-9]{1,8}$/.test(value.trim());
};

const isLikelyRelativeFilePath = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^\.{1,2}[\\/]/.test(trimmed)) return true;
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return hasLikelyFileExtension(trimmed);
  }
  return false;
};

const buildScopedMappingLookup = (mappings = [], sourceKey, runByRunId = new Map()) => {
  const byRun = new Map();
  const byStudy = new Map();
  const filledStudyIds = new Set();

  asArray(mappings).forEach((mapping) => {
    const sourceId = String(mapping?.[sourceKey] || '');
    if (!sourceId) return;

    const runId = mapping?.studyRunId ? String(mapping.studyRunId) : '';
    const derivedStudyId = runId ? String(runByRunId.get(runId)?.studyId || '') : '';
    const studyId = String(mapping?.studyId || derivedStudyId || '');

    if (runId) {
      byRun.set(`${runId}::${sourceId}`, mapping);
    } else if (studyId) {
      byStudy.set(`${studyId}::${sourceId}`, mapping);
    }

    if (studyId && hasFilledValue(mapping?.value)) {
      filledStudyIds.add(studyId);
    }
  });

  return { byRun, byStudy, filledStudyIds };
};

const resolveScopedMapping = (lookup, sourceId, run) => {
  const safeSourceId = String(sourceId || '');
  if (!safeSourceId || !lookup) return null;

  const runId = String(run?.runId || '');
  if (runId) {
    const runMapping = lookup.byRun.get(`${runId}::${safeSourceId}`);
    if (runMapping) return runMapping;
  }

  const studyId = String(run?.studyId || '');
  if (studyId) {
    const studyMapping = lookup.byStudy.get(`${studyId}::${safeSourceId}`);
    if (studyMapping) return studyMapping;
  }

  return null;
};

const collectDirectoryPaths = (nodes = [], target = new Set()) => {
  asArray(nodes).forEach((node) => {
    if (!node) return;
    if (node.isDirectory) {
      const normalized = normalizePath(node.relPath || '');
      if (normalized) {
        target.add(normalized);
      }
      collectDirectoryPaths(node.children || [], target);
    }
  });
  return target;
};

const directoryPathCache = new WeakMap();

const getCachedDirectoryPaths = (tree) => {
  if (!tree || typeof tree !== 'object') return new Set();
  const cached = directoryPathCache.get(tree);
  if (cached) return cached;
  const computed = collectDirectoryPaths(tree, new Set());
  directoryPathCache.set(tree, computed);
  return computed;
};

const formatRunSensorLabel = (run, sensor) => {
  const studyLabel = run?.studyName || run?.name || run?.studyId || 'Unknown study';
  const runLabel = run?.runNumber ? `Run ${run.runNumber}` : 'Run ?';
  const sensorLabel = sensor?.alias || sensor?.name || sensor?.id || 'Unknown sensor';
  return `${studyLabel} / ${runLabel} / ${sensorLabel}`;
};

const formatRunVariableLabel = (run, variable) => {
  const studyLabel = run?.studyName || run?.name || run?.studyId || 'Unknown study';
  const runLabel = run?.runNumber ? `Run ${run.runNumber}` : 'Run ?';
  const variableLabel = variable?.name || variable?.id || 'Unknown variable';
  return `${studyLabel} / ${runLabel} / ${variableLabel}`;
};

const formatContactLabel = (contact, contactIndex) => {
  const fullName = `${String(contact?.firstName || '').trim()} ${String(contact?.lastName || '').trim()}`.trim();
  if (fullName) return fullName;
  const email = String(contact?.email || '').trim();
  if (email) return email;
  return `Contact ${contactIndex + 1}`;
};

const resolveMappingContext = (mapping, lookup) => {
  const { runByRunId, runByStudyId, sensorById } = lookup;
  const sensor = sensorById.get(String(mapping?.sensorId || ''));
  const run = mapping?.studyRunId
    ? runByRunId.get(String(mapping.studyRunId))
    : runByStudyId.get(String(mapping?.studyId || ''));

  return formatRunSensorLabel(run, sensor);
};

const pushIssue = (bucket, issue) => {
  bucket.push({
    ...issue,
    items: asArray(issue.items).slice(0, 8),
  });
};

const formatStudyLabel = (study, studyIndex) => {
  return study?.name || `Study ${studyIndex + 1}`;
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

export function buildExportValidationReport({
  investigation = {},
  contacts = [],
  studyVariables = [],
  studyToStudyVariableMapping = [],
  studies = [],
  testSetups = [],
  selectedTestSetupId = null,
  studyToMeasurementProtocolSelection = [],
  studyToProcessingProtocolSelection = [],
  studyToSensorMeasurementMapping = [],
  studyToSensorProcessingMapping = [],
  selectedDataset = null,
  experimentType = '',
} = {}, {
  includePathChecks = true,
} = {}) {
  const safeStudies = asArray(studies);
  const safeContacts = asArray(contacts);
  const safeStudyVariables = asArray(studyVariables);
  const safeStudyVariableMappings = asArray(studyToStudyVariableMapping);
  const experimentTypeConfig = getExperimentTypeConfig(experimentType);
  const runCountRequired = Boolean(experimentTypeConfig?.supportsMultipleRuns);
  const selectedSetup = asArray(testSetups).find((setup) => setup?.id === selectedTestSetupId) || null;
  const sensors = asArray(selectedSetup?.sensors);
  const studyRuns = expandStudiesIntoRuns(safeStudies);
  const selectionLookup = buildSelectionLookup({
    studyToMeasurementProtocolSelection,
    studyToProcessingProtocolSelection,
  });

  const warningIssues = [];
  const errorIssues = [];

  const investigationTitle = String(investigation?.investigationTitle || '').trim();
  const investigationDescription = String(investigation?.investigationDescription || '').trim();

  if (!investigationTitle) {
    pushIssue(errorIssues, {
      id: 'missing-project-title',
      level: 'error',
      title: 'Missing project title',
      description: 'Project title is required before conversion.',
      count: 1,
      items: ['Slide 2 - Project Information: fill in Title'],
    });
  }

  if (!investigationDescription) {
    pushIssue(warningIssues, {
      id: 'missing-project-description',
      level: 'warning',
      title: 'Missing project description',
      description: 'Project description is empty. Add context to improve metadata quality.',
      count: 1,
      items: ['Slide 2 - Project Information: add Description'],
    });
  }

  if (safeContacts.length === 0) {
    pushIssue(warningIssues, {
      id: 'missing-contacts',
      level: 'warning',
      title: 'No contacts defined',
      description: 'At least one contact is recommended for traceability.',
      count: 1,
      items: ['Slide 3 - Contacts: add at least one contact'],
    });
  }

  const contactsMissingName = safeContacts
    .map((contact, index) => ({ contact, index }))
    .filter(({ contact }) => (
      !String(contact?.firstName || '').trim()
      || !String(contact?.lastName || '').trim()
    ));

  if (contactsMissingName.length > 0) {
    pushIssue(warningIssues, {
      id: 'incomplete-contacts',
      level: 'warning',
      title: 'Contacts with missing required fields',
      description: `${contactsMissingName.length} contacts are missing first name or last name.`,
      count: contactsMissingName.length,
      items: contactsMissingName.map(({ contact, index }) => formatContactLabel(contact, index)),
    });
  }

  const contactsWithInvalidEmail = safeContacts
    .map((contact, index) => ({ contact, index }))
    .filter(({ contact }) => {
      const email = String(contact?.email || '').trim();
      return email && !isValidEmail(email);
    });

  if (contactsWithInvalidEmail.length > 0) {
    pushIssue(warningIssues, {
      id: 'invalid-contact-emails',
      level: 'warning',
      title: 'Contacts with invalid email format',
      description: `${contactsWithInvalidEmail.length} contacts contain an invalid email address.`,
      count: contactsWithInvalidEmail.length,
      items: contactsWithInvalidEmail.map(({ contact, index }) => formatContactLabel(contact, index)),
    });
  }

  if (safeStudies.length === 0) {
    pushIssue(errorIssues, {
      id: 'missing-studies',
      level: 'error',
      title: 'No experiments defined',
      description: 'At least one experiment is required before conversion.',
      count: 1,
      items: ['Slide 5 - Experiment Descriptions: add at least one experiment'],
    });
  }

  const studiesMissingName = safeStudies
    .map((study, index) => ({ study, index }))
    .filter(({ study }) => !String(study?.name || '').trim());

  if (studiesMissingName.length > 0) {
    pushIssue(errorIssues, {
      id: 'missing-study-name',
      level: 'error',
      title: 'Experiments missing name',
      description: `${studiesMissingName.length} experiments are missing a name.`,
      count: studiesMissingName.length,
      items: studiesMissingName.map(({ study, index }) => formatStudyLabel(study, index)),
    });
  }

  if (runCountRequired) {
    const studiesWithInvalidRunCount = safeStudies
      .map((study, index) => ({ study, index }))
      .filter(({ study }) => {
        const runCount = Number(study?.runCount);
        return !Number.isInteger(runCount) || runCount <= 0;
      });

    if (studiesWithInvalidRunCount.length > 0) {
      pushIssue(errorIssues, {
        id: 'invalid-study-run-count',
        level: 'error',
        title: 'Invalid experiment run count',
        description: `${studiesWithInvalidRunCount.length} experiments have an invalid run count. Use a positive integer.`,
        count: studiesWithInvalidRunCount.length,
        items: studiesWithInvalidRunCount.map(({ study, index }) => (
          `${formatStudyLabel(study, index)} (runCount: ${String(study?.runCount ?? 'missing')})`
        )),
      });
    }
  }

  if (!selectedTestSetupId) {
    pushIssue(errorIssues, {
      id: 'missing-test-setup',
      level: 'error',
      title: 'No test setup selected',
      description: 'Select a test setup before conversion.',
      count: 1,
      items: ['Project settings: select a test setup'],
    });
  } else if (!selectedSetup) {
    pushIssue(errorIssues, {
      id: 'invalid-test-setup',
      level: 'error',
      title: 'Selected test setup is unavailable',
      description: 'The selected test setup could not be found in the workspace.',
      count: 1,
      items: ['Project settings: re-select a valid test setup'],
    });
  } else if (sensors.length === 0) {
    pushIssue(errorIssues, {
      id: 'test-setup-without-sensors',
      level: 'error',
      title: 'Selected test setup has no sensors',
      description: 'Add at least one sensor to the selected test setup before conversion.',
      count: 1,
      items: [selectedSetup?.name || 'Selected test setup'],
    });
  }

  const operatingConditionVariables = safeStudyVariables.filter((variable) => (
    String(variable?.type || '').trim() === 'Operating condition'
  ));
  const faultSpecificationVariables = safeStudyVariables.filter((variable) => (
    String(variable?.type || '').trim() !== 'Operating condition'
  ));

  if (faultSpecificationVariables.length === 0) {
    pushIssue(warningIssues, {
      id: 'missing-fault-specifications',
      level: 'warning',
      title: 'No fault specifications defined',
      description: 'No fault specification variables are configured.',
      count: 1,
      items: ['Slide 6 - Fault Specifications: add at least one variable'],
    });
  }

  if (operatingConditionVariables.length === 0) {
    pushIssue(warningIssues, {
      id: 'missing-operating-conditions',
      level: 'warning',
      title: 'No operating conditions defined',
      description: 'No operating condition variables are configured.',
      count: 1,
      items: ['Slide 7 - Operating Conditions: add at least one variable'],
    });
  }

  const runByRunId = new Map();
  const runByStudyId = new Map();
  const runsByStudyId = new Map();
  studyRuns.forEach((run) => {
    runByRunId.set(String(run.runId), run);
    if (!runByStudyId.has(String(run.studyId))) {
      runByStudyId.set(String(run.studyId), run);
    }
    if (!runsByStudyId.has(String(run.studyId))) {
      runsByStudyId.set(String(run.studyId), []);
    }
    runsByStudyId.get(String(run.studyId)).push(run);
  });
  const sensorById = new Map(sensors.map((sensor) => [String(sensor?.id || ''), sensor]));
  const lookup = { runByRunId, runByStudyId, sensorById };

  const measurementMappings = asArray(studyToSensorMeasurementMapping);
  const processingMappings = asArray(studyToSensorProcessingMapping);
  const studyVariableMappingsLookup = buildScopedMappingLookup(
    safeStudyVariableMappings,
    'studyVariableId',
    runByRunId
  );
  const measurementMappingsLookup = buildScopedMappingLookup(
    measurementMappings,
    'sensorId',
    runByRunId
  );
  const processingMappingsLookup = buildScopedMappingLookup(
    processingMappings,
    'sensorId',
    runByRunId
  );

  const modeByStudyId = new Map();
  const missingMeasurementProtocols = [];
  const missingProcessingProtocols = [];

  safeStudies.forEach((study, studyIndex) => {
    if (!study?.id) return;

    const studyId = String(study.id);
    const selectedMeasurementProtocolId = study?.measurementProtocolId || selectionLookup.measurement[study.id] || '';
    const selectedProcessingProtocolId = study?.processingProtocolId || selectionLookup.processing[study.id] || '';
    const explicitOutputMode = normalizeStudyOutputMode(study?.outputMode, '');
    let outputMode = explicitOutputMode;
    if (!outputMode) {
      const hasRaw = measurementMappingsLookup.filledStudyIds.has(studyId);
      const hasProcessed = processingMappingsLookup.filledStudyIds.has(studyId);
      const hasProcessingProtocol = String(selectedProcessingProtocolId || '').trim() !== '';

      if (hasProcessed && !hasRaw) {
        outputMode = OUTPUT_MODE_PROCESSED_ONLY;
      } else if (hasProcessed || hasProcessingProtocol) {
        outputMode = hasRaw ? OUTPUT_MODE_RAW_AND_PROCESSED : OUTPUT_MODE_PROCESSED_ONLY;
      } else {
        outputMode = OUTPUT_MODE_RAW_ONLY;
      }
    }

    const rawEnabled = isRawOutputEnabled(outputMode);
    const processedEnabled = isProcessedOutputEnabled(outputMode);
    modeByStudyId.set(studyId, {
      outputMode,
      rawEnabled,
      processedEnabled,
      selectedMeasurementProtocolId,
      selectedProcessingProtocolId,
    });

    if (!String(selectedMeasurementProtocolId || '').trim()) {
      missingMeasurementProtocols.push(formatStudyLabel(study, studyIndex));
    }
    if (processedEnabled && !String(selectedProcessingProtocolId || '').trim()) {
      missingProcessingProtocols.push(formatStudyLabel(study, studyIndex));
    }
  });

  if (missingMeasurementProtocols.length > 0) {
    pushIssue(errorIssues, {
      id: 'missing-measurement-protocol',
      level: 'error',
      title: 'Missing measurement protocol selection',
      description: `${missingMeasurementProtocols.length} studies are missing a measurement protocol.`,
      count: missingMeasurementProtocols.length,
      items: missingMeasurementProtocols,
    });
  }

  if (missingProcessingProtocols.length > 0) {
    pushIssue(errorIssues, {
      id: 'missing-processing-protocol',
      level: 'error',
      title: 'Missing processing protocol selection',
      description: `${missingProcessingProtocols.length} studies require a processing protocol based on output mode.`,
      count: missingProcessingProtocols.length,
      items: missingProcessingProtocols,
    });
  }

  const missingMeasurement = [];
  const missingProcessing = [];
  let requiredRawAssignments = 0;
  let requiredProcessedAssignments = 0;

  if (studyRuns.length > 0 && sensors.length > 0) {
    studyRuns.forEach((run) => {
      const modeInfo = modeByStudyId.get(String(run?.studyId || ''));
      const rawRequired = Boolean(modeInfo?.rawEnabled);
      const processedRequired = Boolean(modeInfo?.processedEnabled);

      sensors.forEach((sensor) => {
        const measurement = resolveScopedMapping(measurementMappingsLookup, sensor?.id, run);
        const processing = resolveScopedMapping(processingMappingsLookup, sensor?.id, run);

        if (rawRequired) {
          requiredRawAssignments += 1;
        }
        if (processedRequired) {
          requiredProcessedAssignments += 1;
        }

        if (rawRequired && !hasFilledValue(measurement?.value)) {
          missingMeasurement.push(formatRunSensorLabel(run, sensor));
        }
        if (processedRequired && !hasFilledValue(processing?.value)) {
          missingProcessing.push(formatRunSensorLabel(run, sensor));
        }
      });
    });
  }

  if (missingMeasurement.length > 0) {
    pushIssue(errorIssues, {
      id: 'missing-measurement-mappings',
      level: 'error',
      title: 'Missing required raw file mappings',
      description: `${missingMeasurement.length} raw measurement file assignments are required by output mode but empty.`,
      count: missingMeasurement.length,
      items: missingMeasurement,
    });
  }

  if (missingProcessing.length > 0) {
    pushIssue(errorIssues, {
      id: 'missing-processing-mappings',
      level: 'error',
      title: 'Missing required processed file mappings',
      description: `${missingProcessing.length} processed file assignments are required by output mode but empty.`,
      count: missingProcessing.length,
      items: missingProcessing,
    });
  }

  const missingStudyVariableMappings = [];
  const invalidScalarStudyVariableFileLikeValues = [];
  const invalidTimeseriesStudyVariableAbsolutePaths = [];
  const invalidTimeseriesStudyVariableNonCsvValues = [];
  let requiredStudyVariableMappings = 0;

  if (studyRuns.length > 0 && safeStudyVariables.length > 0) {
    studyRuns.forEach((run) => {
      safeStudyVariables.forEach((variable) => {
        requiredStudyVariableMappings += 1;
        const mapping = resolveScopedMapping(studyVariableMappingsLookup, variable?.id, run);
        if (!hasFilledValue(mapping?.value)) {
          missingStudyVariableMappings.push(formatRunVariableLabel(run, variable));
          return;
        }

        const valueMode = normalizeStudyVariableValueMode(
          variable?.valueMode,
          STUDY_VARIABLE_VALUE_MODE_SCALAR
        );
        const rawValue = String(mapping?.value ?? '').trim();

        if (valueMode === STUDY_VARIABLE_VALUE_MODE_SCALAR) {
          if (isAbsolutePath(rawValue) || hasCsvExtension(rawValue) || isLikelyRelativeFilePath(rawValue)) {
            invalidScalarStudyVariableFileLikeValues.push(
              `${rawValue} - ${formatRunVariableLabel(run, variable)}`
            );
          }
          return;
        }

        if (valueMode !== STUDY_VARIABLE_VALUE_MODE_TIMESERIES) {
          return;
        }

        const normalized = normalizePath(rawValue);
        if (isAbsolutePath(rawValue)) {
          invalidTimeseriesStudyVariableAbsolutePaths.push(
            `${rawValue} - ${formatRunVariableLabel(run, variable)}`
          );
          return;
        }
        if (!hasCsvExtension(normalized)) {
          invalidTimeseriesStudyVariableNonCsvValues.push(
            `${rawValue} - ${formatRunVariableLabel(run, variable)}`
          );
        }
      });
    });
  }

  if (missingStudyVariableMappings.length > 0) {
    pushIssue(errorIssues, {
      id: 'missing-test-matrix-mappings',
      level: 'error',
      title: 'Incomplete test matrix values',
      description: `${missingStudyVariableMappings.length} required test matrix cells are empty.`,
      count: missingStudyVariableMappings.length,
      items: missingStudyVariableMappings,
    });
  }

  if (invalidTimeseriesStudyVariableAbsolutePaths.length > 0) {
    pushIssue(errorIssues, {
      id: 'absolute-test-matrix-file-values',
      level: 'error',
      title: 'Absolute file paths are not allowed in test matrix',
      description: `${invalidTimeseriesStudyVariableAbsolutePaths.length} timeseries test matrix values use absolute paths.`,
      count: invalidTimeseriesStudyVariableAbsolutePaths.length,
      items: invalidTimeseriesStudyVariableAbsolutePaths,
    });
  }

  if (invalidTimeseriesStudyVariableNonCsvValues.length > 0) {
    pushIssue(errorIssues, {
      id: 'non-csv-test-matrix-file-values',
      level: 'error',
      title: 'Timeseries test matrix values must be relative .csv paths',
      description: `${invalidTimeseriesStudyVariableNonCsvValues.length} timeseries test matrix values are not .csv files.`,
      count: invalidTimeseriesStudyVariableNonCsvValues.length,
      items: invalidTimeseriesStudyVariableNonCsvValues,
    });
  }

  if (invalidScalarStudyVariableFileLikeValues.length > 0) {
    pushIssue(errorIssues, {
      id: 'file-like-scalar-test-matrix-values',
      level: 'error',
      title: 'Scalar test matrix values cannot be file paths',
      description: `${invalidScalarStudyVariableFileLikeValues.length} scalar test matrix values look like file paths. Switch variable mode to Timeseries or enter a scalar value.`,
      count: invalidScalarStudyVariableFileLikeValues.length,
      items: invalidScalarStudyVariableFileLikeValues,
    });
  }

  const isMappingRelevant = (mapping, mappingType) => {
    if (!mapping) return false;

    let studyId = '';
    if (mapping.studyRunId) {
      const run = runByRunId.get(String(mapping.studyRunId));
      studyId = String(run?.studyId || '');
    } else {
      studyId = String(mapping.studyId || '');
    }
    if (!studyId) return false;

    const modeInfo = modeByStudyId.get(studyId);
    if (!modeInfo) return false;
    if (mappingType === 'processed') return modeInfo.processedEnabled;
    return modeInfo.rawEnabled;
  };

  if (includePathChecks) {
    const directoryPaths = getCachedDirectoryPaths(selectedDataset?.tree || null);
    if (directoryPaths.size > 0) {
      const directoryHits = [];
      const pushDirectoryHits = (mappings = [], mappingType = 'raw') => {
        mappings.forEach((mapping) => {
          if (!isMappingRelevant(mapping, mappingType)) return;
          const rawValue = String(mapping?.value ?? '');
          const normalized = normalizePath(rawValue);
          if (!normalized) return;
          if (!directoryPaths.has(normalized)) return;
          directoryHits.push({
            mappingType,
            path: normalized,
            context: resolveMappingContext(mapping, lookup),
          });
        });
      };

      pushDirectoryHits(measurementMappings, 'raw');
      pushDirectoryHits(processingMappings, 'processed');

      if (directoryHits.length > 0) {
        pushIssue(errorIssues, {
          id: 'directory-assignment',
          level: 'error',
          title: 'Folder paths assigned instead of files',
          description: `${directoryHits.length} mappings reference a folder path. Use file paths only.`,
          count: directoryHits.length,
          items: directoryHits.map((entry) => `${entry.path} (${entry.mappingType}) - ${entry.context}`),
        });
      }
    }

    const allFileAssignments = [];
    const collectAssignments = (mappings = [], mappingType = 'raw') => {
      mappings.forEach((mapping) => {
        if (!isMappingRelevant(mapping, mappingType)) return;
        const rawValue = String(mapping?.value ?? '').trim();
        const normalized = normalizePath(rawValue);
        if (!normalized) return;
        allFileAssignments.push({
          mappingType,
          rawPath: rawValue,
          path: normalized,
          context: resolveMappingContext(mapping, lookup),
        });
      });
    };

    collectAssignments(measurementMappings, 'raw');
    collectAssignments(processingMappings, 'processed');

    const absolutePathAssignments = allFileAssignments.filter((entry) => isAbsolutePath(entry.rawPath));
    if (absolutePathAssignments.length > 0) {
      pushIssue(errorIssues, {
        id: 'absolute-file-path-assignments',
        level: 'error',
        title: 'Absolute file paths are not allowed',
        description: `${absolutePathAssignments.length} mappings use absolute file paths. Use dataset-relative paths only.`,
        count: absolutePathAssignments.length,
        items: absolutePathAssignments.map((entry) => `${entry.rawPath} (${entry.mappingType}) - ${entry.context}`),
      });
    }

    const nonCsvAssignments = allFileAssignments.filter((entry) => {
      if (directoryPaths.has(entry.path)) return false;
      return !hasCsvExtension(entry.path);
    });
    if (nonCsvAssignments.length > 0) {
      pushIssue(errorIssues, {
        id: 'non-csv-file-assignments',
        level: 'error',
        title: 'Only .csv files are allowed in output mappings',
        description: `${nonCsvAssignments.length} mappings use a non-.csv file path.`,
        count: nonCsvAssignments.length,
        items: nonCsvAssignments.map((entry) => `${entry.path} (${entry.mappingType}) - ${entry.context}`),
      });
    }

    const duplicatesByPath = new Map();
    allFileAssignments.forEach((entry) => {
      const bucket = duplicatesByPath.get(entry.path) || [];
      bucket.push(entry);
      duplicatesByPath.set(entry.path, bucket);
    });

    const duplicateSummaries = [...duplicatesByPath.entries()]
      .filter(([, entries]) => entries.length > 1)
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

    if (duplicateSummaries.length > 0) {
      pushIssue(warningIssues, {
        id: 'duplicate-file-assignments',
        level: 'warning',
        title: 'Duplicate file assignments',
        description: `${duplicateSummaries.length} files are assigned more than once.`,
        count: duplicateSummaries.length,
        items: duplicateSummaries.map(([path, entries]) => `${path} (${entries.length} assignments)`),
      });
    }
  }

  return {
    generatedAt: Date.now(),
    summary: {
      errors: errorIssues.length,
      warnings: warningIssues.length,
    },
    hasBlockingErrors: errorIssues.length > 0,
    blockingIssues: errorIssues,
    warningIssues,
    stats: {
      totalStudies: safeStudies.length,
      totalRuns: studyRuns.length,
      totalSensors: sensors.length,
      totalContacts: safeContacts.length,
      totalStudyVariables: safeStudyVariables.length,
      totalFaultSpecifications: faultSpecificationVariables.length,
      totalOperatingConditions: operatingConditionVariables.length,
      expectedAssignments: studyRuns.length * sensors.length,
      requiredRawAssignments,
      requiredProcessedAssignments,
      requiredStudyVariableMappings,
      missingMeasurement: missingMeasurement.length,
      missingProcessing: missingProcessing.length,
      missingStudyVariableMappings: missingStudyVariableMappings.length,
      mappedMeasurement: Math.max(0, requiredRawAssignments - missingMeasurement.length),
      mappedProcessing: Math.max(0, requiredProcessedAssignments - missingProcessing.length),
      mappedStudyVariableMappings: Math.max(0, requiredStudyVariableMappings - missingStudyVariableMappings.length),
    },
  };
}

export default buildExportValidationReport;
