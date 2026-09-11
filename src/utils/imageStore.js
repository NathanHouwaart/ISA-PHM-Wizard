import db from './attachmentDatabase';

export const saveImageFile = async ({ id, file }) => {
  await db.images.put({
    id,
    file,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    updatedAt: Date.now(),
  });
};

export const getImageFile = async (id) => db.images.get(id);

export const getAllImageFiles = async () => db.images.toArray();

export const deleteImageFile = async (id) => {
  if (id) await db.images.delete(id);
};
