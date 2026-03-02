import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { getExperimentTypeConfig } from '../../constants/experimentTypes';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import { buildStudyRunGroups } from '../../utils/studyRunLayouts';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import TooltipButton from '../Widgets/TooltipButton';


const DualSidebarStudyRunPanel = ({
  title = 'Study mapping',
  studies = [],
  studyRuns = [],
  mappings = [],
  handleInputChange = () => {},
  minHeight,
  MappingCardComponent,
  mappingCardProps = {},
}) => {
  const { experimentType } = useGlobalDataContext();
  const experimentConfig = getExperimentTypeConfig(experimentType);
  const supportsMultipleRuns = !!experimentConfig.supportsMultipleRuns;

  const groupedStudies = useMemo(
    () => buildStudyRunGroups(studies, studyRuns),
    [studies, studyRuns]
  );

  const [selectedStudyId, setSelectedStudyId] = useState(groupedStudies[0]?.studyId || null);

  useEffect(() => {
    if (!groupedStudies.length) {
      setSelectedStudyId(null);
      return;
    }
    if (!selectedStudyId || !groupedStudies.some(g => g.studyId === selectedStudyId)) {
      setSelectedStudyId(groupedStudies[0].studyId);
    }
  }, [groupedStudies, selectedStudyId]);

  const selectedStudyGroup = useMemo(
    () => groupedStudies.find(g => g.studyId === selectedStudyId) || groupedStudies[0] || null,
    [groupedStudies, selectedStudyId]
  );

  const [selectedRunId, setSelectedRunId] = useState(null);

  useEffect(() => {
    if (!supportsMultipleRuns) {
      setSelectedRunId(null);
      return;
    }
    if (!selectedStudyGroup) {
      setSelectedRunId(null);
      return;
    }
    const runs = selectedStudyGroup.runs || [];
    if (!runs.length) {
      setSelectedRunId(null);
      return;
    }
    if (!selectedRunId || !runs.some(r => (r.runId || r.id) === selectedRunId)) {
      const first = runs[0];
      setSelectedRunId(first.runId || first.id);
    }
  }, [supportsMultipleRuns, selectedStudyGroup, selectedRunId]);

  const handleStudySelect = useCallback((studyId) => {
    setSelectedStudyId(studyId);
    if (supportsMultipleRuns) {
      setSelectedRunId(null);
    }
  }, [supportsMultipleRuns]);

  const activeRun = useMemo(() => {
    if (!selectedStudyGroup) return null;
    const runs = selectedStudyGroup.runs || [];
    if (!runs.length) return null;
    if (!supportsMultipleRuns) return runs[0];
    return runs.find(r => (r.runId || r.id) === selectedRunId) || runs[0];
  }, [selectedStudyGroup, selectedRunId, supportsMultipleRuns]);

  return (
    <div
      className="flex flex-col md:flex-row gap-6 h-full min-h-0 w-full"
    >
      <div className="w-full md:w-1/6 bg-white border border-gray-300 rounded-2xl p-4 flex flex-col flex-shrink-0 shadow-md overflow-hidden">
        <Heading3 className="text-lg text-gray-900">{title}</Heading3>
        <Paragraph className="text-xs text-gray-500 mb-2">Select a study.</Paragraph>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {groupedStudies.map((group, index) => {
            const label = group.study?.name || `Study ${String(index + 1).padStart(2,'0')}`;
            const isActive = group.studyId === selectedStudyId;
            return (
              <TooltipButton
                key={group.studyId || `study-${index}`}
                tooltipText={label}
                onClick={() => handleStudySelect(group.studyId)}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50'}`}
              >
                {label}
              </TooltipButton>
            );
          })}
          {groupedStudies.length === 0 && (
            <Paragraph className="text-sm text-gray-500">No studies yet.</Paragraph>
          )}
        </div>
      </div>

      {supportsMultipleRuns && (
        <div className="w-full md:w-1/6 bg-white border border-gray-300 rounded-2xl p-4 flex flex-col flex-shrink-0 shadow-md max-h-full">
          <Heading3 className="text-lg text-gray-900">Runs</Heading3>
          <Paragraph className="text-xs text-gray-500 mb-2">Select a run.</Paragraph>
          <div className="overflow-y-auto flex-1 space-y-2">
            {selectedStudyGroup?.runs?.map((run, index) => {
              const label = run.displayName || run.name || (run.runCount > 1 ? `Run ${run.runNumber}` : 'Single run');
              const isActive = (run.runId || run.id) === selectedRunId;
              return (
                <TooltipButton
                  key={run.runId || run.id || `run-${index}`}
                  tooltipText={label}
                  onClick={() => setSelectedRunId(run.runId || run.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50'}`}
                >
                  {label}
                </TooltipButton>
              );
            })}
            {(!selectedStudyGroup?.runs || selectedStudyGroup.runs.length === 0) && (
              <Paragraph className="text-sm text-gray-500">No runs available.</Paragraph>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full min-h-0 overflow-y-auto">
        {!selectedStudyGroup && (
          <div className="flex-1 min-w-0 flex items-center justify-center bg-white border border-gray-300 rounded-2xl shadow-sm min-h-[220px]">
            <Paragraph className="text-gray-500 text-sm">Select a study to begin mapping</Paragraph>
          </div>
        )}
        {selectedStudyGroup && activeRun && (
          <div className="flex-1 min-h-0">
            <MappingCardComponent
              item={activeRun}
              mappings={mappings}
              handleInputChange={handleInputChange}
              singleRunMode
              {...mappingCardProps}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DualSidebarStudyRunPanel;
