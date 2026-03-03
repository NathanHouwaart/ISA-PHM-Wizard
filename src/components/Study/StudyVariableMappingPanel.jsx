import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { buildStudyRunGroups } from '../../utils/studyRunLayouts';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import TooltipButton from '../Widgets/TooltipButton';
import FormField from '../Form/FormField';


import { isFaultSpecification, isOperatingCondition } from '../../constants/variableTypes';

const StudyVariableMappingPanel = ({
  studies = [],
  studyRuns = [],
  studyVariables = [],
  mappings = [],
  handleInputChange = () => {},
  minHeight: _minHeight,
  isSingleRunTemplate = false
}) => {
  const groupedStudies = useMemo(
    () => buildStudyRunGroups(studies, studyRuns),
    [studies, studyRuns]
  );

  const faultSpecs = useMemo(() => studyVariables.filter(isFaultSpecification), [studyVariables]);
  const opConds = useMemo(() => studyVariables.filter(isOperatingCondition), [studyVariables]);
  
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

  const renderSingleRunView = (variables) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {variables.map((variable) => {
        const run = selectedStudyGroup.runs[0]; // Assuming single run for this mode
        if (!run) return null;

        const mapping = mappings.find((m) =>
          m.studyVariableId === variable.id &&
          (m.studyRunId === run.runId || m.studyRunId === run.id)
        ) || {
          studyVariableId: variable.id,
          studyRunId: run.runId || run.id,
          studyId: run.studyId,
          value: ''
        };

        return (
          <div key={variable.id} className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <Heading3 className="text-base font-semibold text-gray-800">{variable.name}</Heading3>
              <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">{variable.unit || '-'}</span>
            </div>
            {variable.description && (
                <Paragraph className="text-xs text-gray-500 mb-3 line-clamp-2">{variable.description}</Paragraph>
            )}
            
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
  );

  const renderMultiRunView = (variable) => (
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
  );

  return (
    <div
      className="flex flex-col md:flex-row gap-6 h-full w-full min-h-0 "
    >
      {/* Study Sidebar */}
      <div className="w-full md:w-1/6 bg-white border border-gray-300 rounded-2xl p-4 flex flex-col flex-shrink-0 shadow-md h-full min-h-0">

        <div className="flex-shrink-0">
          <Heading3 className="text-lg text-gray-900">Studies</Heading3>
          <Paragraph className="text-xs text-gray-500 mb-2">Select a study.</Paragraph>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 space-y-2">
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
      <div className="flex-1 min-w-0 flex flex-col w-full h-full min-h-0 overflow-y-auto">
        {!selectedStudyGroup && (
          <div className="flex-1 flex items-center justify-center bg-white border border-gray-300 rounded-2xl shadow-sm min-h-[220px]">
            <Paragraph className="text-sm text-gray-500">Select a study to begin mapping</Paragraph>
          </div>
        )}
        {selectedStudyGroup && (
          <div className="w-full bg-white border border-gray-300 rounded-2xl p-6 shadow-sm">
            <div className="mb-4 pb-3 border-b border-gray-200">
              <Heading3 className="text-xl font-semibold text-gray-900">
                {selectedStudyGroup.study?.name || 'Study'}
              </Heading3>
            </div>

            <div className="flex-1 pr-1 w-full overflow-x-auto">
              {faultSpecs.length > 0 && (
                <div className="mb-10">
                  <div className="mb-4 pb-2 border-b-2 border-orange-100 flex items-center">
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-md font-semibold text-sm uppercase tracking-wide">
                      Fault Specifications
                    </span>
                  </div>
                  {isSingleRunTemplate ? renderSingleRunView(faultSpecs) : faultSpecs.map(renderMultiRunView)}
                </div>
              )}

              {opConds.length > 0 && (
                <div className="mb-10">
                   <div className="mb-4 pb-2 border-b-2 border-green-100 flex items-center">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-md font-semibold text-sm uppercase tracking-wide">
                      Operating Conditions
                    </span>
                  </div>
                  {isSingleRunTemplate ? renderSingleRunView(opConds) : opConds.map(renderMultiRunView)}
                </div>
              )}

              {faultSpecs.length === 0 && opConds.length === 0 && (
                 <Paragraph className="text-gray-500 italic">No variables defined for this study.</Paragraph>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyVariableMappingPanel;
