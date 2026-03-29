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
import { hasContentChanged } from './testSetupUtils';
import { decodeJsonFromStorage } from './storageCodec';
import {
  buildProjectScopedStorageKey,
  getImportableProjectSuffixFromStorageKey
} from '../contexts/storageKeyPolicy';

// DB name and initialization: assume a clean slate - no migration from older DBs.
const DB_NAME = 'isa_phm_tree_db_v2';
const db = new Dexie(DB_NAME);

// New DB schema: compound primary key projectId+path
db.version(1).stores({
  // use Dexie's compound primary key syntax: '&[projectId+path]'
  nodes: '&[projectId+path], projectId, parentPath, updatedAt'
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
  return String(p).replace(/^\/+|\/+$/g, '');
}

function parentPathOf(path) {
  const normalized = normPath(path);
  if (!normalized) return '';
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) return '';
  return normalized.slice(0, lastSlash);
}

function isValidSchemaVersionPayload(rawValue) {
  const { exists, value } = decodeJsonFromStorage(rawValue);
  if (!exists) return false;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0;
}

function collectImportableProjectLocalStorageWrites(pkg, targetProjectId) {
  const writes = [];
  if (!pkg?.localStorage || typeof pkg.localStorage !== 'object') {
    return writes;
  }

  const sourceProjectId = typeof pkg.projectId === 'string' ? pkg.projectId : '';

  for (const key of Object.keys(pkg.localStorage)) {
    const suffix = getImportableProjectSuffixFromStorageKey(key, sourceProjectId);
    if (!suffix) continue;

    const rawValue = pkg.localStorage[key];
    if (typeof rawValue !== 'string') continue;

    if (suffix === 'schemaVersion' && !isValidSchemaVersionPayload(rawValue)) {
      continue;
    }

    writes.push({
      key: buildProjectScopedStorageKey(targetProjectId, suffix),
      value: rawValue
    });
  }

  return writes;
}

function buildSelectedTestSetupWrite(selectedTestSetup) {
  if (!selectedTestSetup || !selectedTestSetup.id) return null;

  const { value: decodedSetups } = decodeJsonFromStorage(localStorage.getItem('globalAppData_testSetups'));
  const setups = Array.isArray(decodedSetups) ? decodedSetups : [];
  const exists = setups.some((setup) => setup && setup.id === selectedTestSetup.id);
  if (exists) return null;

  const merged = [...setups, selectedTestSetup];
  return {
    key: 'globalAppData_testSetups',
    value: JSON.stringify(merged)
  };
}

function applyLocalStorageWritesWithRollback(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return () => {};
  }

  const previousValues = new Map();
  const touchedKeys = [];

  const capturePreviousValue = (key) => {
    if (previousValues.has(key)) return;
    previousValues.set(key, localStorage.getItem(key));
    touchedKeys.push(key);
  };

  const rollback = () => {
    for (let index = touchedKeys.length - 1; index >= 0; index -= 1) {
      const key = touchedKeys[index];
      const previous = previousValues.get(key);
      if (previous === null || previous === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, previous);
      }
    }
  };

  try {
    entries.forEach(({ key, value }) => {
      if (typeof key !== 'string' || key.length === 0) return;
      capturePreviousValue(key);
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    });
  } catch (err) {
    try {
      rollback();
    } catch (rollbackErr) {
      console.warn('[indexedTreeStore] import localStorage rollback error', rollbackErr);
    }
    throw err;
  }

  return rollback;
}

