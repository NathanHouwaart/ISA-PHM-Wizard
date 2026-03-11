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
  BookOpenCheck,
  FileText,
  Folder,
  ListChecks,
  Cpu
} from 'lucide-react';

import { useProjectData } from '../../contexts/GlobalDataContext';
import { DEFAULT_EXPERIMENT_TYPE_ID, getExperimentTypeConfig } from '../../constants/experimentTypes';
import {
  getProjectDatasetName,
  getProjectExperimentTypeId,
  getProjectLastEdited,
  getProjectTestSetupId,
  getProjectCollectionStats,
  getProjectDatasetStats
} from '../../utils/projectMetadata';

const SummaryBadge = ({ icon: Icon, label, value, accent }) => (
  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm min-w-[120px]">
    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${accent}`}>
      {React.createElement(Icon, { className: 'w-4 h-4' })}
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
      {React.createElement(Icon, { className: 'w-5 h-5' })}
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
  onSelect,
  _refreshToken = 0,
  className = ''
}) => {
  const { testSetups = [] } = useProjectData();

  const datasetName = getProjectDatasetName(project.id) || 'Not indexed';
  const lastEdited = getProjectLastEdited(project.id);
  const experimentTypeId = getProjectExperimentTypeId(project.id, DEFAULT_EXPERIMENT_TYPE_ID);
  const experimentType = getExperimentTypeConfig(experimentTypeId || DEFAULT_EXPERIMENT_TYPE_ID);

  const testSetupId = getProjectTestSetupId(project.id);
  const testSetup = Array.isArray(testSetups)
    ? testSetups.find((setup) => setup?.id === testSetupId)
    : null;
  const projectStats = getProjectCollectionStats(project.id);
  const datasetStats = getProjectDatasetStats(project.id);

  const sensorCount = useMemo(() => {
    if (!testSetup || !Array.isArray(testSetup.sensors)) {
      return 0;
    }
    return testSetup.sensors.filter(Boolean).length;
  }, [testSetup]);

  const characteristicCount = useMemo(() => {
    if (!testSetup || !Array.isArray(testSetup.characteristics)) {
      return 0;
    }
    return testSetup.characteristics.filter(Boolean).length;
  }, [testSetup]);

  const studiesCount = projectStats.studies || 0;
  const assaysCount = sensorCount > 0 ? sensorCount * studiesCount : (projectStats.assays || 0);
  const datasetFiles = Number(datasetStats?.files || 0);
  const datasetFolders = Number(datasetStats?.folders || 0);

  const formatCount = (value) => Number(value || 0).toLocaleString();
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
            value={assaysCount}
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

      <div className="border-t border-dashed border-gray-200 pt-4">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Dataset summary</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SummaryBadge
                icon={FileText}
                label="Files"
                value={formatCount(datasetFiles)}
                accent="bg-blue-50 text-blue-600"
              />
              <SummaryBadge
                icon={Folder}
                label="Folders"
                value={formatCount(datasetFolders)}
                accent="bg-indigo-50 text-indigo-600"
              />
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Test setup summary</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SummaryBadge
                icon={ListChecks}
                label="Characteristics"
                value={formatCount(characteristicCount)}
                accent="bg-emerald-50 text-emerald-600"
              />
              <SummaryBadge
                icon={Cpu}
                label="Sensors"
                value={formatCount(sensorCount)}
                accent="bg-green-50 text-green-600"
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ProjectCard;
