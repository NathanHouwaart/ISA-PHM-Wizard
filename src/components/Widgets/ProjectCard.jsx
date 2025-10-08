import React, { useMemo, useState, useEffect } from 'react';
import { useProjectDataset } from '../../hooks/useProjectDataset';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import FormField from '../Form/FormField';
import IconTooltipButton from './IconTooltipButton';
import { Edit, Folder, Trash, Trash2, Upload, RefreshCw, Pencil, Eraser } from 'lucide-react';
import ProgressOverlay from './ProgressOverlay';
import KeyValueRow from '../Typography/KeyValueRow';
import AlertDecisionDialog from './AlertDecisionDialog';
import TestSetupPickerDialog from '../TestSetup/TestSetupPickerDialog';

/**
 * ProjectCard Component
 * 
 * Displays a project card with dataset information, actions, and progress tracking.
 * Supports inline renaming, loading states, and progress overlays.
 * 
 * @example
 * <ProjectCard
 *   project={{ id: '123', name: 'My Project' }}
 *   isSelected={true}
 *   tree={{ rootName: 'Dataset 1' }}
 *   onSelect={() => setSelected('123')}
 *   onRename={(name) => rename('123', name)}
 * />
 * 
 * Props:
 * - project: { id: string, name: string } - Project data
 * - isSelected: boolean - Whether this card is currently selected
 * - isActive: boolean - Whether this is the currently active project
 * - isDefault: boolean - Whether this is the default project
 * - tree: { rootName?: string, name?: string } | null - Dataset tree info
 * - loading: boolean - Whether the dataset is loading
 * - progress: { percent: number, message: string } | null - Progress overlay data
 * - isRenaming: boolean - Whether the card is in rename mode
 * - setupName: string | null - Name of the selected test setup
 * - lastEdited: Date | null - Last edit timestamp
 * - resetTrigger: number | undefined - Timestamp to trigger dataset refresh
 * - onSelect: () => void - Called when card is clicked
 * - onRename: (newName: string) => void - Called when rename is committed
 * - onToggleRename: () => void - Called to enter/exit rename mode
 * - onDelete: () => void - Called to delete the project
 * - onEditDataset: () => void - Called to pick/index a new dataset
 * - onDeleteDataset: () => void - Called to delete the indexed dataset
 * - onExport: () => void - Called to export the project
 * - onReset?: () => void - Called to reset the default project (only for default)
 * - index: number - Card index for staggered animation
 * - animationVisible: boolean - Whether card animations should be visible
 * - className?: string - Additional CSS classes
 * - data-testid?: string - Test identifier
 */
