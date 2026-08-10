import Dexie from 'dexie';

const db = new Dexie('isa_phm_datasheets_db_v1');
db.version(1).stores({
  attachments: '&id, updatedAt',
});

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

export const deleteDatasheetFile = async (id) => {
  if (id) await db.attachments.delete(id);
};
