import { clearTree, loadTree } from '../utils/indexedTreeStore';
import { commitProjectArchiveImport, readProjectImportFile } from '../utils/projectArchive';
import {
  clearProjectDatasetName,
  clearProjectDatasetStats,
  setProjectDatasetName,
  setProjectDatasetStats,
} from '../utils/projectMetadata';
import { cleanupUnreferencedAttachmentRefs, collectAttachmentRefs } from '../utils/attachmentLifecycle';

const EXAMPLE_PROJECTS = {
  'example-single-run': {
    archivePath: 'examples/diagnostics-example.isa-phm.zip',
    archiveName: 'diagnostics-example.isa-phm.zip',
  },
  'example-multi-run': {
    archivePath: 'examples/xjtu-sy-bearing-datasets.isa-phm.zip',
    archiveName: 'xjtu-sy-bearing-datasets.isa-phm.zip',
  },
};

const EXAMPLE_PROJECT_CACHE = new Map();
const EXAMPLE_PROJECT_PENDING = new Map();
const EXAMPLE_SEED_VERSION = 3;

const getExampleSeedFlagKey = (projectId) => `globalAppData_${projectId}_seeded_v${EXAMPLE_SEED_VERSION}`;
const getArchiveUrl = (archivePath) => `${import.meta.env.BASE_URL}${archivePath}`;
const getArchiveUrls = (archivePath) => [
  getArchiveUrl(archivePath),
  `/${archivePath}`,
].filter((url, index, urls) => urls.indexOf(url) === index);

const clearProjectScopedLocalStorage = (projectId) => {
  const prefix = `globalAppData_${projectId}_`;
  const keysToRemove = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix)) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

const loadExampleProjectData = async (projectId) => {
  const definition = EXAMPLE_PROJECTS[projectId];
  if (!definition) return null;
  if (EXAMPLE_PROJECT_CACHE.has(projectId)) return EXAMPLE_PROJECT_CACHE.get(projectId);
  if (EXAMPLE_PROJECT_PENDING.has(projectId)) return EXAMPLE_PROJECT_PENDING.get(projectId);

  const pending = (async () => {
    let lastError = null;
    for (const archiveUrl of getArchiveUrls(definition.archivePath)) {
      try {
        const response = await fetch(archiveUrl);
        if (!response.ok) throw new Error(`Unable to load example archive: ${response.status}`);
        const blob = await response.blob();
        return await readProjectImportFile(new File([blob], definition.archiveName, { type: 'application/zip' }));
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Unable to load example archive');
  })()
    .then((candidate) => {
      EXAMPLE_PROJECT_CACHE.set(projectId, candidate);
      EXAMPLE_PROJECT_PENDING.delete(projectId);
      return candidate;
    })
    .catch((error) => {
      EXAMPLE_PROJECT_PENDING.delete(projectId);
      throw error;
    });

  EXAMPLE_PROJECT_PENDING.set(projectId, pending);
  return pending;
};

const mergeExampleTestSetup = (currentSetups = [], exampleSetup = null) => {
  if (!exampleSetup?.id) return Array.isArray(currentSetups) ? currentSetups : [];
  const nextSetups = Array.isArray(currentSetups) ? [...currentSetups] : [];
  const index = nextSetups.findIndex((setup) => (
    setup?.id === exampleSetup.id || setup?.name === exampleSetup.name
  ));
  if (index >= 0) nextSetups[index] = exampleSetup;
  else nextSetups.push(exampleSetup);
  return nextSetups;
};

const restoreExampleProject = async (projectId, { setTestSetups, loadFromLocalStorage }) => {
  const candidate = await loadExampleProjectData(projectId);
  if (!candidate) throw new Error(`Example project data not found for ${projectId}`);

  const currentSetups = typeof loadFromLocalStorage === 'function'
    ? loadFromLocalStorage('globalAppData_testSetups', [])
    : [];
  const previousSetup = currentSetups.find((setup) => setup?.name === candidate.project.selectedTestSetup?.name);
  const previousRefs = collectAttachmentRefs(previousSetup);

  clearProjectScopedLocalStorage(projectId);
  await clearTree(projectId);
  clearProjectDatasetName(projectId);
  clearProjectDatasetStats(projectId);

  const result = await commitProjectArchiveImport(candidate, projectId);
  const mergedSetups = mergeExampleTestSetup(currentSetups, result.project.selectedTestSetup);
  localStorage.setItem('globalAppData_testSetups', JSON.stringify(mergedSetups));
  setTestSetups?.(mergedSetups);
  await cleanupUnreferencedAttachmentRefs(previousRefs, [mergedSetups], {
    excludeGlobalTestSetups: true,
    excludeProjectIds: [projectId],
  });
  localStorage.setItem(getExampleSeedFlagKey(projectId), '1');
  return result.project;
};

export const isExampleProject = (projectId) => Boolean(projectId && EXAMPLE_PROJECTS[projectId]);
export const getExampleProjectIds = () => Object.keys(EXAMPLE_PROJECTS);
export const getExampleProjectData = (projectId) => EXAMPLE_PROJECT_CACHE.get(projectId)?.project || null;

// Archives are fetched only when an example is selected or reset.
export const useExampleProjects = () => ({ isExampleProject, getExampleProjectIds, getExampleProjectData });

export const resetExampleProject = async (projectId, options = {}) => {
  const { setTestSetups, loadFromLocalStorage, setSelectedDataset } = options;
  if (!isExampleProject(projectId)) throw new Error(`Project ${projectId} is not an example project`);

  try {
    await restoreExampleProject(projectId, { setTestSetups, loadFromLocalStorage });
    const root = await loadTree(projectId);
    if (root) {
      setProjectDatasetName(projectId, root.rootName || root.name || null);
      setProjectDatasetStats(projectId, root);
      setSelectedDataset?.(root);
    }
  } catch (error) {
    console.error('[useExampleProjects] resetExampleProject error', error);
    throw error;
  }
};

export const seedExampleProject = async (projectId, options = {}) => {
  const {
    setSelectedDataset,
    setProjectDatasetName: setDatasetName = setProjectDatasetName,
    setProjectDatasetStats: setDatasetStats = setProjectDatasetStats,
    clearProjectDatasetName: clearDatasetName = clearProjectDatasetName,
    clearProjectDatasetStats: clearDatasetStats = clearProjectDatasetStats,
    setTestSetups,
    loadFromLocalStorage,
  } = options;

  if (!isExampleProject(projectId) || localStorage.getItem(getExampleSeedFlagKey(projectId))) return;

  try {
    await restoreExampleProject(projectId, { setTestSetups, loadFromLocalStorage });
    const root = await loadTree(projectId);
    if (root) {
      setDatasetName(projectId, root.rootName || root.name || null);
      setDatasetStats(projectId, root);
      setSelectedDataset?.(root);
    } else {
      clearDatasetName(projectId);
      clearDatasetStats(projectId);
    }
  } catch (error) {
    console.error('[useExampleProjects] seedExampleProject error', error);
    throw error;
  }
};
