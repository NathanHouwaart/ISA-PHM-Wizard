import { deleteDatasheetFile } from './datasheetStore';
import { deleteImageFile } from './imageStore';

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

export const getAttachmentCommitCleanup = (initial, seen, finalRefs) => {
  const cleanup = subtractAttachmentRefs(initial, finalRefs);
  const addedDuringEdit = subtractAttachmentRefs(seen, initial);
  mergeAttachmentRefs(cleanup, subtractAttachmentRefs(addedDuringEdit, finalRefs));
  return cleanup;
};

export const getAttachmentRollbackCleanup = (initial, seen) => (
  subtractAttachmentRefs(seen, initial)
);
