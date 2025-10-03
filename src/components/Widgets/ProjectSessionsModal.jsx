import React, { useEffect, useState } from 'react';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import { loadTree, clearTree } from '../../utils/indexedTreeStore';

export default function ProjectSessionsModal({ onClose }) {
  const { projects = [], switchProject, currentProjectId, createProject, deleteProject, renameProject, openExplorer, setSelectedDataset } = useGlobalDataContext();
  const [loadingMap, setLoadingMap] = useState({});
  const [trees, setTrees] = useState({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    let mounted = true;
    // animate in
    requestAnimationFrame(() => setShow(true));
    // load dataset rootName for each project
    (async () => {
      const map = {};
      for (const p of projects) {
        try {
          setLoadingMap((m) => ({ ...m, [p.id]: true }));
          const tree = await loadTree(p.id);
          if (!mounted) return;
          map[p.id] = tree;
        } catch (err) {
          map[p.id] = null;
        } finally {
          setLoadingMap((m) => ({ ...m, [p.id]: false }));
        }
      }
      if (mounted) setTrees(map);
    })();
    return () => { mounted = false; };
  }, [projects]);

  function handleSelect(id) {
    // animate out then switch
    setShow(false);
    setTimeout(() => {
      switchProject(id);
      onClose && onClose();
    }, 240);
  }

  function handleCreate() {
    const name = newName.trim() || `Project ${projects.length + 1}`;
    const id = createProject(name);
    setNewName('');
    setCreating(false);
    // immediately switch to the new project and close
    setShow(false);
    setTimeout(() => {
      switchProject(id);
      onClose && onClose();
    }, 240);
  }

  function handleDelete(id) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    if (!confirm(`Delete project "${p.name}"? This will remove its local state (this does not affect other projects).`)) return;
    deleteProject(id);
  }

  async function handleDeleteDataset(id) {
    // remove the dataset stored for this project
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    if (!confirm(`Delete dataset for project "${p.name}"? This will remove the indexed files for this project.`)) return;
    try {
      setLoadingMap((m) => ({ ...m, [id]: true }));
      await clearTree(id);
      // if currently active project, clear in-memory selectedDataset
      if (currentProjectId === id) {
        try { setSelectedDataset(null); } catch (e) { /* ignore */ }
      }
      setTrees((t) => ({ ...t, [id]: null }));
    } catch (err) {
      console.error('[ProjectSessionsModal] delete dataset error', err);
      alert('Failed to delete dataset: ' + (err && err.message));
    } finally {
      setLoadingMap((m) => ({ ...m, [id]: false }));
    }
  }

  function handleEditDataset(id) {
    // ensure project is active then open in-app explorer for editing/adding
    setShow(false);
    setTimeout(() => {
      switchProject(id);
      // clear any in-memory selection so the explorer works off the project's data
      try { setSelectedDataset(null); } catch (e) { /* ignore */ }
      // open the explorer UI (mounted in the questionnaire)
      try { openExplorer(); } catch (e) { console.warn('openExplorer not available', e); }
      onClose && onClose();
    }, 240);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* blurred backdrop */}
      <div className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`} />

      <div className="relative z-60 w-full max-w-4xl mx-4">
  <div className={`bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 transform transition-all duration-300 ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ minHeight: '60vh' }}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-semibold">Select a project session</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xl">Choose which project you want to work on. You can create, rename or delete projects here. Click a project to open it.</p>
            </div>
            <div>
              <button onClick={() => { setShow(false); setTimeout(() => onClose && onClose(), 220); }} className="text-gray-500 hover:text-gray-700">Close</button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 max-h-[50vh] overflow-y-auto">
            {projects.map((p, idx) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(p.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(p.id); } }}
                className={`relative flex items-center justify-between p-5 rounded-lg border border-gray-100 bg-white cursor-pointer transform transition-all duration-200 ${p.id === currentProjectId ? 'ring-2 ring-indigo-200 shadow-md' : 'hover:-translate-y-1 hover:shadow-lg'}`}
                style={{
                  opacity: show ? 1 : 0,
                  transitionDelay: `${idx * 40}ms`
                }}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-medium">{p.name}</div>
                    <div className="text-sm text-gray-400">{p.id === currentProjectId ? '(active)' : ''}</div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Dataset: {loadingMap[p.id] ? 'Loading…' : (trees[p.id] ? (trees[p.id].rootName || trees[p.id].name || 'Indexed') : 'None')}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleEditDataset(p.id); }} className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-sm">Edit dataset</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteDataset(p.id); }} className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded text-sm">Delete dataset</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="px-2 py-1 bg-red-50 text-red-600 rounded text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {creating ? (
                <>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Project name" className="px-4 py-2 border rounded-lg" />
                  <button onClick={handleCreate} className="px-4 py-2 bg-green-500 text-white rounded-lg">Create</button>
                  <button onClick={() => setCreating(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                </>
              ) : (
                <button onClick={() => setCreating(true)} className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg">+ New Project</button>
              )}
            </div>

            <div className="text-sm text-gray-500">You can always change the active project later.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
