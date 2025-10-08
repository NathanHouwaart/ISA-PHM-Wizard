import React, { useEffect, useState, useRef } from 'react';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import { loadTree, clearTree, exportProject, importProject, saveTree } from '../../utils/indexedTreeStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import IconToolTipButton from './IconTooltipButton';
import TooltipButton from './TooltipButton';
import ProjectCard from './ProjectCard';
import TestSetupConflictDialog from './TestSetupConflictDialog';
import { Plus, Download, Folder } from 'lucide-react';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import { v4 as uuidv4 } from 'uuid';

export default function ProjectSessionsModal({ onClose }) {
  const { projects = [], switchProject, currentProjectId, createProject, deleteProject, renameProject, setSelectedDataset, resetProject, DEFAULT_PROJECT_ID, setTestSetups } = useGlobalDataContext();
  const [loadingMap, setLoadingMap] = useState({});
  const [trees, setTrees] = useState({});
  const [renameMap, setRenameMap] = useState({});
  const [progressMap, setProgressMap] = useState({});
  const [projectMetadata, setProjectMetadata] = useState({}); // { [projectId]: { setupName, lastEdited } }
  const [show, setShow] = useState(false);
  const fileRef = useRef(null);
  const [selectedCardId, setSelectedCardId] = useState(currentProjectId || null);
  const [activeIndexingProjectId, setActiveIndexingProjectId] = useState(null);
  const [pendingImport, setPendingImport] = useState(null); // { pkg, newProjectId, conflict }
  const fileSystem = useFileSystem();

  // Helper function to extract project metadata from localStorage
  const loadProjectMetadata = (projectId) => {
    try {
      const setupIdRaw = localStorage.getItem(`globalAppData_${projectId}_selectedTestSetupId`);
      const setupId = setupIdRaw ? JSON.parse(setupIdRaw) : null;
      let setupName = null;
      
      if (setupId) {
        const setupsRaw = localStorage.getItem(`globalAppData_testSetups`);
        const setups = setupsRaw ? JSON.parse(setupsRaw) : null;
        if (Array.isArray(setups)) {
          const s = setups.find((x) => x.id === setupId);
          setupName = s ? s.name : null;
        }
      }
      
      const lastEditedRaw = localStorage.getItem(`globalAppData_${projectId}_lastEdited`);
      let lastEdited = null;
      if (lastEditedRaw) {
        try { 
          lastEdited = new Date(JSON.parse(lastEditedRaw)); 
        } catch (_e) { 
          try { 
            lastEdited = new Date(lastEditedRaw); 
          } catch (_e2) { 
            lastEdited = null; 
          } 
        }
      }
      
      return { setupName, lastEdited };
    } catch (_err) {
      console.error('[ProjectSessionsModal] Error loading metadata for project', projectId, _err);
      return { setupName: null, lastEdited: null };
    }
  };

  // When a project card enters rename mode, focus its input so Enter or blur will commit
  useEffect(() => {
    const active = Object.keys(renameMap).find((k) => renameMap[k]);
    if (!active) return;
    // focus the underlying input rendered by FormField. Use a small timeout to ensure render.
    setTimeout(() => {
      const sel = document.querySelector(`input[name="project-${active}-name"]`);
      if (sel && typeof sel.focus === 'function') {
        sel.focus();
        try { sel.select(); } catch (_e) { /* ignore */ }
      }
    }, 50);
  }, [renameMap]);

  // when modal opens, reset selection to the current project so it's obvious
  useEffect(() => {
    if (show) setSelectedCardId(currentProjectId || null);
  }, [show, currentProjectId]);

  // Sync file system hook progress with project-specific progress map
  useEffect(() => {
    if (activeIndexingProjectId && fileSystem.progress) {
      setProgressMap((m) => ({
        ...m,
        [activeIndexingProjectId]: fileSystem.progress
      }));
    }
  }, [fileSystem.progress, activeIndexingProjectId]);

  useEffect(() => {
    let mounted = true;
    // animate in
    requestAnimationFrame(() => setShow(true));
    // load dataset rootName and metadata for each project
    (async () => {
      const treeMap = {};
      const metaMap = {};
      for (const p of projects) {
        try {
          setLoadingMap((m) => ({ ...m, [p.id]: true }));
          const tree = await loadTree(p.id);
          if (!mounted) return;
          treeMap[p.id] = tree;
          
          // Load metadata from localStorage
          const meta = loadProjectMetadata(p.id);
          metaMap[p.id] = meta;
        } catch (err) {
          treeMap[p.id] = null;
          metaMap[p.id] = { setupName: null, lastEdited: null };
        } finally {
          setLoadingMap((m) => ({ ...m, [p.id]: false }));
        }
      }
      if (mounted) {
        setTrees(treeMap);
        setProjectMetadata(metaMap);
      }
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
    // Open directory picker and index the selected folder for the target project
    (async () => {
      try {
        setLoadingMap((m) => ({ ...m, [id]: true }));
        setActiveIndexingProjectId(id);

        console.log('[ProjectSessionsModal] Starting directory indexing for project:', id);
        const indexStartTime = performance.now();

        // Use the file system hook to pick and index the directory
        const dataset = await fileSystem.pickAndIndexDirectory((progress) => {
          // Update progress for this specific project
          if (progress.current || progress.processed) {
            setProgressMap((m) => {
              const current = m[id] || { percent: 0, message: '' };
              const newProgress = { ...current };

              if (fileSystem.progress.percent !== undefined) {
                newProgress.percent = fileSystem.progress.percent;
              }
              if (fileSystem.progress.message) {
                newProgress.message = fileSystem.progress.message;
              }

              return { ...m, [id]: newProgress };
            });
          }
        });

        if (!dataset) {
          console.log('[ProjectSessionsModal] User cancelled directory picker');
          setLoadingMap((m) => ({ ...m, [id]: false }));
          setActiveIndexingProjectId(null);
          return;
        }

        // Save to IndexedDB
        setProgressMap((m) => ({ ...m, [id]: { percent: 98, message: 'Saving to database...' } }));

        const saveStartTime = performance.now();
        await saveTree(dataset, id);
        const saveEndTime = performance.now();
        const saveDuration = ((saveEndTime - saveStartTime) / 1000).toFixed(2);

        const indexEndTime = performance.now();
        const totalIndexDuration = ((indexEndTime - indexStartTime) / 1000).toFixed(2);

        console.log(`[ProjectSessionsModal] IndexedDB save completed in ${saveDuration}s`);
        console.log(`[ProjectSessionsModal] Total indexing time: ${totalIndexDuration}s`);

        // Update UI state
        setTrees((t) => ({ ...t, [id]: dataset }));

        // If this is the currently active project, update the global selectedDataset
        if (id === currentProjectId) {
          console.log('[ProjectSessionsModal] Updating selectedDataset for active project');
          setSelectedDataset(dataset);
        }

        // Mark complete
        setProgressMap((m) => ({ ...m, [id]: { percent: 100, message: 'Indexing complete!' } }));

        // Clear progress after a short delay
        setTimeout(() => {
          setProgressMap((m) => {
            const copy = { ...m };
            delete copy[id];
            return copy;
          });
          setActiveIndexingProjectId(null);
        }, 1200);
      } catch (err) {
        console.error('[ProjectSessionsModal] pick/index error', err);
        console.error('[ProjectSessionsModal] Error details:', {
          name: err?.name,
          message: err?.message,
          stack: err?.stack
        });

        let errorMsg;
        if (err && err.name === 'NotAllowedError') {
          errorMsg = 'Permission denied. Please grant access to the folder.';
        } else if (err && err.name === 'NotFoundError') {
          errorMsg = 'The operation was canceled by the browser.\n\nThis can happen with very large folders in Chrome. Try:\n• Selecting a smaller folder\n• Using Firefox instead (better for large datasets)\n• Closing other browser tabs to free memory\n• Restarting your browser';
        } else if (err && err.name === 'AbortError') {
          errorMsg = 'Operation was cancelled.';
        } else {
          errorMsg = `Failed to index folder: ${err && err.message}`;
        }

        alert(errorMsg);

        setActiveIndexingProjectId(null);
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
      
      // Attempt import - this may return a conflict
      const result = await importProject(pkg, newId);
      
      if (result.conflict) {
        // Conflict detected - store pending import and show resolution dialog
        setPendingImport({ pkg, newProjectId: newId, conflict: result.conflict });
        return;
      }
      
      // No conflict - complete the import
      await completeImport(newId);
    } catch (err) {
      console.error('[ProjectSessionsModal] import error', err);
      alert('Failed to import project: ' + (err && err.message));
    }
  }

  async function completeImport(newId) {
    try {
      // Reload the global testSetups from localStorage to reflect the newly imported test setup
      const setupsRaw = localStorage.getItem('globalAppData_testSetups');
      const setups = setupsRaw ? JSON.parse(setupsRaw) : [];
      if (Array.isArray(setups)) {
        setTestSetups(setups);
      }
      
      // Load the tree for the new project
      try {
        const tree = await loadTree(newId);
        setTrees((t) => ({ ...t, [newId]: tree }));
      } catch (e) {
        setTrees((t) => ({ ...t, [newId]: null }));
      }
      
      setSelectedCardId(newId);
      setRenameMap((m) => ({ ...m, [newId]: true }));
    } catch (err) {
      console.error('[ProjectSessionsModal] completeImport error', err);
    }
  }

  async function handleConflictResolution(resolution) {
    if (!pendingImport) return;
    
    const { pkg, newProjectId, conflict } = pendingImport;
    
    try {
      const setupsRaw = localStorage.getItem('globalAppData_testSetups');
      let setups = setupsRaw ? JSON.parse(setupsRaw) : [];
      if (!Array.isArray(setups)) setups = [];
      
      if (resolution === 'keep-local') {
        // Keep local version - import the project data but don't modify the test setup
        // The imported project will reference the existing test setup by ID
        await importProject(pkg, newProjectId, { skipConflictCheck: true });
        await completeImport(newProjectId);
        
      } else if (resolution === 'use-imported') {
        // Replace local version with imported version
        const index = setups.findIndex((s) => s && s.id === conflict.setupId);
        if (index !== -1) {
          setups[index] = conflict.imported.setup;
          localStorage.setItem('globalAppData_testSetups', JSON.stringify(setups));
          
          // Also update the global context's testSetups state if available
          if (typeof setTestSetups === 'function') {
            setTestSetups([...setups]);
          }
        }
        // Now import the project data
        await importProject(pkg, newProjectId, { skipConflictCheck: true });
        await completeImport(newProjectId);
        
      } else if (resolution === 'keep-both') {
        // Create new test setup with new UUID for imported version
        const newSetup = {
          ...conflict.imported.setup,
          id: uuidv4(),
          name: `${conflict.imported.setup.name} (imported)`
        };
        setups.push(newSetup);
        localStorage.setItem('globalAppData_testSetups', JSON.stringify(setups));
        
        // Update the global context's testSetups state if available
        if (typeof setTestSetups === 'function') {
          setTestSetups([...setups]);
        }
        
        // Update the imported package to reference the new setup ID
        const modifiedPkg = {
          ...pkg,
          selectedTestSetup: newSetup
        };
        
        // Update the project's selectedTestSetupId to point to the new setup
        const selectedIdKey = `globalAppData_${newProjectId}_selectedTestSetupId`;
        localStorage.setItem(selectedIdKey, JSON.stringify(newSetup.id));
        
        // Now import the project data with the modified package
        await importProject(modifiedPkg, newProjectId, { skipConflictCheck: true });
        await completeImport(newProjectId);
      }
      
      // Clear pending import state
      setPendingImport(null);
      
    } catch (err) {
      console.error('[ProjectSessionsModal] conflict resolution error', err);
      alert('Failed to resolve conflict: ' + (err && err.message));
      setPendingImport(null);
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* blurred backdrop */}
      <div className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`} />

      <div className="relative z-60 w-full max-w-4xl mx-4">
        <div className={`bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 transform transition-all duration-300 ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ minHeight: '60vh' }}>
          <div className="flex items-start justify-between">
            <div>
              <Heading3>
                Select a project session
              </Heading3>
              <Paragraph className=" text-gray-500 mt-1 max-w-xl">
                Choose which project you want to work on. You can create, rename or delete projects here. You must select a project to continue.
              </Paragraph>
            </div>
            <div className="flex items-center gap-2">
              {/* hidden raw file input used by the import icon */}
              <input ref={fileRef} type="file" accept="application/json" onChange={(e) => { if (e.target.files && e.target.files[0]) handleImportFile(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />
              
              <IconToolTipButton icon={Plus} onClick={handleCreate} tooltipText="Create new project" />
              <IconToolTipButton icon={Download} onClick={() => fileRef.current && fileRef.current.click()} tooltipText="Import project" />
              {/* Close button removed: users must select a project to close the modal */}
            </div>
          </div>

          <div className="mt-6 grid gap-3 max-h-[50vh] overflow-y-auto">
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-gray-300">
                  <Folder className="w-20 h-20 mx-auto" aria-hidden />
                </div>
                <h3 className="mt-6 text-xl font-semibold">No projects found</h3>
                <p className="mt-2 text-sm text-gray-500 max-w-lg text-center">There are no projects in your workspace. Start by creating a new project using the + button above, or import an existing project.</p>
                <div className="mt-6">
                  <TooltipButton tooltipText="Create new project" onClick={handleCreate} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg">
                    Create a project
                  </TooltipButton>
                </div>
              </div>
            ) : (
              projects.map((p, idx) => {
                const metadata = projectMetadata[p.id] || { setupName: null, lastEdited: null };
                return (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    isSelected={selectedCardId === p.id}
                    isActive={p.id === currentProjectId}
                    isDefault={p.id === DEFAULT_PROJECT_ID}
                    tree={trees[p.id]}
                    loading={loadingMap[p.id]}
                    progress={progressMap[p.id]}
                    isRenaming={renameMap[p.id]}
                    setupName={metadata.setupName}
                    lastEdited={metadata.lastEdited}
                    onSelect={() => setSelectedCardId((cur) => (cur === p.id ? null : p.id))}
                    onRename={(newName) => {
                      renameProject(p.id, newName);
                      setRenameMap((m) => ({ ...m, [p.id]: false }));
                    }}
                    onToggleRename={() => setRenameMap((m) => ({ ...m, [p.id]: !m[p.id] }))}
                    onDelete={() => handleDelete(p.id)}
                    onEditDataset={() => handleEditDataset(p.id)}
                    onDeleteDataset={() => handleDeleteDataset(p.id)}
                    onExport={() => handleExportProject(p.id)}
                    onReset={p.id === DEFAULT_PROJECT_ID ? () => {
                      if (confirm('Reset the default project to its original state? This will overwrite its local settings and dataset.')) {
                        resetProject(p.id);
                        alert('Default project reset.');
                      }
                    } : undefined}
                    index={idx}
                    animationVisible={show}
                  />
                );
              })
            )}
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
    
    {/* Conflict Resolution Dialog */}
    {pendingImport && pendingImport.conflict && (
      <TestSetupConflictDialog
        conflict={pendingImport.conflict}
        onResolve={handleConflictResolution}
        onCancel={() => {
          // Cancel the import - delete the created project
          if (pendingImport.newProjectId) {
            deleteProject(pendingImport.newProjectId);
          }
          setPendingImport(null);
        }}
      />
    )}
    </>
  );
}
