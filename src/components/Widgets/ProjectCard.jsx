import React, { useMemo } from 'react';
import { HardDrive, FlaskRound, Repeat, Upload, RefreshCw, Trash2, Pencil } from 'lucide-react';

import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import IconTooltipButton from './IconTooltipButton';
import KeyValueRow from '../Typography/KeyValueRow';
import { DEFAULT_EXPERIMENT_TYPE_ID, getExperimentTypeConfig } from '../../constants/experimentTypes';
import {
  getProjectDatasetName,
  getProjectExperimentTypeId,
  getProjectLastEdited,
  getProjectTestSetupId
} from '../../utils/projectMetadata';

const ProjectCard = ({
  project,
  isSelected = false,
  isActive = false,
  isDefault = false,
  onSelect,
  onOpenName,
  onOpenDataset,
  onOpenTestSetup,
  onOpenTemplate,
  onExport,
  onReset,
  onDelete,
  refreshToken = 0
}) => {
  const { testSetups = [] } = useGlobalDataContext();

  const datasetName = useMemo(
    () => getProjectDatasetName(project.id) || 'Not indexed',
    [project.id, refreshToken]
  );
  const lastEdited = useMemo(
    () => getProjectLastEdited(project.id),
    [project.id, refreshToken]
  );
  const experimentTypeId = useMemo(
    () => getProjectExperimentTypeId(project.id, DEFAULT_EXPERIMENT_TYPE_ID),
    [project.id, refreshToken]
  );
  const experimentType = getExperimentTypeConfig(experimentTypeId || DEFAULT_EXPERIMENT_TYPE_ID);

  const testSetupId = useMemo(
    () => getProjectTestSetupId(project.id),
    [project.id, refreshToken]
  );
  const testSetup = Array.isArray(testSetups)
    ? testSetups.find((setup) => setup?.id === testSetupId)
    : null;

  const handleAction = (event, handler) => {
    event?.stopPropagation();
    handler?.(project.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={() => onSelect?.(project.id)}
      className={`relative flex flex-col gap-4 p-5 rounded-xl border ${
        isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
      } shadow-sm transition-all hover:shadow-md cursor-pointer`}
    >
      <div>
        <div className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          {project.name}
          {isActive && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
              Active
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Project ID: {project.id.slice(0, 8)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <KeyValueRow label="Dataset" value={datasetName} />
            {lastEdited && (
              <p className="text-xs text-gray-500 mt-0.5">
                Last indexed: {lastEdited.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
            <Repeat className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <KeyValueRow label="Experiment template" value={experimentType.title} />
            <p className="text-xs text-gray-500 mt-0.5">{experimentType.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FlaskRound className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <KeyValueRow label="Test setup" value={testSetup?.name || 'Not selected'} />
          </div>
        </div>
      </div>
      <div
        className="flex flex-wrap items-center gap-4 border-t border-dashed border-gray-200 pt-4 text-xs text-gray-500"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 pr-4 border-r border-gray-200">
          <span className="uppercase tracking-wide font-semibold">Dataset</span>
          <IconTooltipButton
            icon={HardDrive}
            tooltipText="Pick, replace, or remove the dataset for this project"
            onClick={(event) => handleAction(event, onOpenDataset)}
          />
        </div>
        <div className="flex items-center gap-2 pr-4 border-r border-gray-200">
          <span className="uppercase tracking-wide font-semibold">Experiment</span>
          <IconTooltipButton
            icon={Repeat}
            tooltipText="Choose how many runs/files belong in each study"
            onClick={(event) => handleAction(event, onOpenTemplate)}
          />
        </div>
        <div className="flex items-center gap-2 pr-4 border-r border-gray-200">
          <span className="uppercase tracking-wide font-semibold">Test setup</span>
          <IconTooltipButton
            icon={FlaskRound}
            tooltipText="Select or change the test setup for this project"
            onClick={(event) => handleAction(event, onOpenTestSetup)}
          />
        </div>
        <div className="flex items-center gap-2 gap-y-2 flex-wrap">
          <span className="uppercase tracking-wide font-semibold">Project</span>
          <IconTooltipButton
            icon={Pencil}
            tooltipText="Rename project"
            onClick={(event) => handleAction(event, onOpenName)}
          />
          <IconTooltipButton
            icon={Upload}
            tooltipText="Export project"
            onClick={(event) => handleAction(event, onExport)}
          />
          {isDefault ? (
            <IconTooltipButton
              icon={RefreshCw}
              tooltipText="Reset project to defaults"
              onClick={(event) => handleAction(event, onReset)}
            />
          ) : (
            <IconTooltipButton
              icon={Trash2}
              tooltipText="Delete project"
              onClick={(event) => handleAction(event, onDelete)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
