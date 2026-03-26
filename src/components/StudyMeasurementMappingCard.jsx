import React, { useState } from 'react';
import { Layers } from 'lucide-react';

import FormField from './Form/FormField';
import { useProjectData } from '../contexts/GlobalDataContext';
import Heading3 from './Typography/Heading3';
import Paragraph from './Typography/Paragraph';
import useStudyRuns from '../hooks/useStudyRuns';
import {
  OUTPUT_MODE_RAW_ONLY,
  normalizeStudyOutputMode,
  isRawOutputEnabled,
  isProcessedOutputEnabled
} from '../utils/studyOutputMode';

const StudyMeasurementMappingCard = ({
  item,
  mappings,
  handleInputChange,
  singleRunMode = false,
  protocolLabel = '',
  protocolOptions = [],
  selectedProtocolByStudy = {},
  onStudyProtocolChange,
  fileFieldScope = 'raw',
  fileFieldLabel = 'Measurement File'
}) => {
  const { selectedTestSetupId, testSetups } = useProjectData();
  const allRuns = useStudyRuns();
  const [activeRunId] = useState(item?.runId || item?.id);
  const activeRun = singleRunMode ? item : (allRuns.find(r => r.runId === activeRunId) || item);

  const selectedTestSetup = testSetups.find((setup) => setup.id === selectedTestSetupId);
  const activeStudyId = activeRun?.studyId || item?.studyId || item?.id;
  const selectedProtocolId = selectedProtocolByStudy?.[activeStudyId] || '';
  const selectedOutputMode = normalizeStudyOutputMode(
    activeRun?.outputMode,
    OUTPUT_MODE_RAW_ONLY
  );
  const rawEnabled = isRawOutputEnabled(selectedOutputMode);
  const processedEnabled = isProcessedOutputEnabled(selectedOutputMode);
  const fileFieldEnabled = fileFieldScope === 'processed' ? processedEnabled : rawEnabled;
  const protocolFieldEnabled = fileFieldScope === 'processed' ? processedEnabled : true;

  if (!selectedTestSetupId) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-gray-500 text-lg">
        <Layers className="w-16 h-16 mb-4 text-gray-500" />
        <Heading3 className="text-xl font-semibold text-gray-700">No test setup selected</Heading3>
        <Paragraph className="text-center mt-1">
          Go to the project settings (icon with three layers) and select a test setup for your project
        </Paragraph>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl p-6 flex flex-col min-h-full">
      <div className="mb-3 border-b pb-2">
        <div className="flex items-center justify-between">
          <Heading3 className="text-3xl flex-grow pr-4">
            {activeRun?.displayName || activeRun?.name || 'Untitled run'}
          </Heading3>
          {activeRun && (
            <span className="px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-700 font-semibold">
              {activeRun?.runCount > 1 ? `Run ${activeRun?.runNumber}` : 'Single run'}
            </span>
          )}
        </div>
        <Paragraph className="text-sm text-gray-700 mt-1 italic">
          {activeRun?.description || 'No run description provided.'}
        </Paragraph>
        {protocolLabel && Array.isArray(protocolOptions) && protocolOptions.length > 0 && onStudyProtocolChange && (
          <div className="mt-3 max-w-sm">
            <FormField
              type="select"
              label={protocolLabel}
              name={`study-${activeStudyId}-protocol`}
              value={selectedProtocolId}
              tags={protocolOptions}
              placeholder={`Select ${protocolLabel.toLowerCase()}`}
              disabled={!protocolFieldEnabled}
              onChange={(e) => onStudyProtocolChange(activeStudyId, e.target.value)}
            />
          </div>
        )}
        {!protocolFieldEnabled && (
          <Paragraph className="text-xs text-gray-500 mt-2">
            Processing protocol is disabled because this study is set to raw-only output mode.
          </Paragraph>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(selectedTestSetup?.sensors || []).map((sensor, index) => {
          const existingMapping = mappings.find((m) => {
            const mappingStudyRunId = m.studyRunId || m.studyId;
            const targetRunId = activeRun?.runId || activeRun?.id;
            return mappingStudyRunId === targetRunId && m.sensorId === sensor.id;
          });

          const mapping = existingMapping || {
            sensorId: sensor.id,
            studyRunId: activeRun?.runId || activeRun?.id,
            studyId: activeRun?.studyId || activeRun?.id,
            value: '',
          };

          const sensorLabel =
            sensor?.alias || sensor?.name || `Sensor ${String(index + 1).padStart(2, '0')}`;

          return (
            <div
              key={sensor?.id ?? `sensor-${index}`}
              className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm"
            >
              <div className="mb-2 font-semibold text-gray-700">{sensorLabel}</div>
              <FormField
                label={fileFieldLabel}
                name={`sensor-${sensor.id}`}
                value={mapping.value}
                commitOnBlur
                disabled={!fileFieldEnabled}
                onChange={(e) =>
                  handleInputChange(
                    0,
                    {
                      sensorId: sensor.id,
                      studyRunId: mapping.studyRunId || (activeRun?.runId || activeRun?.id),
                      studyId: activeRun?.studyId || activeRun?.id,
                    },
                    e.target.value
                  )
                }
                placeholder={fileFieldEnabled ? 'Enter filename or value' : 'Disabled for selected output mode'}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StudyMeasurementMappingCard;
