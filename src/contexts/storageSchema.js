import { decodeJsonFromStorage, encodeJsonForStorage } from '../utils/storageCodec';
import { expandStudiesIntoRuns, normalizeRunCount } from '../utils/studyRuns';
import { resolveStudyOutputMode } from '../utils/studyOutputMode';

const PROJECT_SCHEMA_VERSION = 2;
const TEST_SETUPS_SCHEMA_VERSION = 1;

const TEST_SETUPS_STORAGE_KEY = 'globalAppData_testSetups';
const TEST_SETUPS_SCHEMA_VERSION_KEY = `${TEST_SETUPS_STORAGE_KEY}_schemaVersion`;

const PROJECT_STATE_KEYS = [
    'studies',
    'investigation',
    'contacts',
    'publications',
    'selectedTestSetupId',
    'studyVariables',
    'measurementProtocols',
    'processingProtocols',
    'studyToMeasurementProtocolSelection',
    'studyToProcessingProtocolSelection',
    'experimentType',
    'studyToStudyVariableMapping',
    'sensorToMeasurementProtocolMapping',
    'studyToSensorMeasurementMapping',
    'sensorToProcessingProtocolMapping',
    'studyToSensorProcessingMapping',
    'pageTabStates'
];

const PROJECT_ARRAY_KEYS = new Set([
    'studies',
    'contacts',
    'publications',
    'studyVariables',
    'measurementProtocols',
    'processingProtocols',
    'studyToMeasurementProtocolSelection',
    'studyToProcessingProtocolSelection',
    'studyToStudyVariableMapping',
    'sensorToMeasurementProtocolMapping',
    'studyToSensorMeasurementMapping',
    'sensorToProcessingProtocolMapping',
    'studyToSensorProcessingMapping'
]);

const PROJECT_OBJECT_KEYS = new Set([
    'investigation',
    'pageTabStates'
]);

const TEST_SETUP_ARRAY_KEYS = [
    'characteristics',
    'sensors',
    'configurations',
    'comments',
    'measurementProtocols',
    'processingProtocols',
    'sensorToMeasurementProtocolMapping',
    'sensorToProcessingProtocolMapping'
];

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const getStorage = (storage) => {
    if (storage) return storage;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    return null;
};

const projectKey = (projectId, key) => `globalAppData_${projectId}_${key}`;
const projectSchemaVersionKey = (projectId) => projectKey(projectId, 'schemaVersion');

const parseSchemaVersion = (value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) return 0;
    return parsed;
};

const isJsonEqual = (left, right) => {
    try {
        return JSON.stringify(left) === JSON.stringify(right);
    } catch (error) {
        return false;
    }
};

const readJsonValue = (storage, key) => {
    if (!storage) {
        return { exists: false, value: undefined };
    }

    try {
        return decodeJsonFromStorage(storage.getItem(key));
    } catch (error) {
        return { exists: true, value: undefined };
    }
};

const writeJsonValue = (storage, key, value) => {
    if (!storage) return false;
    try {
        storage.setItem(key, encodeJsonForStorage(value));
        return true;
    } catch (error) {
        return false;
    }
};

const removeKey = (storage, key) => {
    if (!storage) return false;
    try {
        storage.removeItem(key);
        return true;
    } catch (error) {
        return false;
    }
};

const normalizeStudyProtocolSelection = (entries) => {
    if (!Array.isArray(entries)) return [];

    const seen = new Set();
    const normalized = [];

    for (let index = entries.length - 1; index >= 0; index -= 1) {
        const entry = entries[index];
        if (!isPlainObject(entry) || entry.studyId === undefined || entry.studyId === null) {
            continue;
        }
        const studyId = String(entry.studyId);
        if (seen.has(studyId)) continue;
        seen.add(studyId);
        normalized.unshift({
            studyId,
            protocolId: entry.protocolId === undefined || entry.protocolId === null
                ? ''
                : String(entry.protocolId)
        });
    }

    return normalized;
};

const LEGACY_EXPERIMENT_TYPE_MAP = {
    'diagnostic-single': 'diagnostic-experiment',
    'rtf-single': 'diagnostic-experiment',
    'diagnostic-multi': 'prognostics-experiment',
    'rtf-multi': 'prognostics-experiment'
};

const DIAGNOSTIC_EXPERIMENT_TYPE_ID = 'diagnostic-experiment';
const PROGNOSTICS_EXPERIMENT_TYPE_ID = 'prognostics-experiment';