// saveTree: write the root node and create lightweight directory stubs for children
export async function saveTree(rootNode, projectId = 'example-project') {
  if (!rootNode || typeof rootNode !== 'object') throw new Error('rootNode required');
  // If projectId is null or undefined, skip operation (all projects deleted)
  if (!projectId) {
    console.debug('[indexedTreeStore] saveTree skipped: projectId is null');
    return false;
  }
  
  try {
    await db.transaction('rw', 'nodes', async () => {
      const rootPath = '';
      const now = Date.now();
      await db.nodes.put({
        projectId,
        path: rootPath,
        parentPath: '',
        compressed: compress(rootNode),
        updatedAt: now,
        meta: { childrenLoaded: true }
      });

      if (Array.isArray(rootNode.children)) {
        const ops = [];
        for (const child of rootNode.children) {
          const childPath = normPath(child.relPath || child.name || null);
          if (!childPath) continue;
          const stub = {
            name: child.name,
            relPath: childPath,
            isDirectory: !!child.isDirectory,
            childrenLoaded: false
          };
          ops.push(db.nodes.put({
            projectId,
            path: childPath,
            parentPath: parentPathOf(childPath),
            compressed: compress(stub),
            updatedAt: now,
            meta: { childrenLoaded: false }
          }));
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
export async function loadTree(projectId = 'example-project') {
  // If projectId is null or undefined, return null (all projects deleted)
  if (!projectId) {
    console.debug('[indexedTreeStore] loadTree skipped: projectId is null');
    return null;
  }
  
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
export async function loadSubtree(path, projectId = 'example-project') {
  // If projectId is null or undefined, return null (all projects deleted)
  if (!projectId) {
    console.debug('[indexedTreeStore] loadSubtree skipped: projectId is null');
    return null;
  }
  
  const p = normPath(path);
  try {
    const rec = await db.nodes.get({ projectId, path: p });
    if (!rec) return null;
    const node = decompress(rec.compressed);

    if (node.isDirectory && node.childrenLoaded === false) {
      let childRecords = await db.nodes
        .where('parentPath')
        .equals(p)
        .and((record) => record.projectId === projectId)
        .toArray();
      childRecords = childRecords.filter((record) => record.path !== p);

      // Backward-compat fallback for records created before parentPath was populated.
      if (childRecords.length === 0) {
        const prefix = p === '' ? '' : `${p}/`;
        const all = await db.nodes.where({ projectId }).toArray();
        childRecords = all.filter((record) => {
          if (!record.path) return false;
          if (record.path === p) return false;
          if (record.path.indexOf(prefix) !== 0) return false;
          const rest = prefix === '' ? record.path : record.path.slice(prefix.length);
          return rest.indexOf('/') === -1;
        });
      }

      const children = [];
      for (const record of childRecords) {
        try {
          const childNode = decompress(record.compressed);
          children.push(childNode);
        } catch (err) {
          console.warn('[indexedTreeStore] skipping child decompress error', record.path, err);
        }
      }
      node.children = children;
      node.childrenLoaded = true;
      await db.nodes.put({
        projectId,
        path: p,
        parentPath: parentPathOf(p),
        compressed: compress(node),
        updatedAt: Date.now(),
        meta: { childrenLoaded: true }
      });
    }

    return node;
  } catch (err) {
    console.error('[indexedTreeStore] loadSubtree error', err);
    throw err;
  }
}

// Utility: remove tree entirely
export async function clearTree(projectId = 'example-project') {
  // If projectId is null or undefined, skip operation (all projects deleted)
  if (!projectId) {
    console.debug('[indexedTreeStore] clearTree skipped: projectId is null');
    return true;
  }
  
  try {
    // remove only records for this project
    await db.nodes.where('projectId').equals(projectId).delete();
    return true;
  } catch (err) {
    console.error('[indexedTreeStore] clearTree error', err);
    throw err;
  }
}

// Export all nodes and per-project localStorage keys for a given projectId.
// Export only the selected test setup (if any) rather than all test setups.
export async function exportProject(projectId = 'example-project', options = {}) {
  // If projectId is null or undefined, throw error (cannot export nothing)
  if (!projectId) {
    throw new Error('Cannot export project: projectId is null or undefined');
  }
  
  try {
    const providedProjectName = typeof options?.projectName === 'string'
      ? options.projectName.trim()
      : '';
    let projectName = providedProjectName || '';

    // If caller did not provide a name, try to resolve it from the global project catalog.
    if (!projectName) {
      try {
        const projectsRaw = localStorage.getItem('globalAppData_projects');
        const projects = projectsRaw ? JSON.parse(projectsRaw) : [];
        if (Array.isArray(projects)) {
          const project = projects.find((entry) => entry?.id === projectId);
          if (project?.name && typeof project.name === 'string') {
            projectName = project.name.trim();
          }
        }
      } catch (e) {
        console.warn('[indexedTreeStore] export projectName lookup error', e);
      }
    }

    const nodes = await db.nodes.where('projectId').equals(projectId).toArray();
    // collect per-project localStorage entries
    const ls = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`globalAppData_${projectId}_`)) {
          try { ls[key] = localStorage.getItem(key); } catch (e) { /* ignore */ }
        }
      }
    } catch (err) {
      console.warn('[indexedTreeStore] localStorage read error', err);
    }

    // Export only the selected test setup (from selectedTestSetupId) if present.
    // Read global testSetups and per-project selectedTestSetupId, then filter to one setup.
    let selectedSetup = null;
    try {
      const selectedIdRaw = localStorage.getItem(`globalAppData_${projectId}_selectedTestSetupId`);
      const selectedId = selectedIdRaw ? JSON.parse(selectedIdRaw) : null;
      if (selectedId) {
        const { value: setups } = decodeJsonFromStorage(localStorage.getItem('globalAppData_testSetups'));
        if (Array.isArray(setups)) {
          const s = setups.find((x) => x.id === selectedId);
          if (s) selectedSetup = s;
        }
      }
    } catch (e) {
      console.warn('[indexedTreeStore] export selected test setup error', e);
    }

    return {
      exportedAt: Date.now(),
      projectId,
      projectName: projectName || projectId,
      nodes: nodes.map((r) => ({ path: r.path, compressed: r.compressed, parentPath: r.parentPath, updatedAt: r.updatedAt, meta: r.meta })),
      localStorage: ls,
      selectedTestSetup: selectedSetup  // single setup or null
    };
  } catch (err) {
    console.error('[indexedTreeStore] exportProject error', err);
    throw err;
  }
}

// Import a project package into the DB under targetProjectId. The package format
// should be the object produced by exportProject(). Returns an object with status and optional conflict info.
// Appends the imported test setup to the global testSetups list if not already present.
// If a conflict is detected (same UUID, different version), returns conflict details for UI resolution.
// 
// @param pkg - The project package to import
// @param targetProjectId - The ID to assign to the imported project
// @param options - Optional configuration: { skipConflictCheck: boolean }
export async function importProject(pkg, targetProjectId, options = {}) {
  if (!pkg || !Array.isArray(pkg.nodes)) throw new Error('invalid project package');
  
  // Check for test setup conflicts BEFORE importing anything (unless explicitly skipped)
  let conflict = null;
  if (!options.skipConflictCheck && pkg.selectedTestSetup && pkg.selectedTestSetup.id) {
    try {
      const { value: decodedSetups } = decodeJsonFromStorage(localStorage.getItem('globalAppData_testSetups'));
      let setups = Array.isArray(decodedSetups) ? decodedSetups : [];
      
      const existing = setups.find((s) => s && s.id === pkg.selectedTestSetup.id);
      if (existing) {
        // Same UUID found - check if content differs (excluding version metadata)
        if (hasContentChanged(existing, pkg.selectedTestSetup)) {
          const existingVersion = existing.version ?? 0;
          const importedVersion = pkg.selectedTestSetup.version ?? 0;
          const existingModified = existing.lastModified ?? 0;
          const importedModified = pkg.selectedTestSetup.lastModified ?? 0;
          
          conflict = {
            setupId: pkg.selectedTestSetup.id,
            setupName: pkg.selectedTestSetup.name || 'Unnamed Test Setup',
            local: { version: existingVersion, lastModified: existingModified, setup: existing },
            imported: { version: importedVersion, lastModified: importedModified, setup: pkg.selectedTestSetup }
          };
          // Return early with conflict info - UI will handle resolution
          return { success: false, conflict, targetProjectId };
        }
      }
    } catch (e) {
      console.warn('[indexedTreeStore] conflict detection error', e);
      // If conflict detection fails, proceed with import
    }
  }
  
  // No conflict - proceed with import
  let rollbackLocalStorage = null;
  try {
    const localStorageWrites = collectImportableProjectLocalStorageWrites(pkg, targetProjectId);
    const selectedTestSetupWrite = buildSelectedTestSetupWrite(pkg.selectedTestSetup);
    if (selectedTestSetupWrite) {
      localStorageWrites.push(selectedTestSetupWrite);
    }

    rollbackLocalStorage = applyLocalStorageWritesWithRollback(localStorageWrites);

    await db.transaction('rw', 'nodes', async () => {
      const ops = [];
      for (const n of pkg.nodes) {
        const now = n.updatedAt || Date.now();
        ops.push(db.nodes.put({ projectId: targetProjectId, path: n.path || '', compressed: n.compressed || null, parentPath: n.parentPath || '', updatedAt: now, meta: n.meta || {} }));
      }
      await Promise.all(ops);
    });

    return { success: true, targetProjectId };
  } catch (err) {
    if (rollbackLocalStorage) {
      try {
        rollbackLocalStorage();
      } catch (rollbackErr) {
        console.warn('[indexedTreeStore] importProject rollback error', rollbackErr);
      }
    }
    console.error('[indexedTreeStore] importProject error', err);
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
