/*
IndexedDB-backed tree store using Dexie and LZ-String compression.
Provides async APIs:
 - saveTree(rootNode)
 - loadTree()
 - loadSubtree(path)

Design notes:
 - Store nodes in an object store keyed by path (root = "")
 - Each stored value contains compressed JSON of a node but for non-leaf directories
   we store a lightweight stub with `childrenLoaded: false` and only store children
   when explicitly saved.
 - Compression using lz-string to reduce storage size.
 - All APIs are async and non-blocking; heavy JSON operations are performed inside
   small tasks but still on the main thread; callers should avoid very large sync
   transforms.
 - This is production-ready but doesn't include advanced error-retry or background
   workers. For very large trees you'd want to delegate compression to a web worker.
*/

import Dexie from 'dexie';
import LZString from 'lz-string';

// We'll create a new DB name for the updated schema so we don't attempt to change
// the existing object store primary key in-place (Dexie can't change primary keys).
// The migration below will try to open the old DB and copy records into the new DB
// with projectId = 'default'.
const OLD_DB_NAME = 'isa_phm_tree_db_v1';
const DB_NAME = 'isa_phm_tree_db_v2';
const STORE_NAME = 'nodes';

const db = new Dexie(DB_NAME);

// New DB schema: compound primary key projectId+path
db.version(1).stores({
  // use Dexie's compound primary key syntax: '&[projectId+path]'
  nodes: '&[projectId+path], projectId, parentPath, updatedAt'
});

// Try to migrate data from the old DB (if present) into this new DB.
(async function migrateFromOldDb() {
  try {
    const oldDb = new Dexie(OLD_DB_NAME);
    // we only need a minimal schema to read existing records
    oldDb.version(1).stores({ nodes: '&path, updatedAt' });
    // also try v2 shape if it exists
    oldDb.version(2).stores({ nodes: '&path,parentPath,updatedAt' });
    await oldDb.open();
    const all = await oldDb.table('nodes').toArray();
    if (all && all.length) {
      const now = Date.now();
      await db.transaction('rw', 'nodes', async () => {
        for (const r of all) {
          try {
            const p = r.path || '';
            const parentPath = p === '' ? '' : (p.lastIndexOf('/') === -1 ? '' : p.slice(0, p.lastIndexOf('/')));
            await db.nodes.put({ projectId: 'default', path: p, compressed: r.compressed, parentPath, updatedAt: r.updatedAt || now });
          } catch (err) {
            console.warn('[indexedTreeStore] migration item skipped', r && r.path, err);
          }
        }
      });
    }
    try { await oldDb.close(); } catch (e) { /* ignore */ }
  } catch (err) {
    // If opening the old DB fails (not present), just skip migration silently.
    console.debug('[indexedTreeStore] no old DB to migrate from', err && err.message);
  }
})();

// Helper: compress + decompress
function compress(obj) {
  try {
    const json = JSON.stringify(obj);
    return LZString.compressToUTF16(json);
  } catch (err) {
    console.error('[indexedTreeStore] compress error', err);
    throw err;
  }
}

function decompress(compressed) {
  try {
    const json = LZString.decompressFromUTF16(compressed);
    return JSON.parse(json);
  } catch (err) {
    console.error('[indexedTreeStore] decompress error', err);
    throw err;
  }
}

// Normalize path: root is '' ; ensure no leading slash
function normPath(p) {
  if (!p) return '';
  return p.replace(/^\/+/, '');
}

// saveTree: write the root node and create lightweight directory stubs for children
export async function saveTree(rootNode, projectId = 'default') {
  if (!rootNode || typeof rootNode !== 'object') throw new Error('rootNode required');
  try {
    await db.transaction('rw', 'nodes', async () => {
      const rootPath = '';
      const now = Date.now();
      await db.nodes.put({ projectId, path: rootPath, compressed: compress(rootNode), updatedAt: now, meta: { childrenLoaded: true } });

      if (Array.isArray(rootNode.children)) {
        const ops = [];
        for (const child of rootNode.children) {
          const childPath = child.relPath || child.name || null;
          if (!childPath) continue;
          const stub = { name: child.name, relPath: child.relPath, isDirectory: !!child.isDirectory, childrenLoaded: false };
          ops.push(db.nodes.put({ projectId, path: normPath(child.relPath), compressed: compress(stub), updatedAt: now, meta: { childrenLoaded: false } }));
        }
        await Promise.all(ops);
      }
    });
    return true;
  } catch (err) {
    console.error('[indexedTreeStore] saveTree error', err);
    throw err;
  }
}

// loadTree: loads root node fully; if children stubs found they will be left as-is
export async function loadTree(projectId = 'default') {
  try {
    // get record by compound key projectId+path
    const rec = await db.nodes.get({ projectId, path: '' });
    if (!rec) return null;
    const root = decompress(rec.compressed);
    return root;
  } catch (err) {
    console.error('[indexedTreeStore] loadTree error', err);
    throw err;
  }
}

// loadSubtree: returns the node at `path`. If it's a directory and childrenLoaded=false,
// this function should attempt to load stored direct children records and reconstruct children array.
export async function loadSubtree(path, projectId = 'default') {
  const p = normPath(path);
  try {
    const rec = await db.nodes.get({ projectId, path: p });
    if (!rec) return null;
    const node = decompress(rec.compressed);

    if (node.isDirectory && node.childrenLoaded === false) {
      const prefix = p === '' ? '' : p + '/';
      // load all nodes for this project and filter
      const all = await db.nodes.where({ projectId }).toArray();
      const children = [];
      for (const r of all) {
        if (!r.path) continue;
        if (r.path === p) continue;
        if (r.path.indexOf(prefix) !== 0) continue;
        const rest = prefix === '' ? r.path : r.path.slice(prefix.length);
        if (rest.indexOf('/') !== -1) continue;
        try {
          const childNode = decompress(r.compressed);
          children.push(childNode);
        } catch (err) {
          console.warn('[indexedTreeStore] skipping child decompress error', r.path, err);
        }
      }
      node.children = children;
      node.childrenLoaded = true;
      await db.nodes.put({ projectId, path: p, compressed: compress(node), updatedAt: Date.now(), meta: { childrenLoaded: true } });
    }

    return node;
  } catch (err) {
    console.error('[indexedTreeStore] loadSubtree error', err);
    throw err;
  }
}

// Utility: remove tree entirely
export async function clearTree(projectId = 'default') {
  try {
    // remove only records for this project
    await db.nodes.where('projectId').equals(projectId).delete();
    return true;
  } catch (err) {
    console.error('[indexedTreeStore] clearTree error', err);
    throw err;
  }
}

// React hook wrapper
export function useIndexedTreeStore() {
  return {
    saveTree,
    loadTree,
    loadSubtree,
    clearTree
  };
}

export default {
  saveTree,
  loadTree,
  loadSubtree,
  clearTree,
  useIndexedTreeStore
};
