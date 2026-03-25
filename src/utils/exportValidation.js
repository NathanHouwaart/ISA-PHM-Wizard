import { expandStudiesIntoRuns } from './studyRuns';
import {
  hasFilledValue,
  isProcessedOutputEnabled,
  isRawOutputEnabled,
  resolveStudyOutputMode,
} from './studyOutputMode';

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

const resolveRunMapping = (mappings = [], sensorId, run) => {
  return asArray(mappings).find((mapping) => {
    if (!mapping || String(mapping.sensorId) !== String(sensorId)) return false;
    if (mapping.studyRunId) {
      return String(mapping.studyRunId) === String(run.runId);
    }
    return String(mapping.studyId) === String(run.studyId);
  }) || null;
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

const formatRunSensorLabel = (run, sensor) => {
  const studyLabel = run?.studyName || run?.name || run?.studyId || 'Unknown study';
  const runLabel = run?.runNumber ? `Run ${run.runNumber}` : 'Run ?';
  const sensorLabel = sensor?.alias || sensor?.name || sensor?.id || 'Unknown sensor';
  return `${studyLabel} / ${runLabel} / ${sensorLabel}`;
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
  studies = [],
  testSetups = [],
  selectedTestSetupId = null,
  studyToMeasurementProtocolSelection = [],
  studyToProcessingProtocolSelection = [],
  studyToSensorMeasurementMapping = [],
  studyToSensorProcessingMapping = [],
  selectedDataset = null,
} = {}) {
  const safeStudies = asArray(studies);
  const selectedSetup = asArray(testSetups).find((setup) => setup?.id === selectedTestSetupId) || null;
  const sensors = asArray(selectedSetup?.sensors);
  const studyRuns = expandStudiesIntoRuns(safeStudies);
  const selectionLookup = buildSelectionLookup({
    studyToMeasurementProtocolSelection,
    studyToProcessingProtocolSelection,
  });

  const warningIssues = [];
  const errorIssues = [];

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

  const modeByStudyId = new Map();
  const missingMeasurementProtocols = [];
  const missingProcessingProtocols = [];

  safeStudies.forEach((study, studyIndex) => {
    if (!study?.id) return;

    const studyId = String(study.id);
    const studyRunsForMode = runsByStudyId.get(studyId) || [];
    const selectedMeasurementProtocolId = study?.measurementProtocolId || selectionLookup.measurement[study.id] || '';
    const selectedProcessingProtocolId = study?.processingProtocolId || selectionLookup.processing[study.id] || '';
    const outputMode = resolveStudyOutputMode(study, {
      studyRuns: studyRunsForMode,
      measurementMappings,
      processingMappings,
      selectedProcessingProtocolId,
    });

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
        const measurement = resolveRunMapping(measurementMappings, sensor?.id, run);
        const processing = resolveRunMapping(processingMappings, sensor?.id, run);

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

  const directoryPaths = collectDirectoryPaths(selectedDataset?.tree || []);
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
        path: normalized,
        context: resolveMappingContext(mapping, lookup),
      });
    });
  };

  collectAssignments(measurementMappings, 'raw');
  collectAssignments(processingMappings, 'processed');

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
      totalRuns: studyRuns.length,
      totalSensors: sensors.length,
      expectedAssignments: studyRuns.length * sensors.length,
      requiredRawAssignments,
      requiredProcessedAssignments,
      missingMeasurement: missingMeasurement.length,
      missingProcessing: missingProcessing.length,
      mappedMeasurement: Math.max(0, requiredRawAssignments - missingMeasurement.length),
      mappedProcessing: Math.max(0, requiredProcessedAssignments - missingProcessing.length),
    },
  };
}

export default buildExportValidationReport;
