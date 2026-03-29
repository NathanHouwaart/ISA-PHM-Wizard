const GLOBAL_STORAGE_PREFIX = 'globalAppData_';

const KNOWN_GLOBAL_STORAGE_KEYS = Object.freeze([
    'globalAppData_projects',
    'globalAppData_currentProjectId',
    'globalAppData_testSetups',
    'globalAppData_testSetups_schemaVersion'
]);

const PROJECT_STATE_KEYS = Object.freeze([
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
]);

const PROJECT_SYSTEM_SUFFIXES = Object.freeze([
    'schemaVersion',
    'investigations'
]);

const PROJECT_METADATA_SUFFIXES = Object.freeze([
    'datasetName',
    'datasetStats',
    'lastEdited'
]);

const IMPORTABLE_PROJECT_SUFFIXES = Object.freeze([
    ...PROJECT_STATE_KEYS,
    'schemaVersion',
    'investigations'
]);

const TRANSIENT_SEEDED_SUFFIX_PATTERN = /^seeded_v\d+$/;

const GLOBAL_KEY_SET = new Set(KNOWN_GLOBAL_STORAGE_KEYS);
const STATE_SUFFIX_SET = new Set(PROJECT_STATE_KEYS);
const SYSTEM_SUFFIX_SET = new Set(PROJECT_SYSTEM_SUFFIXES);
const METADATA_SUFFIX_SET = new Set(PROJECT_METADATA_SUFFIXES);
const IMPORTABLE_SUFFIX_SET = new Set(IMPORTABLE_PROJECT_SUFFIXES);
const KNOWN_PROJECT_SUFFIXES = Object.freeze([
    ...PROJECT_STATE_KEYS,
    ...PROJECT_SYSTEM_SUFFIXES,
    ...PROJECT_METADATA_SUFFIXES
]);
const SORTED_KNOWN_PROJECT_SUFFIXES = [...KNOWN_PROJECT_SUFFIXES].sort(
    (left, right) => right.length - left.length
);

const resolveStorage = (storage) => {
    if (storage) return storage;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    return null;
};

const listStorageKeys = (storage) => {
    const resolvedStorage = resolveStorage(storage);
    if (!resolvedStorage) return [];

    const keys = [];
    for (let index = 0; index < resolvedStorage.length; index += 1) {
        const key = resolvedStorage.key(index);
        if (typeof key === 'string' && key.length > 0) {
            keys.push(key);
        }
    }
    return keys;
};

const classifySuffix = (suffix) => {
    if (STATE_SUFFIX_SET.has(suffix)) return 'state';
    if (SYSTEM_SUFFIX_SET.has(suffix)) return 'system';
    if (METADATA_SUFFIX_SET.has(suffix)) return 'metadata';
    return 'unknown';
};

const parseKnownSuffix = (body) => {
    for (const suffix of SORTED_KNOWN_PROJECT_SUFFIXES) {
        const suffixMarker = `_${suffix}`;
        if (!body.endsWith(suffixMarker)) continue;
        const projectId = body.slice(0, body.length - suffixMarker.length);
        if (!projectId) continue;

        return {
            projectId,
            suffix,
            kind: classifySuffix(suffix)
        };
    }

    const transientMatch = body.match(/^(.+)_(seeded_v\d+)$/);
    if (transientMatch && transientMatch[1] && TRANSIENT_SEEDED_SUFFIX_PATTERN.test(transientMatch[2])) {
        return {
            projectId: transientMatch[1],
            suffix: transientMatch[2],
            kind: 'transient'
        };
    }

    return null;
};

const isKnownProjectKind = (kind, includeTransient) => {
    if (kind === 'state' || kind === 'system' || kind === 'metadata') return true;
    if (kind === 'transient') return includeTransient;
    return false;
};

const removeKeys = (storage, keys) => {
    if (!storage) return [];
    const removed = [];
    keys.forEach((key) => {
        try {
            storage.removeItem(key);
            removed.push(key);
        } catch (error) {
            // Ignore per-key storage failures; callers can inspect partial results.
        }
    });
    return removed;
};

