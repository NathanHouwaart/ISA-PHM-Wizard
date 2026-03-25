import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useProjectActions, useProjectData } from '../../contexts/GlobalDataContext';
import { exportProject, importProject } from '../../utils/indexedTreeStore';
import { decodeJsonFromStorage } from '../../utils/storageCodec';
import IconToolTipButton from './IconTooltipButton';
import TooltipButton from './TooltipButton';
import ProjectCard from './ProjectCard';
import TestSetupConflictDialog from './TestSetupConflictDialog';
import AlertDecisionDialog from './AlertDecisionDialog';
import {
  Plus,
  Download,
  Layers3,
  HardDrive,
  Repeat,
  FlaskRound,
  Pencil,
  Upload,
  RefreshCw,
  Trash2
} from 'lucide-react';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import generateId from '../../utils/generateId';
import { DEFAULT_EXPERIMENT_TYPE_ID } from '../../constants/experimentTypes';
import ProjectConfigurationWizard from './ProjectConfigurationWizard';
import ProjectNameDialog from '../ProjectConfiguration/ProjectNameDialog';
import ProjectTemplateDialog from '../ProjectConfiguration/ProjectTemplateDialog';
import ProjectDatasetDialog from '../ProjectConfiguration/ProjectDatasetDialog';
import ProjectTestSetupDialog from '../ProjectConfiguration/ProjectTestSetupDialog';
import IconTooltipButton from './IconTooltipButton';

const ActionGroup = ({ label, children, wrap = true }) => (
  <div className="flex items-center gap-3 pr-4 mr-4 border-r border-gray-200 last:mr-0 last:pr-0 last:border-none">
    <span className="text-xs uppercase tracking-wide font-semibold text-gray-500 whitespace-nowrap">{label}</span>
    <div className={`flex gap-2 ${wrap ? 'flex-wrap' : 'flex-nowrap'}`}>{children}</div>
  </div>
);

