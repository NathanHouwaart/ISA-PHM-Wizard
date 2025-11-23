import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { buildStudyRunGroups } from '../../utils/studyRunLayouts';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import TooltipButton from '../Widgets/TooltipButton';
import FormField from '../Form/FormField';


const StudyVariableMappingPanel = ({
  studies = [],
  studyRuns = [],
  studyVariables = [],
  mappings = [],
  handleInputChange = () => {},
  minHeight,
}) => {
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

  const handleStudySelect = useCallback((studyId) => {
    setSelectedStudyId(studyId);
  }, []);

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Study Sidebar */}
      <div className="w-full md:w-1/6 bg-white border border-gray-300 rounded-2xl p-4 flex flex-col flex-shrink-0 shadow-md max-h-full">
        <Heading3 className="text-lg text-gray-900">Studies</Heading3>
        <Paragraph className="text-xs text-gray-500 mb-2">Select a study.</Paragraph>
        <div className="overflow-y-auto flex-1 space-y-2">
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

      {/* Main Content: One card per run */}
      <div className="flex-1 min-w-0 overflow-y-auto max-h-full">
        {!selectedStudyGroup && (
          <Paragraph className="text-sm text-gray-500">Select a study to begin mapping.</Paragraph>
        )}
        {selectedStudyGroup && (
          <div className="bg-white border border-gray-300 rounded-2xl p-6 shadow-sm">
            <div className="mb-4 pb-3 border-b border-gray-200">
              <Heading3 className="text-xl font-semibold text-gray-900">
                {selectedStudyGroup.study?.name || 'Study'}
              </Heading3>
            </div>

            {studyVariables.map((variable) => (
              <div key={variable.id} className="mb-6 last:mb-0">
                <Heading3 className="text-lg font-semibold text-gray-800 mb-3">{variable.name}</Heading3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedStudyGroup.runs.map((run, runIndex) => {
                    const mapping = mappings.find((m) =>
                      m.studyVariableId === variable.id &&
                      (m.studyRunId === run.runId || m.studyRunId === run.id)
                    ) || {
                      studyVariableId: variable.id,
                      studyRunId: run.runId || run.id,
                      studyId: run.studyId,
                      value: ''
                    };

                    const runLabel = run.runCount > 1 ? `Run ${run.runNumber}` : 'Single run';

                    return (
                      <div
                        key={run.runId || run.id || `run-${runIndex}`}
                        className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm"
                      >
                        <div className="mb-2 font-semibold text-gray-700">{runLabel}</div>
                        <FormField
                          label=""
                          name={`mapping-${variable.id}-${run.runId || run.id}`}
                          value={mapping.value || ''}
                          commitOnBlur={true}
                          className="w-full"
                          onChange={(e) =>
                            handleInputChange(
                              0,
                              {
                                studyVariableId: variable.id,
                                studyRunId: run.runId || run.id,
                                studyId: run.studyId
                              },
                              e.target.value
                            )
                          }
                          placeholder="Enter value"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyVariableMappingPanel;
