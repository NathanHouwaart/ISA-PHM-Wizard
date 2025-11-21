import React from 'react';
import { memo } from 'react';
import Heading3 from '../../Typography/Heading3';
import Paragraph from '../../Typography/Paragraph';
import TooltipButton from '../../Widgets/TooltipButton';
import { useProjectDataset } from '../../../hooks/useProjectDataset';

const ProjectDatasetSection = memo(({ projectId, cachedName, onDatasetChanged }) => {
  const dataset = useProjectDataset(projectId);

  if (!projectId) {
    return (
      <Paragraph className="text-sm text-gray-600 mt-4">
        Select or create a project first to configure its dataset.
      </Paragraph>
    );
  }

  const datasetName = dataset.loading
    ? 'Indexing…'
    : (dataset.tree?.rootName || dataset.tree?.name || cachedName || 'No dataset indexed');

  const handleIndex = async () => {
    await dataset?.indexDataset?.();
    onDatasetChanged?.();
  };

  const handleDelete = async () => {
    await dataset?.deleteDataset?.();
    onDatasetChanged?.();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
        <Heading3 className="text-sm text-gray-900">Current dataset</Heading3>
        <Paragraph className="text-sm text-gray-700 mt-2">
          {datasetName}
        </Paragraph>
        {dataset.progress && (
          <div className="mt-2">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-2 bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, dataset.progress.percent || 0))}%` }}
              />
            </div>
            <Paragraph className="text-xs text-blue-700 mt-1">
              {Math.min(100, Math.max(0, dataset.progress.percent || 0))}% – {dataset.progress.message}
            </Paragraph>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <TooltipButton
          tooltipText="Pick or replace the dataset folder for this project"
          onClick={handleIndex}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {dataset.tree ? 'Re-index dataset' : 'Index dataset'}
        </TooltipButton>
        <TooltipButton
          tooltipText="Remove the currently indexed dataset"
          onClick={handleDelete}
          disabled={!dataset.tree}
          className={`px-4 py-2 rounded-lg border ${dataset.tree ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100' : 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'}`}
        >
          Remove dataset
        </TooltipButton>
      </div>
    </div>
  );
});

export default ProjectDatasetSection;