const normalizeExperimentTypeId = (value) => {
    if (typeof value !== 'string') return '';
    const normalized = value.trim();
    if (!normalized) return '';
    return LEGACY_EXPERIMENT_TYPE_MAP[normalized] || normalized;
};

const inferExperimentTypeIdFromStudies = (studies, fallback = '') => {
    const safeStudies = Array.isArray(studies) ? studies : [];
    const hasMultiRun = safeStudies.some((study) => normalizeRunCount(study?.runCount) > 1);
    if (hasMultiRun) return PROGNOSTICS_EXPERIMENT_TYPE_ID;

    const normalizedFallback = normalizeExperimentTypeId(fallback);
    if (normalizedFallback) return normalizedFallback;
    return DIAGNOSTIC_EXPERIMENT_TYPE_ID;
};

const toProtocolLookup = (entries = []) => {
    return normalizeStudyProtocolSelection(entries).reduce((accumulator, entry) => {
        if (!entry?.studyId) return accumulator;
        accumulator[String(entry.studyId)] = String(entry.protocolId || '');
        return accumulator;
    }, {});
};

const migrateStudiesForSchemaV2 = ({
    studies = [],
    studyToMeasurementProtocolSelection = [],
    studyToProcessingProtocolSelection = [],
    studyToSensorMeasurementMapping = [],
    studyToSensorProcessingMapping = []
}) => {
    const safeStudies = Array.isArray(studies) ? studies : [];
    const normalizedMeasurementSelection = normalizeStudyProtocolSelection(studyToMeasurementProtocolSelection);
    const normalizedProcessingSelection = normalizeStudyProtocolSelection(studyToProcessingProtocolSelection);
    const measurementByStudy = toProtocolLookup(normalizedMeasurementSelection);
    const processingByStudy = toProtocolLookup(normalizedProcessingSelection);

    const preNormalizedStudies = safeStudies.map((study) => {
        if (!isPlainObject(study)) return study;
        if (study.id === undefined || study.id === null) return study;

        const studyId = String(study.id);
        const measurementProtocolId = String(
            study.measurementProtocolId
            ?? measurementByStudy[studyId]
            ?? ''
        );
        const processingProtocolId = String(
            study.processingProtocolId
            ?? processingByStudy[studyId]
            ?? ''
        );

        return {
            ...study,
            runCount: normalizeRunCount(study.runCount),
            measurementProtocolId,
            processingProtocolId
        };
    });

    const runsByStudyId = expandStudiesIntoRuns(preNormalizedStudies).reduce((accumulator, run) => {
        const studyId = String(run?.studyId || '');
        if (!studyId) return accumulator;
        if (!accumulator[studyId]) {
            accumulator[studyId] = [];
        }
        accumulator[studyId].push(run);
        return accumulator;
    }, {});

    const migratedStudies = preNormalizedStudies.map((study) => {
        if (!isPlainObject(study)) return study;
        if (study.id === undefined || study.id === null) return study;

        const studyId = String(study.id);
        const selectedProcessingProtocolId = String(
            study.processingProtocolId
            ?? processingByStudy[studyId]
            ?? ''
        );

        return {
            ...study,
            outputMode: resolveStudyOutputMode(study, {
                studyRuns: runsByStudyId[studyId] || [],
                measurementMappings: Array.isArray(studyToSensorMeasurementMapping)
                    ? studyToSensorMeasurementMapping
                    : [],
                processingMappings: Array.isArray(studyToSensorProcessingMapping)
                    ? studyToSensorProcessingMapping
                    : [],
                selectedProcessingProtocolId
            })
        };
    });

    const nextMeasurementByStudy = new Map(
        normalizedMeasurementSelection.map((entry) => [String(entry.studyId), String(entry.protocolId || '')])
    );
    const nextProcessingByStudy = new Map(
        normalizedProcessingSelection.map((entry) => [String(entry.studyId), String(entry.protocolId || '')])
    );

    migratedStudies.forEach((study) => {
        if (!isPlainObject(study)) return;
        if (study.id === undefined || study.id === null) return;

        const studyId = String(study.id);
        nextMeasurementByStudy.set(
            studyId,
            String(study.measurementProtocolId ?? measurementByStudy[studyId] ?? '')
        );
        nextProcessingByStudy.set(
            studyId,
            String(study.processingProtocolId ?? processingByStudy[studyId] ?? '')
        );
    });

    return {
        studies: migratedStudies,
        studyToMeasurementProtocolSelection: [...nextMeasurementByStudy.entries()].map(([studyId, protocolId]) => ({
            studyId,
            protocolId
        })),
        studyToProcessingProtocolSelection: [...nextProcessingByStudy.entries()].map(([studyId, protocolId]) => ({
            studyId,
            protocolId
        }))
    };
};

