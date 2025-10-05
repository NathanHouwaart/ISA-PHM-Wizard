import React, { useEffect, useState, useRef } from 'react';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import { loadTree, clearTree, exportProject, importProject, saveTree } from '../../utils/indexedTreeStore';
import { directoryOpen } from 'browser-fs-access';
import IconToolTipButton from './IconTooltipButton';
import TooltipButton from './TooltipButton';
import FormField from '../Form/FormField';
import { Plus, Download, X, Edit, Folder, Trash, Trash2, Upload } from 'lucide-react';

export default function ProjectSessionsModal({ onClose }) {
  const { projects = [], switchProject, currentProjectId, createProject, deleteProject, renameProject, openExplorer, setSelectedDataset } = useGlobalDataContext();
  const [loadingMap, setLoadingMap] = useState({});
  const [trees, setTrees] = useState({});
  const [renameMap, setRenameMap] = useState({});
  const [progressMap, setProgressMap] = useState({});
  const [show, setShow] = useState(false);
  const fileRef = useRef(null);
  // default selection is the active project
  const [selectedCardId, setSelectedCardId] = useState(currentProjectId || null);

  // When a project card enters rename mode, focus its input so Enter or blur will commit
  useEffect(() => {
    const active = Object.keys(renameMap).find((k) => renameMap[k]);
    if (!active) return;
    // focus the underlying input rendered by FormField. Use a small timeout to ensure render.
    setTimeout(() => {
      const sel = document.querySelector(`input[name="project-${active}-name"]`);
      if (sel && typeof sel.focus === 'function') {
        sel.focus();
        try { sel.select(); } catch (e) { /* ignore */ }
      }
    }, 50);
  }, [renameMap]);

  // when modal opens, reset selection to the current project so it's obvious
  useEffect(() => {
    if (show) setSelectedCardId(currentProjectId || null);
  }, [show, currentProjectId]);

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
    // create a new project with a default name and open its inline rename
    const id = createProject(`Project ${projects.length + 1}`);
    setSelectedCardId(id);
    setRenameMap((m) => ({ ...m, [id]: true }));
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
    // open native directory picker and index the selected folder for the target project
    (async () => {
      try {
        setLoadingMap((m) => ({ ...m, [id]: true }));
        
        // Log when picker is initiated
        console.log('[ProjectSessionsModal] Opening directory picker...');
        const pickerStartTime = performance.now();
        
        // Request persistent permission so user doesn't need to grant permission again
        const files = await directoryOpen({ 
          recursive: true,
          mode: 'read'
        });
        
        // Log when picker returns with timing
        const pickerEndTime = performance.now();
        const pickerDuration = ((pickerEndTime - pickerStartTime) / 1000).toFixed(2);
        console.log(`[ProjectSessionsModal] Directory picker returned after ${pickerDuration}s with ${files ? files.length : 0} files`);
        
        if (!files || files.length === 0) {
          console.log('[ProjectSessionsModal] No files selected or picker was cancelled');
          setLoadingMap((m) => ({ ...m, [id]: false }));
          return;
        }

        // Warn user if dataset is very large (may cause performance issues)
        if (files.length > 50000) {
          const proceed = confirm(
            `This folder contains ${files.length.toLocaleString()} files. Indexing may take several minutes and could slow down your browser.\n\nDo you want to continue?`
          );
          if (!proceed) {
            setLoadingMap((m) => ({ ...m, [id]: false }));
            return;
          }
        }

        const rootName = files[0].webkitRelativePath ? files[0].webkitRelativePath.split('/')[0] : 'Root';
        const total = files.length;
        
        // initialize per-project progress
        console.log(`[ProjectSessionsModal] Starting indexing process for ${total.toLocaleString()} files from "${rootName}"`);
        const indexStartTime = performance.now();
        
        setProgressMap((m) => ({ ...m, [id]: { percent: 0, message: 'Preparing to index...' } }));
        const nodesByPath = new Map();
        nodesByPath.set('', { children: [] });

        let processed = 0;
        const BATCH_SIZE = 500; // Process files in batches to avoid blocking the UI

        // Helper to yield control back to the browser
        const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

        // Process files in batches with periodic yields
        for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
          const batchEnd = Math.min(batchStart + BATCH_SIZE, files.length);
          
          for (let i = batchStart; i < batchEnd; i++) {
            try {
              const f = files[i];
              const rel = f.webkitRelativePath || f.name;
              const parts = rel.split('/');
              let path = '';
              
              for (let j = 0; j < parts.length; j++) {
                const name = parts[j];
                const relPath = path ? `${path}/${name}` : name;
                if (!nodesByPath.has(relPath)) {
                  nodesByPath.set(relPath, { 
                    name, 
                    relPath, 
                    isDirectory: j < parts.length - 1, 
                    children: [] 
                  });
                  const parentPath = path;
                  const parent = nodesByPath.get(parentPath);
                  if (parent) parent.children.push(nodesByPath.get(relPath));
                }
                path = relPath;
              }
              processed += 1;
            } catch (fileErr) {
              // Log individual file errors but continue processing
              console.warn('[ProjectSessionsModal] skipping file due to error', fileErr);
              processed += 1;
            }
          }

          // Update progress after each batch
          const percent = Math.round((processed / total) * 100);
          const remaining = total - processed;
          setProgressMap((m) => ({ 
            ...m, 
            [id]: { 
              percent, 
              message: `Indexed ${processed.toLocaleString()} of ${total.toLocaleString()} files...` 
            } 
          }));

          // Yield to browser to keep UI responsive
          await yieldToMain();
        }

        // Sort nodes recursively
        setProgressMap((m) => ({ ...m, [id]: { percent: 95, message: 'Organizing file tree...' } }));
        await yieldToMain();

        function sortNodes(nodes) {
          return nodes
            .sort((a, b) => {
              if (a.isDirectory && !b.isDirectory) return -1;
              if (!a.isDirectory && b.isDirectory) return 1;
              return (a.name || '').localeCompare(b.name || '');
            })
            .map((n) => (n.isDirectory ? { ...n, children: sortNodes(n.children || []) } : n));
        }

        const tree = (nodesByPath.get('')?.children || []).map((n) => n);
        const dataset = { rootName, tree: sortNodes(tree) };

        // Save to IndexedDB
        setProgressMap((m) => ({ ...m, [id]: { percent: 98, message: 'Saving to database...' } }));
        await yieldToMain();
        
        const saveStartTime = performance.now();
        await saveTree(dataset, id);
        const saveEndTime = performance.now();
        const saveDuration = ((saveEndTime - saveStartTime) / 1000).toFixed(2);
        
        const indexEndTime = performance.now();
        const totalIndexDuration = ((indexEndTime - indexStartTime) / 1000).toFixed(2);
        
        console.log(`[ProjectSessionsModal] IndexedDB save completed in ${saveDuration}s`);
        console.log(`[ProjectSessionsModal] Total indexing time: ${totalIndexDuration}s for ${total.toLocaleString()} files`);
        console.log(`[ProjectSessionsModal] Average: ${(total / parseFloat(totalIndexDuration)).toFixed(0)} files/second`);
        
        // Update UI state
        setTrees((t) => ({ ...t, [id]: dataset }));
        
        // Mark complete
        setProgressMap((m) => ({ ...m, [id]: { percent: 100, message: 'Indexing complete!' } }));
        
        // Clear progress after a short delay
        setTimeout(() => setProgressMap((m) => { 
          const copy = { ...m }; 
          delete copy[id]; 
          return copy; 
        }), 1200);
      } catch (err) {
        console.error('[ProjectSessionsModal] pick/index error', err);
        console.error('[ProjectSessionsModal] Error details:', {
          name: err?.name,
          message: err?.message,
          stack: err?.stack
        });
        const errorMsg = err && err.name === 'NotFoundError' 
          ? 'The browser canceled the operation (possibly due to the large dataset size). Try selecting a smaller folder or closing other tabs to free up memory.'
          : `Failed to pick or index folder: ${err && err.message}`;
        alert(errorMsg);
      } finally {
        setLoadingMap((m) => ({ ...m, [id]: false }));
        // Ensure progress is cleared on error as well
        setProgressMap((m) => { 
          const copy = { ...m }; 
          if (copy[id] && copy[id].percent !== 100) delete copy[id]; 
          return copy; 
        });
      }
    })();
  }

  async function handleExportProject(id) {
    try {
      setLoadingMap((m) => ({ ...m, [id]: true }));
      const pkg = await exportProject(id);
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ProjectSessionsModal] export error', err);
      alert('Failed to export project: ' + (err && err.message));
    } finally {
      setLoadingMap((m) => ({ ...m, [id]: false }));
    }
  }

  async function handleImportFile(file) {
    try {
      const text = await file.text();
      const pkg = JSON.parse(text);
      const newId = createProject(pkg && pkg.projectId ? `${pkg.projectId}-copy` : `Imported Project`);
      await importProject(pkg, newId);
      // switch to new project
      switchProject(newId);
      setShow(false);
      onClose && onClose();
    } catch (err) {
      console.error('[ProjectSessionsModal] import error', err);
      alert('Failed to import project: ' + (err && err.message));
    }
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
            <div className="flex items-center gap-2">
              {/* hidden file input used by the import icon */}
              <input ref={fileRef} type="file" accept="application/json" onChange={(e) => { if (e.target.files && e.target.files[0]) handleImportFile(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />

              <>
                <IconToolTipButton icon={Plus} onClick={handleCreate} tooltipText="Create new project" />
                <IconToolTipButton icon={Download} onClick={() => fileRef.current && fileRef.current.click()} tooltipText="Import project" />
                <IconToolTipButton icon={X} onClick={() => { setShow(false); setTimeout(() => onClose && onClose(), 220); }} tooltipText="Close" />
              </>
            </div>
          </div>

          <div className="mt-6 grid gap-3 max-h-[50vh] overflow-y-auto">
            {projects.map((p, idx) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedCardId((cur) => (cur === p.id ? null : p.id))}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCardId((cur) => (cur === p.id ? null : p.id)); } }}
                className={`relative flex items-center justify-between p-5 rounded-lg border ${p.id === selectedCardId ? 'border-2 border-indigo-600 bg-indigo-50' : 'border-gray-100 bg-white'} cursor-pointer transform transition-all duration-200 hover:shadow-sm`}
                style={{
                  opacity: show ? 1 : 0,
                  transitionDelay: `${idx * 40}ms`
                }}
              >
                {/* full-card progress overlay (centered) */}
                {progressMap[p.id] ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center p-4 rounded-lg">
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-lg" />
                    <div className="relative w-3/4 max-w-md">
                      <div className="text-sm text-gray-700 mb-2 text-center">{progressMap[p.id].message}</div>
                      <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progressMap[p.id].percent}%` }} />
                      </div>
                      <div className="mt-2 text-xs text-gray-600 text-right">{progressMap[p.id].percent}%</div>
                    </div>
                  </div>
                ) : null}
                <div>
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-medium flex items-center gap-2">
                      {renameMap[p.id] ? (
                        <div className="w-64" onClick={(e) => e.stopPropagation()}>
                          <FormField
                            name={`project-${p.id}-name`}
                            value={p.name}
                            label={""}
                            placeholder={`Project ${projects.indexOf(p) + 1}`}
                            commitOnBlur={true}
                            onChange={(e) => {
                              // commit rename immediately when FormField commits on blur/enter
                              const v = e && e.target ? e.target.value : '';
                              renameProject(p.id, v.trim() || p.name);
                              setRenameMap((m) => ({ ...m, [p.id]: false }));
                            }}
                            className=""
                          />
                        </div>
                      ) : (
                        <div className="text-lg font-medium">{p.name}</div>
                      )}
                      <div className="text-sm text-gray-400">{p.id === currentProjectId ? '(active)' : ''}</div>
                    </div>
                    {/* rename control moved to the right action group to keep header clean */}
                  </div>
                  <div className="mt-1 grid grid-cols-12 gap-x-5 items-center">
                    <div className="col-span-3 text-sm font-medium text-gray-600">Dataset:</div>
                    <div className="col-span-9 text-sm text-gray-700">
                      {loadingMap[p.id] ? (
                        <span className="inline-flex items-center gap-2 text-sm text-indigo-600">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                          Indexing...
                        </span>
                      ) : (
                        (trees[p.id] ? (trees[p.id].rootName || trees[p.id].name || 'Indexed') : 'None')
                      )}
                    </div>
                  </div>

                  {/* Selected test setup and last-edited metadata (if available in localStorage) */}
                  {(() => {
                    try {
                      const setupIdRaw = localStorage.getItem(`globalAppData_${p.id}_selectedTestSetupId`);
                      const setupId = setupIdRaw ? JSON.parse(setupIdRaw) : null;
                      let setupName = null;
                      if (setupId) {
                        const setupsRaw = localStorage.getItem(`globalAppData_${p.id}_testSetups`);
                        const setups = setupsRaw ? JSON.parse(setupsRaw) : null;
                        if (Array.isArray(setups)) {
                          const s = setups.find((x) => x.id === setupId);
                          setupName = s ? s.name : null;
                        }
                      }
                      const lastEditedRaw = localStorage.getItem(`globalAppData_${p.id}_lastEdited`);
                      let lastEdited = null;
                      if (lastEditedRaw) {
                        try { lastEdited = new Date(JSON.parse(lastEditedRaw)); } catch (e) { try { lastEdited = new Date(lastEditedRaw); } catch (e2) { lastEdited = null; } }
                      }
                      const fmt = (d) => d instanceof Date && !isNaN(d) ? d.toLocaleString() : null;
                      return (
                        <div className="mt-1 relative">
                          {setupName ? (
                            <div className="grid grid-cols-12 gap-x-2 items-center">
                              <div className="col-span-3 text-sm font-medium text-gray-600">Test setup:</div>
                              <div className="col-span-9 text-sm text-gray-700">{setupName}</div>
                            </div>
                          ) : null}
                          {lastEdited ? <div className="text-xs text-gray-400 mt-1">Last edited: <span className="text-gray-600">{fmt(lastEdited)}</span></div> : null}

                          {/* progress overlay previously nested here was moved to cover the whole card */}
                        </div>
                      );
                    } catch (err) {
                      return null;
                    }
                  })()}
                </div>

                <div className="flex items-center gap-3">
                  {/* dataset actions group with label */}
                  <div className="flex flex-col items-center text-center">
                    <div className="text-xs text-gray-500 mb-1">Dataset</div>
                    <div className="flex items-center gap-1">
                      <IconToolTipButton icon={Folder} tooltipText="Edit dataset (pick folder)" onClick={(e) => { e.stopPropagation(); handleEditDataset(p.id); }} />
                      <IconToolTipButton icon={Trash} tooltipText="Delete indexed dataset" onClick={(e) => { e.stopPropagation(); handleDeleteDataset(p.id); }} />
                    </div>
                  </div>

                  {/* separator between groups */}
                  <div className="w-px h-10 bg-gray-200" />

                  {/* project actions group with label */}
                  <div className="flex flex-col items-center text-center">
                    <div className="text-xs text-gray-500 mb-1">Project</div>
                    <div className="flex items-center gap-1">
                      <IconToolTipButton icon={Upload} tooltipText="Export project as JSON" onClick={(e) => { e.stopPropagation(); handleExportProject(p.id); }} />
                      <IconToolTipButton icon={Edit} tooltipText="Rename project" onClick={(e) => { e.stopPropagation(); setRenameMap((m) => ({ ...m, [p.id]: true })); }} />
                      <IconToolTipButton icon={Trash2} tooltipText="Delete project" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">You can always change the active project later.</div>
              <div>
                {/* TooltipButton is used here; button is disabled (grayed) when no selection */}
                <TooltipButton tooltipText={selectedCardId ? 'Select project and continue' : 'Select a project to continue'} onClick={() => { if (selectedCardId) handleSelect(selectedCardId); }} disabled={!selectedCardId} className={selectedCardId ? '' : 'bg-gray-200 text-gray-700'}>
                  Select project
                </TooltipButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
