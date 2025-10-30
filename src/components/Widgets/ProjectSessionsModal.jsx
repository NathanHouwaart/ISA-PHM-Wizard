import React, { useEffect, useState, useRef } from 'react';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import { exportProject, importProject } from '../../utils/indexedTreeStore';
import IconToolTipButton from './IconTooltipButton';
import TooltipButton from './TooltipButton';
import ProjectCard from './ProjectCard';
import TestSetupConflictDialog from './TestSetupConflictDialog';
import AlertDecisionDialog from './AlertDecisionDialog';
import { Plus, Download, Folder } from 'lucide-react';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import { v4 as uuidv4 } from 'uuid';

/**
 * ProjectSessionsModal Component
 * 
 * Modal for managing project sessions.
 * Dataset operations are now handled by the useProjectDataset hook via ProjectCardWithDataset.
 * 
 * @see ProjectCardWithDataset for dataset management
 * @see useProjectDataset hook for dataset operations (indexing, deleting, metadata)
 */
export default function ProjectSessionsModal({ onClose }) {
  const { projects = [], switchProject, currentProjectId, createProject, deleteProject, renameProject, resetProject, DEFAULT_PROJECT_ID, setTestSetups } = useGlobalDataContext();
  const [renameMap, setRenameMap] = useState({});
  const [show, setShow] = useState(false);
  const fileRef = useRef(null);
  const [selectedCardId, setSelectedCardId] = useState(currentProjectId || null);
  const [pendingImport, setPendingImport] = useState(null); // { pkg, newProjectId, conflict }
  const [dialogConfig, setDialogConfig] = useState(null);
  const [resetTriggers, setResetTriggers] = useState({}); // { [projectId]: timestamp }

  const showDialog = (config) => {
    const {
      onConfirm: confirmHandler,
      onCancel: cancelHandler,
      showCancel = true,
      ...rest
    } = config || {};

    setDialogConfig({
      tone: 'info',
      confirmLabel: 'OK',
      cancelLabel: 'Cancel',
      showCancel,
      ...rest,
      onConfirm: () => {
        setDialogConfig(null);
        if (typeof confirmHandler === 'function') {
          confirmHandler();
        }
      },
      onCancel: () => {
        setDialogConfig(null);
        if (typeof cancelHandler === 'function') {
          cancelHandler();
        }
      }
    });
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
        try { sel.select(); } catch { /* ignore */ }
      }
    }, 50);
  }, [renameMap]);

  // when modal opens, reset selection to the current project so it's obvious
  useEffect(() => {
    if (show) setSelectedCardId(currentProjectId || null);
  }, [show, currentProjectId]);

  // animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
  }, []);

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
    const project = projects.find((x) => x.id === id);
    if (!project) return;
    showDialog({
      tone: 'danger',
      title: `Delete project "${project.name}"?`,
      message: "This action removes the project's local state. Other projects are not affected.",
      confirmLabel: 'Delete project',
      confirmTooltip: `Delete ${project.name} from this workspace`,
      cancelLabel: 'Cancel',
      cancelTooltip: 'Keep project',
      onConfirm: () => deleteProject(id),
    });
  }

  async function handleExportProject(id) {
    const project = projects.find((x) => x.id === id);
    try {
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
      showDialog({
        tone: 'danger',
        title: 'Unable to export project',
        message: `We could not export${project ? ` "${project.name}"` : ''}. ${err && err.message ? err.message : 'Please try again.'}`,
        confirmLabel: 'Retry export',
        confirmTooltip: 'Try exporting the project again',
        cancelLabel: 'Cancel',
        cancelTooltip: 'Dismiss this message',
        onConfirm: () => handleExportProject(id),
      });
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
      showDialog({
        tone: 'danger',
        title: 'Unable to import project',
        message: `We could not import${file && file.name ? ` "${file.name}"` : ' the selected file'}. ${err && err.message ? err.message : 'Check that the file is a valid project export.'}`,
        confirmLabel: 'Retry import',
        confirmTooltip: 'Try importing the file again',
        cancelLabel: 'Cancel',
        cancelTooltip: 'Dismiss this message',
        onConfirm: () => handleImportFile(file),
      });
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
      
      // Note: Dataset tree will be loaded automatically by useProjectDataset hook
      // when the new project card is rendered
      
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
        // Also ensure the package's localStorage snapshot (if present) points the project's
        // selectedTestSetupId to the new UUID so importProject doesn't later overwrite it
        const modifiedPkg = {
          ...pkg,
          selectedTestSetup: newSetup,
          localStorage: { ...(pkg.localStorage || {}) }
        };

        // Update the package-local localStorage entry that will be restored by importProject
        const originalSelectedKey = `globalAppData_${pkg.projectId}_selectedTestSetupId`;
        // Store JSON-stringified id because exportProject saved raw localStorage values (strings)
        modifiedPkg.localStorage[originalSelectedKey] = JSON.stringify(newSetup.id);

        // Also set the per-project selectedTestSetupId in the current runtime localStorage
        // (this will be overwritten by importProject unless the package localStorage contains
        // the updated value, which we ensured above).
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
    const currentPending = pendingImport;
    showDialog({
      tone: 'danger',
      title: 'Import conflict not resolved',
      message: `${err && err.message ? err.message : 'Something went wrong while applying your choice.'} You can try again or cancel the import.`,
      confirmLabel: 'Try again',
      confirmTooltip: 'Attempt the selected resolution again',
      cancelLabel: 'Cancel import',
      cancelTooltip: 'Cancel import and discard the imported project',
      onConfirm: () => handleConflictResolution(resolution),
      onCancel: () => {
        if (currentPending && currentPending.newProjectId) {
          deleteProject(currentPending.newProjectId);
        }
        setPendingImport(null);
      },
    });
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
              projects.map((p, idx) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  isSelected={selectedCardId === p.id}
                  isActive={p.id === currentProjectId}
                  isDefault={p.id === DEFAULT_PROJECT_ID}
                  isRenaming={renameMap[p.id]}
                  resetTrigger={resetTriggers[p.id]}
                  onSelect={() => setSelectedCardId((cur) => (cur === p.id ? null : p.id))}
                  onRename={(newName) => {
                    renameProject(p.id, newName);
                    setRenameMap((m) => ({ ...m, [p.id]: false }));
                  }}
                  onToggleRename={() => setRenameMap((m) => ({ ...m, [p.id]: !m[p.id] }))}
                  onDelete={() => handleDelete(p.id)}
                  onExport={() => handleExportProject(p.id)}
                  onReset={p.id === DEFAULT_PROJECT_ID ? () => {
                    showDialog({
                      tone: 'warning',
                      title: 'Reset default project?',
                      message: "This will overwrite the default project's local settings and dataset with the starter data.",
                      confirmLabel: 'Reset project',
                      confirmTooltip: 'Restore the default project to its initial state',
                      cancelLabel: 'Cancel',
                      cancelTooltip: 'Keep current project data',
                      onConfirm: async () => {
                        await resetProject(p.id);
                        // Trigger ProjectCard to refresh its dataset
                        setResetTriggers((prev) => ({ ...prev, [p.id]: Date.now() }));
                        setTimeout(() => {
                          showDialog({
                            tone: 'success',
                            title: 'Default project reset',
                            message: 'The default project has been restored to its initial configuration.',
                            confirmLabel: 'OK',
                            confirmTooltip: 'Close dialog',
                            showCancel: false,
                          });
                        }, 0);
                      },
                    });
                  } : undefined}
                  index={idx}
                  animationVisible={show}
                />
              ))
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
    {dialogConfig ? (
      <AlertDecisionDialog open {...dialogConfig} />
    ) : null}
    </>
  );
}
