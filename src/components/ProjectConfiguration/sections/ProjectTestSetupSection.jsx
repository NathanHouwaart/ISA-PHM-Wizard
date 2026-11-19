import React, { useState } from 'react';
import Heading3 from '../../Typography/Heading3';
import Paragraph from '../../Typography/Paragraph';
import TooltipButton from '../../Widgets/TooltipButton';
import TestSetupPickerDialog from '../../TestSetup/TestSetupPickerDialog';
import { useProjectData } from '../../../contexts/GlobalDataContext';
import { getTestSetupReadiness } from '../../../utils/testSetupReadiness';

const ProjectTestSetupSection = ({ projectId: _projectId, value, onChange }) => {
  const { testSetups = [] } = useProjectData();
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedSetup = Array.isArray(testSetups)
    ? testSetups.find((setup) => setup?.id === value)
    : null;
  const readinessIssues = selectedSetup ? getTestSetupReadiness(selectedSetup) : [];

  return (
    <>
      <div className="space-y-4 mt-4">
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <Heading3 className="text-sm text-gray-900">Selected test setup</Heading3>
          <Paragraph className="text-sm text-gray-700 mt-2">
            {selectedSetup ? (selectedSetup.name?.trim() || 'Untitled test setup') : 'No test setup linked'}
          </Paragraph>
          {readinessIssues.length > 0 && <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Incomplete — this setup remains linked, but cannot be exported yet.</p><ul className="mt-1 list-inside list-disc">{readinessIssues.map((issue, index) => <li key={index}>{issue.message}</li>)}</ul></div>}
        </div>
        <div className="flex items-center gap-3">
          <TooltipButton
            tooltipText="Choose a test setup from the catalog"
            onClick={() => setPickerOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {selectedSetup ? 'Change test setup' : 'Select test setup'}
          </TooltipButton>
          <TooltipButton
            tooltipText="Clear the associated test setup"
            onClick={() => onChange?.(null)}
            disabled={!selectedSetup}
            className={`px-4 py-2 rounded-lg border ${selectedSetup ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50' : 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'}`}
          >
            Remove selection
          </TooltipButton>
        </div>
      </div>

      {pickerOpen && (
        <TestSetupPickerDialog
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onConfirm={(setupId) => {
            onChange?.(setupId);
            setPickerOpen(false);
          }}
          testSetups={testSetups}
          selectedSetupId={value}
        />
      )}
    </>
  );
};

export default ProjectTestSetupSection;
