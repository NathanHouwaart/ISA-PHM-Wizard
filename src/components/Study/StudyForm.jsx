import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import FormField from '../Form/FormField';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import generateId from '../../utils/generateId';
import TooltipButton from '../Widgets/TooltipButton';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import { getExperimentTypeConfig } from '../../constants/experimentTypes';

// Main TestSetupForm Component
const StudyForm = ({ item, onSave, onCancel, isEditing = false }) => {

  const { studies, experimentType, testSetups, selectedTestSetupId } = useGlobalDataContext();
  const experimentConfig = getExperimentTypeConfig(experimentType);
  const runCountDisabled = !experimentConfig.supportsMultipleRuns;

  // Define your initial form state here, outside the component
  const [formData, setFormData] = useState({
    id: item?.id || '',
    name: item?.name || '',
    description: item?.description || '',
    submissionDate: item?.submissionDate || '',
    publicationDate: item?.publicationDate || '',
    runCount: item?.runCount ?? 1,
    configurationId: item?.configurationId || '',
  });
  const [formError, setFormError] = useState('');


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Please fill in all required fields (Study Name).');
      return;
    }
    setFormError('');

    const normalizedRunCount = runCountDisabled ? 1 : Math.max(1, Number.parseInt(formData.runCount, 10) || 1);

    const studyData = {
      ...formData,
      runCount: normalizedRunCount,
      id: isEditing && item.id ? item.id : generateId(), // Generate a new ID if not editing}`
    };

    onSave(studyData);
  };

  const handleChange = (e) => {
    if (runCountDisabled && e.target.name === 'runCount') {
      return;
    }
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  useEffect(() => {
    if (runCountDisabled && formData.runCount !== 1) {
      setFormData((prev) => ({
        ...prev,
        runCount: 1
      }));
    }
  }, [runCountDisabled, formData.runCount]);

  const runCountExplanation = runCountDisabled
    ? 'This experiment type always uses a single file per study.'
    : 'Specify how many repeated runs/trajectories were collected for this study. Set to 1 if only a single run exists.';


  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-300 max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 z-10">
        <div className="flex items-center justify-between">
          <Heading3 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Study' : 'Add new Study'}
          </Heading3>
          <TooltipButton
            className="p-2 bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={onCancel}
            tooltipText="Close"
          >
            <X className="w-5 h-5" />
          </TooltipButton>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {formError && (
          <Paragraph className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {formError}
          </Paragraph>
        )}
        {/* Basic Information */}
        <div className="rounded-lg space-y-2 pt-2">

          <FormField
            name={"name"}
            onChange={handleChange}
            value={formData.name}
            label="Study Name"
            type='text'
            placeholder="Study Name"
            explanation="Name of the study"
            example="BPFO Fault Severty 1 100%"
            required
          />

          <FormField
            name={"description"}
            onChange={handleChange}
            value={formData.description}
            label="Study Description"
            type='textarea'
            placeholder="Study Description"
            explanation="Description of the study"
            example="A bearing with a BPFO fault of severity 1 at 100% speed"
          />

          <FormField
            name={"submissionDate"}
            onChange={handleChange}
            value={formData.submissionDate}
            label="Submission Date"
            type='date'
            explanation="The date when the study data was submitted to the database. If not applicable, please leave empty." 
            example="10-12-2024"
          />

          <FormField
            name={"publicationDate"}
            onChange={handleChange}
            value={formData.publicationDate}
            label="Publication Date"
            type='date'
            explanation="The date when the study data was published to the database. If not applicable, please leave empty." 
            example="10-12-2024"
          />

          {experimentConfig.supportsMultipleRuns && (
            <FormField
              name={"runCount"}
              onChange={handleChange}
              value={formData.runCount}
              label="Number of runs"
              type='number'
              min={1}
              explanation={runCountExplanation}
              example="3"
              required
            />
          )}

          <FormField
            name={"configurationId"}
            onChange={handleChange}
            value={formData.configurationId}
            label="Test Setup Configuration"
            type='select'
            placeholder='No configuration selected'
            tags={(() => {
              const selectedSetup = testSetups?.find(t => t.id === selectedTestSetupId);
              const configs = selectedSetup?.configurations || [];
              return configs.map(c => ({ value: c.id, label: c.name || 'Unnamed' }));
            })()}
            explanation="Select which configuration of the test setup was used for this study"
            disabled={!selectedTestSetupId}
          />

        </div>


        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 pr-0 flex justify-end space-x-3">
          <TooltipButton
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            tooltipText="Cancel"
          >
            <span>Cancel</span>
          </TooltipButton>
          <TooltipButton
            type="button" // Change to "submit" if you want native form submission
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
            tooltipText={isEditing ? 'Update Study' : 'Add Study'}
          >
            <Save className="w-4 h-4" />
            <span>{isEditing ? 'Update Study' : 'Add Study'}</span>
          </TooltipButton>
        </div>
      </div>
    </div>
  );
};

export default StudyForm;
