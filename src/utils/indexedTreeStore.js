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

const DB_NAME = 'isa_phm_tree_db_v1';
const STORE_NAME = 'nodes';

const db = new Dexie(DB_NAME);

// Initial schema (v1) then v2 adds parentPath index for efficient subtree queries.
db.version(1).stores({
  nodes: '&path, updatedAt'
});

// v2: add parentPath index and migrate existing records to populate parentPath
db.version(2).stores({
  nodes: '&path,parentPath,updatedAt'
}).upgrade(async (tx) => {
  // Populate parentPath for existing records (path may be '')
  await tx.table('nodes').toCollection().modify((item) => {
    try {
      const p = item.path || '';
      if (p === '') {
        item.parentPath = '';
      } else {
        const idx = p.lastIndexOf('/');
        item.parentPath = idx === -1 ? '' : p.slice(0, idx);
      }
    } catch (err) {
      // if any item fails, leave parentPath undefined; it'll be handled later
      item.parentPath = item.parentPath || '';
    }
  });
});

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
export async function saveTree(rootNode) {
  if (!rootNode || typeof rootNode !== 'object') throw new Error('rootNode required');
  try {
    // Use Dexie transaction with callback to ensure proper storeNames resolution
    await db.transaction('rw', 'nodes', async () => {
      // write root node fully
      const rootPath = '';
      const now = Date.now();
      await db.nodes.put({ path: rootPath, compressed: compress(rootNode), updatedAt: now, meta: { childrenLoaded: true } });

      // recursively save only top-level directory stubs to enable lazy loading
      if (Array.isArray(rootNode.children)) {
        const ops = [];
        for (const child of rootNode.children) {
          const childPath = child.relPath || child.name || null;
          if (!childPath) continue;
          const stub = { name: child.name, relPath: child.relPath, isDirectory: !!child.isDirectory, childrenLoaded: false };
          ops.push(db.nodes.put({ path: normPath(child.relPath), compressed: compress(stub), updatedAt: now, meta: { childrenLoaded: false } }));
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
export async function loadTree() {
  try {
    const rec = await db.nodes.get('');
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
export async function loadSubtree(path) {
  const p = normPath(path);
  try {
    const rec = await db.nodes.get(p);
    if (!rec) return null;
    const node = decompress(rec.compressed);

    // if node is a directory and childrenLoaded === false then try to load direct children
    if (node.isDirectory && node.childrenLoaded === false) {
      // query for keys that start with p + '/'
      const prefix = p === '' ? '' : p + '/';
      // Dexie doesn't provide startsWith by default on arbitrary index; we'll iterate all keys
      const all = await db.nodes.toArray();
      const children = [];
      for (const r of all) {
        if (!r.path) continue;
        if (r.path === p) continue;
        if (r.path.indexOf(prefix) !== 0) continue;
        // direct children only: path without prefix should not contain '/'
        const rest = prefix === '' ? r.path : r.path.slice(prefix.length);
        if (rest.indexOf('/') !== -1) continue; // not a direct child
        try {
          const childNode = decompress(r.compressed);
          children.push(childNode);
        } catch (err) {
          // if decompress fails, skip that child
          console.warn('[indexedTreeStore] skipping child decompress error', r.path, err);
        }
      }
      node.children = children;
      node.childrenLoaded = true;
      // write back the expanded node so next time it's loaded fully
      await db.nodes.put({ path: p, compressed: compress(node), updatedAt: Date.now(), meta: { childrenLoaded: true } });
    }

    return node;
  } catch (err) {
    console.error('[indexedTreeStore] loadSubtree error', err);
    throw err;
  }
}

// Utility: remove tree entirely
export async function clearTree() {
  try {
    await db.nodes.clear();
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