const normalizeProjectState = (state, defaults) => {
    const next = {};

    PROJECT_STATE_KEYS.forEach((key) => {
        const value = state[key];
        const fallback = defaults[key];

        if (PROJECT_ARRAY_KEYS.has(key)) {
            const base = Array.isArray(value) ? value : (Array.isArray(fallback) ? fallback : []);
            if (key === 'studyToMeasurementProtocolSelection' || key === 'studyToProcessingProtocolSelection') {
                next[key] = normalizeStudyProtocolSelection(base);
            } else {
                next[key] = base;
            }
            return;
        }

        if (PROJECT_OBJECT_KEYS.has(key)) {
            next[key] = isPlainObject(value)
                ? value
                : (isPlainObject(fallback) ? fallback : {});
            return;
        }

        if (key === 'selectedTestSetupId') {
            if (value === null || value === undefined || value === '') {
                next[key] = null;
            } else {
                next[key] = String(value);
            }
            return;
        }

        if (key === 'experimentType') {
            const normalizedValue = normalizeExperimentTypeId(value);
            const normalizedFallback = normalizeExperimentTypeId(fallback);
            next[key] = normalizedValue
                || inferExperimentTypeIdFromStudies(next.studies, normalizedFallback);
            return;
        }

        next[key] = value !== undefined ? value : fallback;
    });

    return next;
};

const normalizeTestSetup = (setup, now) => {
    if (!isPlainObject(setup)) return null;

    const next = { ...setup };

    TEST_SETUP_ARRAY_KEYS.forEach((key) => {
        next[key] = Array.isArray(setup[key]) ? setup[key] : [];
    });

    const parsedVersion = Number(setup.version);
    next.version = Number.isFinite(parsedVersion) ? parsedVersion : 1;

    const parsedLastModified = Number(setup.lastModified);
    next.lastModified = Number.isFinite(parsedLastModified) ? parsedLastModified : now;

    return next;
};

const normalizeTestSetups = (setups) => {
    const now = Date.now();
    if (!Array.isArray(setups)) return [];

    return setups
        .map((setup) => normalizeTestSetup(setup, now))
        .filter(Boolean);
};

const buildProjectDefaults = (resolveDefaultValue) => {
    return PROJECT_STATE_KEYS.reduce((accumulator, key) => {
        const resolved = typeof resolveDefaultValue === 'function' ? resolveDefaultValue(key) : undefined;
        if (resolved !== undefined) {
            accumulator[key] = resolved;
        } else if (PROJECT_ARRAY_KEYS.has(key)) {
            accumulator[key] = [];
        } else if (PROJECT_OBJECT_KEYS.has(key)) {
            accumulator[key] = {};
        } else if (key === 'selectedTestSetupId') {
            accumulator[key] = null;
        } else if (key === 'experimentType') {
            accumulator[key] = '';
        } else {
            accumulator[key] = [];
        }
        return accumulator;
    }, {});
};

export const ensureProjectSchemaVersion = ({
    projectId,
    schemaVersion = PROJECT_SCHEMA_VERSION,
    storage
}) => {
    if (!projectId) return false;
    const resolvedStorage = getStorage(storage);
    return writeJsonValue(resolvedStorage, projectSchemaVersionKey(projectId), schemaVersion);
};

export const writeProjectStateSnapshot = ({
    projectId,
    state,
    schemaVersion = PROJECT_SCHEMA_VERSION,
    storage
}) => {
    if (!projectId || !state) return false;

    const resolvedStorage = getStorage(storage);
    if (!resolvedStorage) return false;

    PROJECT_STATE_KEYS.forEach((key) => {
        writeJsonValue(resolvedStorage, projectKey(projectId, key), state[key]);
    });
    writeJsonValue(resolvedStorage, projectSchemaVersionKey(projectId), schemaVersion);

    return true;
};