const sanitizeFileName = (value) => {
  const source = typeof value === 'string' ? value : '';
  return source
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeProjectName = (value) => {
  const source = typeof value === 'string' ? value : '';
  return source.trim().toLocaleLowerCase();
};

const resolveImportedProjectName = (requestedName, existingProjects = []) => {
  const baseName = (typeof requestedName === 'string' && requestedName.trim())
    ? requestedName.trim()
    : 'Imported Project';
  const usedNames = new Set(
    (Array.isArray(existingProjects) ? existingProjects : [])
      .map((project) => normalizeProjectName(project?.name))
      .filter(Boolean)
  );

  if (!usedNames.has(normalizeProjectName(baseName))) {
    return baseName;
  }

  const copyName = `${baseName} (copy)`;
  if (!usedNames.has(normalizeProjectName(copyName))) {
    return copyName;
  }

  let index = 2;
  while (usedNames.has(normalizeProjectName(`${baseName} (${index})`))) {
    index += 1;
  }
  return `${baseName} (${index})`;
};

const ProjectActionToolbar = ({
  isDefault,
  onOpenDataset,
  onOpenTemplate,
  onOpenTestSetup,
  onOpenName,
  onExport,
  onReset,
  onDelete
}) => (
  <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm overflow-x-auto">
    <div className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">Project configuration</p>
      <div className="flex items-center gap-0 whitespace-nowrap">
        <ActionGroup label="Dataset">
          <IconTooltipButton
            icon={HardDrive}
          tooltipText="Pick, replace, or remove the dataset for this project"
          onClick={onOpenDataset}
        />
      </ActionGroup>
      <ActionGroup label="Experiment">
        <IconTooltipButton
          icon={Repeat}
          tooltipText="Choose how many runs/files belong in each study"
          onClick={onOpenTemplate}
        />
      </ActionGroup>
      <ActionGroup label="Test setup">
        <IconTooltipButton
          icon={FlaskRound}
          tooltipText="Select or change the test setup for this project"
          onClick={onOpenTestSetup}
        />
      </ActionGroup>
      <ActionGroup label="Project" wrap={false}>
        <IconTooltipButton
          icon={Pencil}
          tooltipText="Rename project"
          onClick={onOpenName}
        />
        <IconTooltipButton
          icon={Upload}
          tooltipText="Export project"
          onClick={onExport}
        />
        {isDefault ? (
          <IconTooltipButton
            icon={RefreshCw}
            tooltipText="Reset project to defaults"
            onClick={onReset}
          />
        ) : (
          <IconTooltipButton
            icon={Trash2}
            tooltipText="Delete project"
            onClick={onDelete}
          />
        )}
      </ActionGroup>
    </div>
    </div>
  </div>
);

export default function ProjectSessionsModal({ onClose }) {
  const { projects = [], currentProjectId, DEFAULT_PROJECT_ID, MULTI_RUN_EXAMPLE_PROJECT_ID } = useProjectData();
  const { switchProject, createProject, deleteProject, resetProject, setTestSetups } = useProjectActions();
  
  const [show, setShow] = useState(false);
  const fileRef = useRef(null);
  const [selectedCardId, setSelectedCardId] = useState(currentProjectId || null);
  const [pendingImport, setPendingImport] = useState(null); // { pkg, newProjectId, conflict }
  const [dialogConfig, setDialogConfig] = useState(null);
  const [resetTriggers, setResetTriggers] = useState({}); // { [projectId]: timestamp }
  const [wizardConfig, setWizardConfig] = useState({ open: false, projectId: null, initialStep: 0 });
  const [pendingProjectId, setPendingProjectId] = useState(null);
  const [sectionDialog, setSectionDialog] = useState({ type: null, projectId: null });

  const visibleProjects = pendingProjectId
    ? projects.filter((p) => p.id !== pendingProjectId)
    : projects;
  const selectedProject = selectedCardId
    ? visibleProjects.find((p) => p.id === selectedCardId) || null
    : null;

  useEffect(() => {
    if (visibleProjects.length === 0) {
      if (selectedCardId) {
        setSelectedCardId(null);
      }
      return;
    }
    if (selectedCardId && visibleProjects.some((p) => p.id === selectedCardId)) {
      return;
    }
    setSelectedCardId(visibleProjects[0].id);
  }, [visibleProjects, selectedCardId]);

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

  // when modal opens, reset selection to the current project so it's obvious
  useEffect(() => {
    if (show) setSelectedCardId(currentProjectId || null);
  }, [show, currentProjectId]);

  // animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
  }, []);

  const handleSelect = useCallback((id) => {
    // animate out then switch
    setShow(false);
    setTimeout(() => {
      switchProject(id);
      onClose && onClose();
    }, 240);
  }, [switchProject, onClose]);

  const openWizardForProject = useCallback((projectId, initialStep = 0) => {
    if (!projectId) return;
    setWizardConfig({ open: true, projectId, initialStep });
  }, []);

  const hideWizard = useCallback(() => {
    setWizardConfig({ open: false, projectId: null, initialStep: 0 });
  }, []);

  const handleWizardCancel = useCallback((projectId) => {
    if (pendingProjectId && projectId === pendingProjectId) {
      deleteProject(projectId);
      setPendingProjectId(null);
      setSelectedCardId((prev) => (prev === projectId ? currentProjectId || null : prev));
    }
    hideWizard();
  }, [pendingProjectId, deleteProject, currentProjectId, hideWizard, setSelectedCardId]);

  const handleWizardComplete = useCallback((projectId) => {
    if (!projectId) {
      hideWizard();
      return;
    }
    if (pendingProjectId && projectId === pendingProjectId) {
      setPendingProjectId(null);
      setSelectedCardId(projectId);
    }
    setResetTriggers((prev) => ({ ...prev, [projectId]: Date.now() }));
    hideWizard();
  }, [pendingProjectId, hideWizard, setSelectedCardId]);

  const handleProjectMetaChange = useCallback((projectId) => {
    if (!projectId) return;
    setResetTriggers((prev) => ({ ...prev, [projectId]: Date.now() }));
  }, []);

  const handleCreate = useCallback(() => {
    const defaultName = `Project ${projects.length + 1}`;
    const newId = createProject(defaultName, DEFAULT_EXPERIMENT_TYPE_ID);
    setPendingProjectId(newId);
    openWizardForProject(newId, 0);
  }, [projects.length, createProject, openWizardForProject]);

  const handleDelete = useCallback((id) => {
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
  }, [projects, deleteProject]);

  const handleExportProject = useCallback(async (id) => {
    const project = projects.find((x) => x.id === id);
    try {
      const pkg = await exportProject(id, { projectName: project?.name });
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileBaseName = sanitizeFileName(project?.name || pkg?.projectName || id) || 'project-export';
      a.download = `${fileBaseName} ISA-PHM.json`;
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
  }, [projects]);

  const completeImport = useCallback(async (newId) => {
    try {
      // Reload the global testSetups from localStorage to reflect the newly imported test setup
      const { value: setups } = decodeJsonFromStorage(localStorage.getItem('globalAppData_testSetups'));
      if (Array.isArray(setups)) {
        setTestSetups(setups);
      }
      
      // Note: Dataset tree will be loaded automatically by useProjectDataset hook
      // when the new project card is rendered
      
      setSelectedCardId(newId);
    } catch (err) {
      console.error('[ProjectSessionsModal] completeImport error', err);
    }
  }, [setTestSetups]);

  const handleImportFile = useCallback(async (file) => {
    try {
      const text = await file.text();
      const pkg = JSON.parse(text);
      const requestedName = (
        (typeof pkg?.projectName === 'string' && pkg.projectName.trim()) ||
        (typeof pkg?.projectId === 'string' && pkg.projectId.trim()) ||
        'Imported Project'
      );
      const importName = resolveImportedProjectName(requestedName, projects);
      const newId = createProject(
        importName,
        pkg?.experimentType || DEFAULT_EXPERIMENT_TYPE_ID
      );
      
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
  }, [createProject, completeImport, projects]);

  async function handleConflictResolution(resolution) {
    if (!pendingImport) return;
    
    const { pkg, newProjectId, conflict } = pendingImport;
    
    try {
      const { value: decodedSetups } = decodeJsonFromStorage(localStorage.getItem('globalAppData_testSetups'));
      let setups = Array.isArray(decodedSetups) ? decodedSetups : [];
      
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
          id: generateId(),
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

      <div className="relative z-60 w-full max-w-6xl mx-4">
        <div className={`bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 transform transition-all duration-300 ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ minHeight: '70vh' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Heading3 className="text-2xl">Project sessions</Heading3>
              <Paragraph className="text-gray-500 mt-1 max-w-2xl">
                Manage your projects, inspect their metadata, and launch focused editors for datasets, experiment templates, and test setups.
              </Paragraph>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="application/json" onChange={(e) => { if (e.target.files && e.target.files[0]) handleImportFile(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />
              <IconToolTipButton icon={Plus} onClick={handleCreate} tooltipText="Create new project" />
              <IconToolTipButton icon={Download} onClick={() => fileRef.current && fileRef.current.click()} tooltipText="Import project" />
            </div>
          </div>

          {visibleProjects.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center py-12 text-center border border-dashed border-gray-300 rounded-2xl">
              <Layers3 className="w-16 h-16 text-gray-300" />
              <h3 className="mt-4 text-xl font-semibold text-gray-700">No projects found</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-sm">
                Start by creating a new project with the + button above, or import an existing session.
              </p>
              <TooltipButton tooltipText="Create new project" onClick={handleCreate} className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg">
                Create a project
              </TooltipButton>
            </div>
          ) : (
            <div className="mt-6 flex flex-col lg:flex-row gap-6">
              <div className="lg:w-1/3 space-y-4 lg:pr-4 lg:border-r lg:border-gray-200">
                <div className="flex items-center justify-between">
                  <Heading3 className="text-lg">Projects</Heading3>
                  <span className="text-xs text-gray-500">{visibleProjects.length} total</span>
                </div>
                <div className="border border-gray-200 rounded-2xl bg-white max-h-[50vh] overflow-y-auto divide-y divide-gray-100">
                  {visibleProjects.map((p) => {
                    const isSelected = selectedCardId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedCardId(p.id)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                          isSelected ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500">ID: {p.id.slice(0, 8)}</p>
                        </div>
                        <div className="flex flex-col items-end text-xs text-gray-400 gap-1">
                          {p.id === currentProjectId && (
                            <span className="text-green-600 font-semibold">Active</span>
                          )}
                          {resetTriggers[p.id] && (
                            <span>updated</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Paragraph className="text-xs text-gray-500">
                  {pendingProjectId
                    ? 'Finish the wizard to add your new project.'
                    : 'Click a project to view its details.'}
                </Paragraph>
              </div>

              <div className="flex-1 flex flex-col">
                {selectedProject ? (
                  <>
                    <ProjectCard
                      project={selectedProject}
                      isSelected
                      isActive={selectedProject.id === currentProjectId}
                      refreshToken={resetTriggers[selectedProject.id]}
                      onSelect={setSelectedCardId}
                      className="max-w-3xl w-full mx-auto"
                    />
                    <ProjectActionToolbar
                      isDefault={selectedProject.id === DEFAULT_PROJECT_ID || selectedProject.id === MULTI_RUN_EXAMPLE_PROJECT_ID}
                      onOpenDataset={() => setSectionDialog({ type: 'dataset', projectId: selectedProject.id })}
                      onOpenTemplate={() => setSectionDialog({ type: 'template', projectId: selectedProject.id })}
                      onOpenTestSetup={() => setSectionDialog({ type: 'test', projectId: selectedProject.id })}
                      onOpenName={() => setSectionDialog({ type: 'name', projectId: selectedProject.id })}
                      onExport={() => handleExportProject(selectedProject.id)}
                      onReset={() => {
                        showDialog({
                          tone: 'warning',
                          title: 'Reset example project?',
                          message: "This will overwrite the project's local settings and dataset with the starter data.",
                          confirmLabel: 'Reset project',
                          confirmTooltip: 'Restore the example project to its initial state',
                          cancelLabel: 'Cancel',
                          cancelTooltip: 'Keep current project data',
                          onConfirm: async () => {
                            await resetProject(selectedProject.id);
                            setResetTriggers((prev) => ({ ...prev, [selectedProject.id]: Date.now() }));
                            setTimeout(() => {
                              showDialog({
                                tone: 'success',
                                title: 'Example project reset',
                                message: 'The example project has been restored to its initial configuration.',
                                confirmLabel: 'OK',
                                confirmTooltip: 'Close dialog',
                                showCancel: false,
                              });
                            }, 0);
                          },
                        });
                      }}
                      onDelete={() => handleDelete(selectedProject.id)}
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-500">
                    Select a project from the list to view its details.
                  </div>
                )}
                <div className="flex justify-end mt-4">
                  <TooltipButton
                    tooltipText={selectedProject ? 'Select project and continue' : 'Select a project to continue'}
                    onClick={() => selectedProject && handleSelect(selectedProject.id)}
                    disabled={!selectedProject}
                    className={selectedProject ? '' : 'bg-gray-200 text-gray-700'}
                  >
                    Select project
                  </TooltipButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    
    {sectionDialog.type === 'name' && (
      <ProjectNameDialog
        projectId={sectionDialog.projectId}
        isOpen={true}
        onClose={() => setSectionDialog({ type: null, projectId: null })}
      />
    )}
    {sectionDialog.type === 'template' && (
      <ProjectTemplateDialog
        projectId={sectionDialog.projectId}
        isOpen={true}
        onClose={() => setSectionDialog({ type: null, projectId: null })}
        onProjectMetaChange={handleProjectMetaChange}
      />
    )}
    {sectionDialog.type === 'dataset' && (
      <ProjectDatasetDialog
        projectId={sectionDialog.projectId}
        isOpen={true}
        onClose={() => setSectionDialog({ type: null, projectId: null })}
        onDatasetChanged={handleProjectMetaChange}
      />
    )}
    {sectionDialog.type === 'test' && (
      <ProjectTestSetupDialog
        projectId={sectionDialog.projectId}
        isOpen={true}
        onClose={() => setSectionDialog({ type: null, projectId: null })}
        onProjectMetaChange={handleProjectMetaChange}
      />
    )}

    {wizardConfig.open && (
      <ProjectConfigurationWizard
        open={wizardConfig.open}
        projectId={wizardConfig.projectId}
        initialStep={wizardConfig.initialStep}
        onCancel={() => handleWizardCancel(wizardConfig.projectId)}
        onComplete={() => handleWizardComplete(wizardConfig.projectId)}
        onProjectMetaChange={handleProjectMetaChange}
      />
    )}
    
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
