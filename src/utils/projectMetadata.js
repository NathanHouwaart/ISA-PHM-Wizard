const readJson = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const readCollectionCount = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data.length;
    }
    if (data && typeof data === 'object') {
      return Object.keys(data).length;
    }
    return 0;
  } catch {
    return 0;
  }
};

const datasetNameKey = (projectId) => `globalAppData_${projectId}_datasetName`;
const datasetStatsKey = (projectId) => `globalAppData_${projectId}_datasetStats`;
const lastEditedKey = (projectId) => `globalAppData_${projectId}_lastEdited`;

const toSafeCount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const countDatasetNodes = (nodes = []) => {
  return (Array.isArray(nodes) ? nodes : []).reduce(
    (acc, node) => {
      if (!node || typeof node !== 'object') {
        return acc;
      }

      if (node.isDirectory) {
        acc.folders += 1;
        const childCounts = countDatasetNodes(node.children || []);
        acc.files += childCounts.files;
        acc.folders += childCounts.folders;
        return acc;
      }

      acc.files += 1;
      return acc;
    },
    { files: 0, folders: 0 }
  );
};

const buildDatasetStats = (dataset) => {
  if (!dataset || typeof dataset !== 'object') {
    return { files: 0, folders: 0, computedAt: null };
  }

  const counts = countDatasetNodes(dataset.tree || []);
  return {
    files: counts.files,
    folders: counts.folders,
    computedAt: new Date().toISOString()
  };
};

export const setProjectDatasetName = (projectId, name) => {
  if (!projectId) return null;
  try {
    if (name) {
      localStorage.setItem(datasetNameKey(projectId), JSON.stringify(name));
      return name;
    }
    localStorage.removeItem(datasetNameKey(projectId));
    return null;
  } catch (err) {
    console.warn('[projectMetadata] Failed to persist dataset name', err);
    return null;
  }
};

export const clearProjectDatasetName = (projectId) => {
  if (!projectId) return;
  try {
    localStorage.removeItem(datasetNameKey(projectId));
  } catch (err) {
    console.warn('[projectMetadata] Failed to clear dataset name', err);
  }
};

export const getProjectDatasetStats = (projectId) => {
  if (!projectId) {
    return { files: 0, folders: 0, computedAt: null };
  }
  const stats = readJson(datasetStatsKey(projectId), null);
  if (!stats || typeof stats !== 'object') {
    return { files: 0, folders: 0, computedAt: null };
  }
  return {
    files: toSafeCount(stats.files),
    folders: toSafeCount(stats.folders),
    computedAt: stats.computedAt || null
  };
};

export const setProjectDatasetStats = (projectId, dataset) => {
  if (!projectId) {
    return { files: 0, folders: 0, computedAt: null };
  }
  const stats = buildDatasetStats(dataset);
  try {
    localStorage.setItem(datasetStatsKey(projectId), JSON.stringify(stats));
  } catch (err) {
    console.warn('[projectMetadata] Failed to persist dataset stats', err);
  }
  return stats;
};

export const ensureProjectDatasetStats = (projectId, dataset) => {
  if (!projectId || !dataset) {
    return { files: 0, folders: 0, computedAt: null };
  }
  const existing = readJson(datasetStatsKey(projectId), null);
  if (existing && typeof existing === 'object') {
    return {
      files: toSafeCount(existing.files),
      folders: toSafeCount(existing.folders),
      computedAt: existing.computedAt || null
    };
  }
  return setProjectDatasetStats(projectId, dataset);
};

export const clearProjectDatasetStats = (projectId) => {
  if (!projectId) return;
  try {
    localStorage.removeItem(datasetStatsKey(projectId));
  } catch (err) {
    console.warn('[projectMetadata] Failed to clear dataset stats', err);
  }
};

export const setProjectLastEdited = (projectId, value = new Date().toISOString()) => {
  if (!projectId) return null;

  const normalized = value instanceof Date
    ? value.toISOString()
    : (typeof value === 'string' ? value : new Date().toISOString());

  try {
    localStorage.setItem(lastEditedKey(projectId), JSON.stringify(normalized));
    return normalized;
  } catch (err) {
    console.warn('[projectMetadata] Failed to persist last edited timestamp', err);
    return null;
  }
};

export const clearProjectLastEdited = (projectId) => {
  if (!projectId) return;
  try {
    localStorage.removeItem(lastEditedKey(projectId));
  } catch (err) {
    console.warn('[projectMetadata] Failed to clear last edited timestamp', err);
  }
};

export const getProjectDatasetName = (projectId) => {
  if (!projectId) return null;
  return readJson(`globalAppData_${projectId}_datasetName`);
};

export const getProjectLastEdited = (projectId) => {
  if (!projectId) return null;
  const value = readJson(lastEditedKey(projectId));
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getProjectExperimentTypeId = (projectId, fallback = null) => {
  if (!projectId) return fallback;
  return readJson(`globalAppData_${projectId}_experimentType`, fallback);
};

export const getProjectTestSetupId = (projectId) => {
  if (!projectId) return null;
  return readJson(`globalAppData_${projectId}_selectedTestSetupId`);
};

export const getProjectSummary = (projectId, { testSetups = [] } = {}) => {
  const datasetName = getProjectDatasetName(projectId);
  const lastEdited = getProjectLastEdited(projectId);
  const experimentTypeId = getProjectExperimentTypeId(projectId, null);
  const setupId = getProjectTestSetupId(projectId);
  const setup = Array.isArray(testSetups)
    ? testSetups.find((s) => s?.id === setupId)
    : null;

  return {
    datasetName,
    lastEdited,
    experimentTypeId,
    setup,
  };
};

export const getProjectCollectionStats = (projectId) => {
  if (!projectId) {
    return {
      studies: 0,
      assays: 0,
      contacts: 0,
      publications: 0,
    };
  }

  return {
    studies: readCollectionCount(`globalAppData_${projectId}_studies`),
    assays: readCollectionCount(`globalAppData_${projectId}_assays`),
    contacts: readCollectionCount(`globalAppData_${projectId}_contacts`),
    publications: readCollectionCount(`globalAppData_${projectId}_publications`),
  };
};
