const readJson = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
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
