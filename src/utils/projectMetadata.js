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

export const getProjectDatasetName = (projectId) => {
  if (!projectId) return null;
  return readJson(`globalAppData_${projectId}_datasetName`);
};

export const getProjectLastEdited = (projectId) => {
  if (!projectId) return null;
  const value = readJson(`globalAppData_${projectId}_lastEdited`);
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
