import React, { useMemo } from 'react';
import {
  HardDrive,
  FlaskRound,
  Repeat,
  Upload,
  RefreshCw,
  Trash2,
  Pencil,
  Layers3,
  FlaskConical,
  Users,
  BookOpenCheck
} from 'lucide-react';

import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import IconTooltipButton from './IconTooltipButton';
import { DEFAULT_EXPERIMENT_TYPE_ID, getExperimentTypeConfig } from '../../constants/experimentTypes';
import {
  getProjectDatasetName,
  getProjectExperimentTypeId,
  getProjectLastEdited,
  getProjectTestSetupId,
  getProjectCollectionStats
} from '../../utils/projectMetadata';

const SummaryBadge = ({ icon: Icon, label, value, accent }) => (
  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm min-w-[120px]">
    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${accent}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  </div>
);

const InfoRow = ({ icon: Icon, label, value, helper, accent, emphasized = false }) => (
  <div className="flex items-start gap-3">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${accent}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-base ${emphasized ? 'font-semibold text-gray-900' : 'text-gray-900'}`}>{value}</p>
      {helper && (
        <p className="text-xs text-gray-500 mt-0.5">{helper}</p>
      )}
    </div>
  </div>
);

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
  refreshToken = 0,
  className = ''
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
  const projectStats = useMemo(
    () => getProjectCollectionStats(project.id),
    [project.id, refreshToken]
  );

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
      } shadow-sm transition-all hover:shadow-md cursor-pointer ${className}`}
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

      <div className="space-y-4 text-sm">
        <InfoRow
          icon={HardDrive}
          label="Dataset"
          value={datasetName || 'Not indexed'}
          helper={lastEdited ? `Last indexed ${lastEdited.toLocaleString()}` : undefined}
          accent="bg-blue-50 text-blue-600"
          emphasized
        />
        <InfoRow
          icon={Repeat}
          label="Experiment template"
          value={experimentType.title}
          helper={experimentType.subtitle}
          accent="bg-purple-50 text-purple-600"
          emphasized
        />
        <InfoRow
          icon={FlaskRound}
          label="Test setup"
          value={testSetup?.name || 'Not selected'}
          accent="bg-emerald-50 text-emerald-600"
          emphasized
        />
      </div>

      <div className="mt-2">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Project summary</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryBadge
            icon={Layers3}
            label="Studies"
            value={projectStats.studies || 0}
            accent="bg-blue-50 text-blue-600"
          />
          <SummaryBadge
            icon={FlaskConical}
            label="Assays"
            value={projectStats.assays || 0}
            accent="bg-purple-50 text-purple-600"
          />
          <SummaryBadge
            icon={Users}
            label="Contacts"
            value={projectStats.contacts || 0}
            accent="bg-emerald-50 text-emerald-600"
          />
          <SummaryBadge
            icon={BookOpenCheck}
            label="Publications"
            value={projectStats.publications || 0}
            accent="bg-amber-50 text-amber-600"
          />
        </div>
      </div>

      <div
        className="border-t border-dashed border-gray-200 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap gap-6 text-xs text-gray-600">
          <div className="flex flex-col items-center gap-2 pr-6 border-r border-gray-200 min-w-[90px]">
            <span className="uppercase tracking-wide font-semibold text-center">Dataset</span>
            <div className="flex gap-2 justify-center">
              <IconTooltipButton
                icon={HardDrive}
                tooltipText="Pick, replace, or remove the dataset for this project"
                onClick={(event) => handleAction(event, onOpenDataset)}
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 pr-6 border-r border-gray-200 min-w-[90px]">
            <span className="uppercase tracking-wide font-semibold text-center">Experiment</span>
            <div className="flex gap-2 justify-center">
              <IconTooltipButton
                icon={Repeat}
                tooltipText="Choose how many runs/files belong in each study"
                onClick={(event) => handleAction(event, onOpenTemplate)}
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 pr-6 border-r border-gray-200 min-w-[110px]">
            <span className="uppercase tracking-wide font-semibold text-center">Test setup</span>
            <div className="flex gap-2 justify-center">
              <IconTooltipButton
                icon={FlaskRound}
                tooltipText="Select or change the test setup for this project"
                onClick={(event) => handleAction(event, onOpenTestSetup)}
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 min-w-[140px]">
            <span className="uppercase tracking-wide font-semibold text-center">Project</span>
            <div className="flex gap-2 flex-wrap justify-center">
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
      </div>
    </div>
  );
};

export default ProjectCard;
