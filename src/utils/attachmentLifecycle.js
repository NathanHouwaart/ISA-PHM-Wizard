import { deleteDatasheetFile, getAllDatasheetFiles } from './datasheetStore';
import { deleteImageFile, getAllImageFiles } from './imageStore';
import { decodeJsonFromStorage } from './storageCodec';
import { parseManagedProjectScopedKey } from '../contexts/storageKeyPolicy';

const GLOBAL_TEST_SETUPS_KEY = 'globalAppData_testSetups';

export const createAttachmentRefs = () => ({
  datasheets: new Set(),
  images: new Set(),
});

export const cloneAttachmentRefs = (refs) => ({
  datasheets: new Set(refs?.datasheets || []),
  images: new Set(refs?.images || []),
});

export const collectAttachmentRefs = (value) => {
  const refs = createAttachmentRefs();
  const visit = (current) => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!current || typeof current !== 'object') return;

    if (current.datasheet?.attachmentId && !current.datasheet.notAvailable) {
      refs.datasheets.add(current.datasheet.attachmentId);
    }
    if (Array.isArray(current.images)) {
      current.images.forEach((image) => {
        if (image?.attachmentId) refs.images.add(image.attachmentId);
      });
    }
    Object.values(current).forEach(visit);
  };
  visit(value);
  return refs;
};

export const mergeAttachmentRefs = (target, source) => {
  source?.datasheets?.forEach((id) => target.datasheets.add(id));
  source?.images?.forEach((id) => target.images.add(id));
  return target;
};

export const subtractAttachmentRefs = (source, excluded) => ({
  datasheets: new Set(
    [...(source?.datasheets || [])].filter((id) => !excluded?.datasheets?.has(id))
  ),
  images: new Set(
    [...(source?.images || [])].filter((id) => !excluded?.images?.has(id))
  ),
});

export const cleanupAttachmentRefs = async (refs) => {
  await Promise.all([
    ...[...(refs?.datasheets || [])].map((id) => deleteDatasheetFile(id)),
    ...[...(refs?.images || [])].map((id) => deleteImageFile(id)),
  ]);
};

export const collectPersistedAttachmentRefs = ({
  excludeGlobalTestSetups = false,
  excludeProjectIds = [],
  storage = typeof window !== 'undefined' ? window.localStorage : null,
} = {}) => {
  const refs = createAttachmentRefs();
  if (!storage) return refs;
  const excludedProjects = new Set(excludeProjectIds.filter(Boolean));

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    const isGlobalTestSetups = key === GLOBAL_TEST_SETUPS_KEY;
    const projectKeyInfo = parseManagedProjectScopedKey(key);
    const isConfigurationTypes = projectKeyInfo?.suffix === 'configurationTypes';
    if (!isGlobalTestSetups && !isConfigurationTypes) continue;
    if (isGlobalTestSetups && excludeGlobalTestSetups) continue;
    if (isConfigurationTypes && excludedProjects.has(projectKeyInfo.projectId)) continue;

    const decoded = decodeJsonFromStorage(storage.getItem(key));
    if (decoded.exists && decoded.value !== undefined) {
      mergeAttachmentRefs(refs, collectAttachmentRefs(decoded.value));
    }
  }
  return refs;
};

export const cleanupUnreferencedAttachmentRefs = async (
  candidates,
  retainedValues = [],
  persistedOptions = {}
) => {
  const retainedRefs = collectAttachmentRefs(retainedValues);
  mergeAttachmentRefs(retainedRefs, collectPersistedAttachmentRefs(persistedOptions));
  const unreferenced = subtractAttachmentRefs(candidates, retainedRefs);
  await cleanupAttachmentRefs(unreferenced);
  return unreferenced;
};

export const garbageCollectOrphanedAttachments = async ({
  gracePeriodMs = 24 * 60 * 60 * 1000,
  now = Date.now(),
  ...persistedOptions
} = {}) => {
  const [datasheets, images] = await Promise.all([
    getAllDatasheetFiles(),
    getAllImageFiles(),
  ]);
  const isOldEnough = (attachment) => (
    Number(attachment?.updatedAt || 0) <= now - gracePeriodMs
  );
  const storedRefs = {
    datasheets: new Set(datasheets.filter(isOldEnough).map((attachment) => attachment.id)),
    images: new Set(images.filter(isOldEnough).map((attachment) => attachment.id)),
  };
  const retainedRefs = collectPersistedAttachmentRefs(persistedOptions);
  const orphanedRefs = subtractAttachmentRefs(storedRefs, retainedRefs);
  await cleanupAttachmentRefs(orphanedRefs);
  return orphanedRefs;
};

export const getAttachmentCommitCleanup = (initial, seen, finalRefs) => {
  const cleanup = subtractAttachmentRefs(initial, finalRefs);
  const addedDuringEdit = subtractAttachmentRefs(seen, initial);
  mergeAttachmentRefs(cleanup, subtractAttachmentRefs(addedDuringEdit, finalRefs));
  return cleanup;
};

export const getAttachmentRollbackCleanup = (initial, seen) => (
  subtractAttachmentRefs(seen, initial)
);