export const loadProjectStateWithMigrations = ({
    projectId,
    resolveDefaultValue,
    storage
}) => {
    const resolvedStorage = getStorage(storage);
    const defaults = buildProjectDefaults(resolveDefaultValue);

    if (!projectId) {
        return {
            state: defaults,
            schemaVersion: PROJECT_SCHEMA_VERSION,
            migrated: false
        };
    }

    const rawByKey = {};
    const rawState = {};

    PROJECT_STATE_KEYS.forEach((key) => {
        const keyResult = readJsonValue(resolvedStorage, projectKey(projectId, key));
        rawByKey[key] = keyResult;
        rawState[key] = keyResult.exists ? keyResult.value : defaults[key];
    });

    const legacyInvestigationKey = projectKey(projectId, 'investigations');
    const legacyInvestigation = readJsonValue(resolvedStorage, legacyInvestigationKey);
    if (!rawByKey.investigation.exists && legacyInvestigation.exists) {
        rawState.investigation = legacyInvestigation.value;
    }

    const schemaResult = readJsonValue(resolvedStorage, projectSchemaVersionKey(projectId));
    const originalVersion = schemaResult.exists ? parseSchemaVersion(schemaResult.value) : 0;
    let schemaVersion = originalVersion;
    let migratedState = { ...rawState };

    if (schemaVersion < 1) {
        migratedState.studyToMeasurementProtocolSelection = normalizeStudyProtocolSelection(
            migratedState.studyToMeasurementProtocolSelection
        );
        migratedState.studyToProcessingProtocolSelection = normalizeStudyProtocolSelection(
            migratedState.studyToProcessingProtocolSelection
        );
        schemaVersion = 1;
    }

    if (schemaVersion < 2) {
        const migratedSchemaV2 = migrateStudiesForSchemaV2({
            studies: migratedState.studies,
            studyToMeasurementProtocolSelection: migratedState.studyToMeasurementProtocolSelection,
            studyToProcessingProtocolSelection: migratedState.studyToProcessingProtocolSelection,
            studyToSensorMeasurementMapping: migratedState.studyToSensorMeasurementMapping,
            studyToSensorProcessingMapping: migratedState.studyToSensorProcessingMapping
        });

        migratedState = {
            ...migratedState,
            ...migratedSchemaV2,
            experimentType: normalizeExperimentTypeId(migratedState.experimentType)
        };
        schemaVersion = 2;
    }

    const normalizedState = normalizeProjectState(migratedState, defaults);
    let migrated = false;

    PROJECT_STATE_KEYS.forEach((key) => {
        const keyResult = rawByKey[key];
        const nextValue = normalizedState[key];
        if (!keyResult.exists || !isJsonEqual(keyResult.value, nextValue)) {
            writeJsonValue(resolvedStorage, projectKey(projectId, key), nextValue);
            migrated = true;
        }
    });

    if (legacyInvestigation.exists) {
        removeKey(resolvedStorage, legacyInvestigationKey);
        migrated = true;
    }

    if (!schemaResult.exists || schemaVersion !== originalVersion) {
        writeJsonValue(resolvedStorage, projectSchemaVersionKey(projectId), schemaVersion);
        migrated = true;
    }

    return {
        state: normalizedState,
        schemaVersion,
        migrated
    };
};

export const loadGlobalTestSetupsWithMigrations = ({
    fallback = [],
    storage
}) => {
    const resolvedStorage = getStorage(storage);
    const testSetupsResult = readJsonValue(resolvedStorage, TEST_SETUPS_STORAGE_KEY);
    const schemaResult = readJsonValue(resolvedStorage, TEST_SETUPS_SCHEMA_VERSION_KEY);

    const rawSetups = testSetupsResult.exists ? testSetupsResult.value : fallback;
    const normalizedSetups = normalizeTestSetups(rawSetups);

    const originalVersion = schemaResult.exists ? parseSchemaVersion(schemaResult.value) : 0;
    let schemaVersion = originalVersion;

    if (schemaVersion < 1) {
        schemaVersion = 1;
    }

    let migrated = false;

    if (!testSetupsResult.exists || !isJsonEqual(testSetupsResult.value, normalizedSetups)) {
        writeJsonValue(resolvedStorage, TEST_SETUPS_STORAGE_KEY, normalizedSetups);
        migrated = true;
    }

    if (!schemaResult.exists || schemaVersion !== originalVersion) {
        writeJsonValue(resolvedStorage, TEST_SETUPS_SCHEMA_VERSION_KEY, schemaVersion);
        migrated = true;
    }

    return {
        testSetups: normalizedSetups,
        schemaVersion,
        migrated
    };
};

export {
    PROJECT_SCHEMA_VERSION,
    TEST_SETUPS_SCHEMA_VERSION,
    TEST_SETUPS_STORAGE_KEY,
    TEST_SETUPS_SCHEMA_VERSION_KEY,
    PROJECT_STATE_KEYS,
    projectKey
};