const ProjectCard = ({
  project,
  isSelected = false,
  isActive = false,
  isDefault = false,
  tree = null,
  loading = false,
  progress = null,
  isRenaming = false,
  setupName = null,
  lastEdited = null,
  resetTrigger,
  onSelect,
  onRename,
  onToggleRename,
  onDelete,
  onEditDataset,
  onDeleteDataset,
  onExport,
  onReset,
  index = 0,
  animationVisible = true,
  className = '',
  'data-testid': dataTestId = 'project-card',
}) => {
  const dataset = useProjectDataset(project.id);
  const [showDeleteDatasetDialog, setShowDeleteDatasetDialog] = useState(false);
  const [isDeletingDataset, setIsDeletingDataset] = useState(false);
  const [showTestSetupPicker, setShowTestSetupPicker] = useState(false);
  const [showDeleteTestSetupDialog, setShowDeleteTestSetupDialog] = useState(false);
  const [pendingTestSetupId, setPendingTestSetupId] = useState(null);
  const [showAssignSetupConfirm, setShowAssignSetupConfirm] = useState(false);

  // Refresh dataset when reset is triggered
  useEffect(() => {
    if (resetTrigger && dataset.refreshDataset) {
      dataset.refreshDataset();
    }
  }, [resetTrigger, dataset.refreshDataset]);

  const formatDate = (date) => {
    if (!date) return null;
    // Accept Date or ISO string
    const d = date instanceof Date ? date : new Date(date);
    if (!(d instanceof Date) || isNaN(d)) return null;
    return d.toLocaleString();
  };

  // Prefer explicit props; fall back to dataset hook values for tree/loading/progress/metadata
  const datasetTree = tree ?? dataset.tree;
  const datasetLoading = loading || dataset.loading;
  const datasetProgress = progress ?? dataset.progress;
  const datasetSetupName = setupName ?? (dataset.metadata && dataset.metadata.setupName) ?? null;
  const datasetLastEdited = lastEdited ?? (dataset.metadata && dataset.metadata.lastEdited ? dataset.metadata.lastEdited : null);

  // Attempt to derive a test setup name even when dataset metadata is not available.
  // Per-project selection is stored in localStorage under `globalAppData_{projectId}_selectedTestSetupId`.
  const {
    testSetups = [],
    currentProjectId,
    setSelectedTestSetupId,
  } = useGlobalDataContext();
  const projectSelectedSetupId = (() => {
    try {
      const raw = localStorage.getItem(`globalAppData_${project.id}_selectedTestSetupId`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  })();
  const selectedSetupFromGlobal = Array.isArray(testSetups) ? testSetups.find((s) => s && s.id === projectSelectedSetupId) : null;
  const displaySetupName = datasetSetupName ?? (selectedSetupFromGlobal && selectedSetupFromGlobal.name) ?? 'N/A';
  const datasetDeleteHandler = useMemo(() => {
    if (typeof onDeleteDataset === 'function') return onDeleteDataset;
    if (dataset && typeof dataset.deleteDataset === 'function') return dataset.deleteDataset;
    return null;
  }, [dataset, onDeleteDataset]);
  const datasetNameForDialog = datasetTree?.rootName || datasetTree?.name || project?.name || 'this project';

  const handleConfirmDeleteDataset = async () => {
    if (!datasetDeleteHandler) {
      setShowDeleteDatasetDialog(false);
      return;
    }

    try {
      setIsDeletingDataset(true);
      const result = datasetDeleteHandler();
      if (result && typeof result.then === 'function') {
        await result;
      }
    } finally {
      setIsDeletingDataset(false);
      setShowDeleteDatasetDialog(false);
    }
  };

  const persistTestSetupSelection = (setupId) => {
    const storageKey = `globalAppData_${project.id}_selectedTestSetupId`;
    if (setupId) {
      localStorage.setItem(storageKey, JSON.stringify(setupId));
    } else {
      localStorage.removeItem(storageKey);
    }

    if (project.id === currentProjectId && typeof setSelectedTestSetupId === 'function') {
      setSelectedTestSetupId(setupId ?? null);
    }
    if (dataset && typeof dataset.refreshMetadata === 'function') {
      dataset.refreshMetadata();
    }
  };

  const handleAssignTestSetup = (setupId) => {
    const previousId = projectSelectedSetupId;
    setShowTestSetupPicker(false);

    if (previousId && previousId !== setupId) {
      setPendingTestSetupId(setupId);
      setShowAssignSetupConfirm(true);
      return;
    }

    setPendingTestSetupId(null);
    setShowAssignSetupConfirm(false);
    persistTestSetupSelection(setupId);
  };

  const handleClearTestSetup = () => {
    persistTestSetupSelection(null);
    setShowDeleteTestSetupDialog(false);
  };

  const handleConfirmAssign = () => {
    if (pendingTestSetupId) {
      persistTestSetupSelection(pendingTestSetupId);
    }
    setPendingTestSetupId(null);
    setShowAssignSetupConfirm(false);
  };

  const handleCancelAssign = () => {
    setPendingTestSetupId(null);
    setShowAssignSetupConfirm(false);
    setTimeout(() => {
      setShowTestSetupPicker(true);
    }, 0);
  };

  const getDatasetDisplay = () => {
    if (datasetLoading) {
      return (
        <span className="inline-flex items-center gap-2 text-sm text-indigo-600">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span>Indexing...</span>
          <span className="sr-only">Loading project dataset</span>
        </span>
      );
    }
    return datasetTree ? (datasetTree.rootName || datasetTree.name || 'Indexed') : 'None';
  };

  const handleKeyDown = (e) => {
    // If the user is typing in an input/textarea or an editable element inside the card
    // (for example the inline FormField used for renaming), don't treat Enter/Space
    // as a card toggle — let the input handle the key instead.
    const tgt = e && e.target;
    if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) {
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect && onSelect();
    }
  };

  const handleRenameCommit = (e) => {
    const newName = e && e.target ? e.target.value : '';
    const trimmedName = newName.trim();
    if (trimmedName && onRename) {
      onRename(trimmedName);
    }
  };

  return (
    <>
      <div
        data-testid={dataTestId}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        className={`relative flex items-center justify-between p-5 rounded-lg border ${
          isSelected
            ? 'border-2 border-indigo-600 bg-indigo-50'
            : 'border-gray-100 bg-white'
        } cursor-pointer transform transition-all duration-200 hover:shadow-sm ${className}`}
        style={{
          opacity: animationVisible ? 1 : 0,
          transitionDelay: `${index * 40}ms`
        }}
      >
        {/* Progress overlay */}
        <ProgressOverlay progress={datasetProgress} />

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="text-lg font-medium flex items-center gap-2">
              {isRenaming ? (
                <div
                  className="w-64"
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    // If focus moved outside this wrapper, exit rename mode
                    try {
                      const rel = e.relatedTarget;
                      if (rel && e.currentTarget && e.currentTarget.contains(rel)) return;
                    } catch {
                      // Ignore blur errors
                    }
                    onToggleRename && onToggleRename();
                  }}
                >
                  <FormField
                    name={`project-${project.id}-name`}
                    value={project.name}
                    label=""
                    placeholder="Project name"
                    commitOnBlur={true}
                    onChange={handleRenameCommit}
                    className=""
                    data-testid={`${dataTestId}-rename-input`}
                  />
                </div>
              ) : (
                <div className="text-lg font-medium truncate max-w-[320px]" data-testid={`${dataTestId}-name`}>
                  {project.name}
                </div>
              )}
              {isActive && (
                <div className="text-sm text-gray-400" data-testid={`${dataTestId}-active-badge`}>
                  (active)
                </div>
              )}
            </div>
          </div>

          {/* Dataset info */}
          <div className="mt-1">
            <KeyValueRow 
              label="Dataset" 
              value={getDatasetDisplay()} 
              data-testid={`${dataTestId}-dataset`}
            />
          </div>

          {/* Test setup and last edited */}
          <div className="mt-1">
            <KeyValueRow
              label="Test setup"
              value={displaySetupName}
              data-testid={`${dataTestId}-setup`}
            />
            {datasetLastEdited && (
              <div className="text-xs text-gray-400 mt-1" data-testid={`${dataTestId}-last-edited`}>
                Last edited: <span className="text-gray-600">{formatDate(datasetLastEdited)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {/* Dataset actions group */}
          <div className="flex flex-col items-center text-center">
            <div className="text-xs text-gray-500 mb-1">Dataset</div>
            <div className="flex items-center gap-1">
              <IconTooltipButton 
                icon={Folder} 
                tooltipText="Edit dataset (pick folder)" 
                onClick={(e) => {
                  e.stopPropagation();
                  // prefer explicit prop handler if provided, otherwise use hook action
                  if (onEditDataset) onEditDataset();
                  else dataset.indexDataset && dataset.indexDataset();
                }}
                data-testid={`${dataTestId}-edit-dataset-btn`}
              />
              <IconTooltipButton 
                icon={Eraser} 
                tooltipText="Delete indexed dataset" 
                onClick={(e) => {
                  e.stopPropagation();
                  if (!datasetDeleteHandler || !datasetTree) {
                    return;
                  }
                  setShowDeleteDatasetDialog(true);
                }}
                data-testid={`${dataTestId}-delete-dataset-btn`}
                disabled={!datasetDeleteHandler || datasetLoading || !datasetTree}
              />
            </div>
          </div>

          {/* Separator */}
          <div className="w-px h-10 bg-gray-200" aria-hidden="true" />

          {/* Test setup actions group */}
          <div className="flex flex-col items-center text-center">
            <div className="text-xs text-gray-500 mb-1">Test setup</div>
            <div className="flex items-center gap-1">
              <IconTooltipButton
                icon={Pencil}
                tooltipText="Edit associated test setup"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTestSetupPicker(true);
                }}
                data-testid={`${dataTestId}-edit-setup-btn`}
              />
              <IconTooltipButton
                icon={Eraser}
                tooltipText="Remove associated test setup"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteTestSetupDialog(true);
                }}
                data-testid={`${dataTestId}-delete-setup-btn`}
                disabled={!projectSelectedSetupId}
              />
            </div>
          </div>

          {/* Separator */}
          <div className="w-px h-10 bg-gray-200" aria-hidden="true" />

          {/* Project actions group */}
          <div className="flex flex-col items-center text-center">
            <div className="text-xs text-gray-500 mb-1">Project</div>
            <div className="flex items-center gap-1">
              <IconTooltipButton 
                icon={Upload} 
                tooltipText="Export project as JSON" 
                onClick={(e) => {
                  e.stopPropagation();
                  onExport && onExport();
                }}
                data-testid={`${dataTestId}-export-btn`}
              />
              <IconTooltipButton 
                icon={Edit} 
                tooltipText="Rename project" 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRename && onToggleRename();
                }}
                data-testid={`${dataTestId}-rename-btn`}
              />
              {isDefault ? (
                <IconTooltipButton 
                  icon={RefreshCw} 
                  tooltipText="Reset project to defaults" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onReset && onReset();
                  }}
                  data-testid={`${dataTestId}-reset-btn`}
                />
              ) : (
                <IconTooltipButton 
                  icon={Trash2} 
                  tooltipText="Delete project" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete && onDelete();
                  }}
                  data-testid={`${dataTestId}-delete-btn`}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {showDeleteDatasetDialog && (
        <AlertDecisionDialog
          open
          tone="danger"
          title="Delete indexed dataset?"
          message={`Remove the indexed dataset: ${datasetNameForDialog} from the project. This won't delete any files from your computer — it only removes the index. You can re-index the folder at any time.`}
          confirmLabel={isDeletingDataset ? 'Deleting...' : 'Delete dataset'}
          confirmTooltip="Remove the indexed dataset from this project"
          cancelLabel="Keep dataset"
          cancelTooltip="Close dialog without deleting"
          onConfirm={handleConfirmDeleteDataset}
          onCancel={() => {
            if (!isDeletingDataset) {
              setShowDeleteDatasetDialog(false);
            }
          }}
          confirmButtonProps={{ disabled: isDeletingDataset }}
          cancelButtonProps={{ disabled: isDeletingDataset }}
        />
      )}
      {showDeleteTestSetupDialog && (
        <AlertDecisionDialog
          open
          tone="warning"
          title="Remove associated test setup?"
          message={`This will clear the test setup assignment${displaySetupName && displaySetupName !== 'N/A' ? ` (“${displaySetupName}”)` : ''} for this project. You can assign a new test setup later.`}
          confirmLabel="Remove test setup"
          confirmTooltip="Clear the associated test setup from this project"
          cancelLabel="Keep test setup"
          cancelTooltip="Close dialog without changes"
          onConfirm={handleClearTestSetup}
          onCancel={() => setShowDeleteTestSetupDialog(false)}
        />
      )}
      {showTestSetupPicker && (
        <TestSetupPickerDialog
          open={showTestSetupPicker}
          testSetups={testSetups}
          selectedSetupId={projectSelectedSetupId}
          onClose={() => setShowTestSetupPicker(false)}
          onConfirm={handleAssignTestSetup}
        />
      )}
      {showAssignSetupConfirm && (
        <AlertDecisionDialog
          open
          tone="warning"
          title="Replace associated test setup?"
          message="Assigning a new test setup will remove existing mappings linked to the previous setup for this project. This action cannot be undone."
          confirmLabel="Replace test setup"
          confirmTooltip="Remove old mappings and assign the selected test setup"
          cancelLabel="Keep current setup"
          cancelTooltip="Cancel and keep the existing test setup"
          onConfirm={handleConfirmAssign}
          onCancel={handleCancelAssign}
        />
      )}
    </>
  );
};

export default ProjectCard;
