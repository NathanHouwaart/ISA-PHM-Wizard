import React, { useEffect, useMemo, useState, useCallback } from 'react';

import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import TooltipButton from '../Widgets/TooltipButton';
import { buildStudyRunGroups } from '../../utils/studyRunLayouts';
import StudyMeasurementMappingCard from '../StudyMeasurementMappingCard';
import TabSwitcher, { TabPanel } from '../TabSwitcher';


const StudyRunMappingPanel = ({
  title = 'Study mapping',
  studies = [],
  studyRuns = [],
  mappings = [],
  handleInputChange = () => {},
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
  const getRunId = (run) => {
    if (!run) return null;
    return String(run.id || run.runId || '');
  };

  const [selectedRunId, setSelectedRunId] = useState(
    getRunId(groupedStudies[0]?.runs?.[0]) || null
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
      setSelectedRunId(getRunId(fallbackGroup.runs?.[0]) || null);
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
      !selectedStudyGroup.runs.some((run) => getRunId(run) === selectedRunId)
    ) {
      const fallbackRun = selectedStudyGroup.runs[0];
      setSelectedRunId(fallbackRun ? getRunId(fallbackRun) : null);
    }
  }, [selectedStudyGroup, selectedRunId]);

  return (
    <div
      className="flex flex-col md:flex-row gap-6"
      style={minHeight ? { minHeight } : undefined}
    >
      <div className="w-full md:w-1/4 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col flex-shrink-0">
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

      <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 min-w-0 flex flex-col">
        {selectedStudyGroup ? (
          <>
            <div className="flex flex-col mb-4">
              <Heading3 className="text-xl text-gray-900">
                {selectedStudyGroup.study?.name || 'Unnamed study'}
              </Heading3>
            </div>
            {selectedStudyGroup.runs.map((run, index) => (
              <TabPanel key={getRunId(run)} isActive={getRunId(run) === selectedRunId}>
                <MappingCardComponent
                  item={run}
                  itemIndex={index}
                  mappings={mappings}
                  handleInputChange={handleInputChange}
                  removeParameter={EMPTY_FN}
                />
              </TabPanel>
            ))}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center min-h-[220px]">
            <Paragraph className="text-sm text-gray-500">
              Select a study to begin mapping
            </Paragraph>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyRunMappingPanel;