const getProjectScopedPrefix = (projectId) => `${GLOBAL_STORAGE_PREFIX}${projectId}_`;

const buildProjectScopedStorageKey = (projectId, suffix) => `${GLOBAL_STORAGE_PREFIX}${projectId}_${suffix}`;

const isKnownGlobalStorageKey = (key) => GLOBAL_KEY_SET.has(key);

const parseManagedProjectScopedKey = (key) => {
    if (typeof key !== 'string' || !key.startsWith(GLOBAL_STORAGE_PREFIX)) {
        return null;
    }
    if (isKnownGlobalStorageKey(key)) {
        return null;
    }
    return parseKnownSuffix(key.slice(GLOBAL_STORAGE_PREFIX.length));
};

const removeProjectScopedKeys = ({
    projectId,
    storage,
    knownOnly = false,
    includeTransient = true
} = {}) => {
    if (!projectId) return [];

    const resolvedStorage = resolveStorage(storage);
    if (!resolvedStorage) return [];

    const prefix = getProjectScopedPrefix(projectId);
    const matchingKeys = listStorageKeys(resolvedStorage).filter((key) => (
        typeof key === 'string' && key.startsWith(prefix)
    ));

    if (!knownOnly) {
        return removeKeys(resolvedStorage, matchingKeys);
    }

    const knownKeys = matchingKeys.filter((key) => {
        const info = parseManagedProjectScopedKey(key);
        return !!info && info.projectId === projectId && isKnownProjectKind(info.kind, includeTransient);
    });

    return removeKeys(resolvedStorage, knownKeys);
};

const removeOrphanProjectScopedKeys = ({
    allowedProjectIds = [],
    storage,
    includeTransient = true
} = {}) => {
    const resolvedStorage = resolveStorage(storage);
    if (!resolvedStorage) return [];

    const allowedSet = new Set(
        (Array.isArray(allowedProjectIds) ? allowedProjectIds : [])
            .filter((projectId) => typeof projectId === 'string' && projectId.length > 0)
    );

    const orphanKeys = listStorageKeys(resolvedStorage).filter((key) => {
        const info = parseManagedProjectScopedKey(key);
        if (!info) return false;
        if (!isKnownProjectKind(info.kind, includeTransient)) return false;
        return !allowedSet.has(info.projectId);
    });

    return removeKeys(resolvedStorage, orphanKeys);
};

const getImportableProjectSuffixFromStorageKey = (key, sourceProjectId = '') => {
    if (typeof key !== 'string' || !key.startsWith(GLOBAL_STORAGE_PREFIX)) {
        return null;
    }

    if (typeof sourceProjectId === 'string' && sourceProjectId.length > 0) {
        const sourcePrefix = getProjectScopedPrefix(sourceProjectId);
        if (!key.startsWith(sourcePrefix)) {
            return null;
        }

        const suffix = key.slice(sourcePrefix.length);
        return IMPORTABLE_SUFFIX_SET.has(suffix) ? suffix : null;
    }

    const info = parseManagedProjectScopedKey(key);
    if (!info) return null;
    return IMPORTABLE_SUFFIX_SET.has(info.suffix) ? info.suffix : null;
};

export {
    GLOBAL_STORAGE_PREFIX,
    KNOWN_GLOBAL_STORAGE_KEYS,
    PROJECT_STATE_KEYS,
    PROJECT_SYSTEM_SUFFIXES,
    PROJECT_METADATA_SUFFIXES,
    IMPORTABLE_PROJECT_SUFFIXES,
    getProjectScopedPrefix,
    buildProjectScopedStorageKey,
    isKnownGlobalStorageKey,
    parseManagedProjectScopedKey,
    removeProjectScopedKeys,
    removeOrphanProjectScopedKeys,
    getImportableProjectSuffixFromStorageKey
};
