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
