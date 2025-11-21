import React, { useEffect, useMemo, useState } from 'react';

import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import TooltipButton from '../Widgets/TooltipButton';
import { buildStudyRunGroups } from '../../utils/studyRunLayouts';
import StudyMeasurementMappingCard from '../StudyMeasurementMappingCard';

const EMPTY_FN = () => {};

const StudyRunMappingPanel = ({
  title = 'Study mapping',
  studies = [],
  studyRuns = [],
  mappings = [],
  handleInputChange = EMPTY_FN,
  minHeight,
  MappingCardComponent = StudyMeasurementMappingCard,
}) => {
  const groupedStudies = useMemo(
    () => buildStudyRunGroups(studies, studyRuns),
    [studies, studyRuns]
  );

  const [selectedStudyId, setSelectedStudyId] = useState(
    groupedStudies[0]?.studyId || null
  );
  const [selectedRunId, setSelectedRunId] = useState(
    groupedStudies[0]?.runs?.[0]?.id || groupedStudies[0]?.runs?.[0]?.runId || null
  );

  useEffect(() => {
    if (!groupedStudies.length) {
      setSelectedStudyId(null);
      setSelectedRunId(null);
      return;
    }
    if (!selectedStudyId || !groupedStudies.some((group) => group.studyId === selectedStudyId)) {
      const fallbackGroup = groupedStudies[0];
      setSelectedStudyId(fallbackGroup.studyId);
      setSelectedRunId(fallbackGroup.runs?.[0]?.id || fallbackGroup.runs?.[0]?.runId || null);
    }
  }, [groupedStudies, selectedStudyId]);

  const selectedStudyGroup = useMemo(
    () => groupedStudies.find((group) => group.studyId === selectedStudyId) || groupedStudies[0] || null,
    [groupedStudies, selectedStudyId]
  );

  useEffect(() => {
    if (!selectedStudyGroup) {
      setSelectedRunId(null);
      return;
    }
    if (
      !selectedRunId ||
      !selectedStudyGroup.runs.some((run) => (run.id || run.runId) === selectedRunId)
    ) {
      const fallbackRun = selectedStudyGroup.runs[0];
      setSelectedRunId(fallbackRun ? (fallbackRun.id || fallbackRun.runId) : null);
    }
  }, [selectedStudyGroup, selectedRunId]);

  const selectedRun =
    selectedStudyGroup?.runs.find((run) => (run.id || run.runId) === selectedRunId) ||
    selectedStudyGroup?.runs[0] ||
    null;

  return (
    <div
      className="flex flex-col md:flex-row gap-6"
      style={minHeight ? { minHeight } : undefined}
    >
      <div className="w-full md:w-1/3 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col">
        <Heading3 className="text-lg text-gray-900">{title}</Heading3>
        <Paragraph className="text-sm text-gray-500 mb-3">
          Select a study to view its runs.
        </Paragraph>
        <div className="mt-2 overflow-y-auto flex-1 space-y-2">
          {groupedStudies.map((group, index) => {
            const label = group.study?.name
              ? `${group.study.name}`
              : `Study ${String(index + 1).padStart(2, '0')}`;
            const isActive = group.studyId === selectedStudyId;
            return (
              <TooltipButton
                key={group.studyId || `study-${index}`}
                tooltipText={label}
                onClick={() => setSelectedStudyId(group.studyId)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50'
                }`}
              >
                {label}
              </TooltipButton>
            );
          })}
          {groupedStudies.length === 0 && (
            <Paragraph className="text-sm text-gray-500">
              No studies available yet.
            </Paragraph>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-4">
        {selectedStudyGroup && selectedRun ? (
          <>
            <div className="flex flex-col gap-2 mb-4">
              <Heading3 className="text-xl text-gray-900">
                {selectedStudyGroup.study?.name || 'Unnamed study'}
              </Heading3>
              <Paragraph className="text-sm text-gray-500">
                Select a run to edit the file mappings.
              </Paragraph>
              <div className="flex flex-wrap gap-2">
                {selectedStudyGroup.runs.map((run) => {
                  const runId = run.id || run.runId;
                  const isActive = runId === selectedRunId;
                  return (
                    <TooltipButton
                      key={runId}
                      tooltipText={run.shortLabel || `Run ${run.runNumber}`}
                      onClick={() => setSelectedRunId(runId)}
                      className={`text-sm px-4 py-1 rounded-full ${
                        isActive
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      {run.shortLabel || `Run ${run.runNumber}`}
                    </TooltipButton>
                  );
                })}
              </div>
            </div>
            <MappingCardComponent
              item={selectedRun}
              itemIndex={selectedStudyGroup.runs.findIndex(
                (run) => (run.id || run.runId) === selectedRunId
              )}
              mappings={mappings}
              handleInputChange={handleInputChange}
              removeParameter={EMPTY_FN}
            />
          </>
        ) : (
          <Paragraph className="text-sm text-gray-500">
            Select a study to begin mapping.
          </Paragraph>
        )}
      </div>
    </div>
  );
};

export default StudyRunMappingPanel;
