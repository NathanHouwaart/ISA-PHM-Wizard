import Dexie from 'dexie';

const db = new Dexie('isa_phm_datasheets_db_v1');

db.version(1).stores({
  attachments: '&id, updatedAt',
});

db.version(2).stores({
  attachments: '&id, updatedAt',
  images: '&id, updatedAt',
});

export default db;

export const saveAttachmentBatch = async ({ datasheets = [], images = [] } = {}) => {
  await db.transaction('rw', db.attachments, db.images, async () => {
    if (datasheets.length) await db.attachments.bulkPut(datasheets);
    if (images.length) await db.images.bulkPut(images);
  });
};
