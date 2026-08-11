import db from './attachmentDatabase';

export const saveDatasheetFile = async ({ id, file }) => {
  await db.attachments.put({
    id,
    file,
    fileName: file.name,
    mimeType: file.type || 'application/pdf',
    size: file.size,
    updatedAt: Date.now(),
  });
};

export const getDatasheetFile = async (id) => db.attachments.get(id);

export const getAllDatasheetFiles = async () => db.attachments.toArray();

export const deleteDatasheetFile = async (id) => {
  if (id) await db.attachments.delete(id);
};
