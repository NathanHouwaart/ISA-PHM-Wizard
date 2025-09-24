import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import FormField from '../Form/FormField';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import { v4 as uuidv4 } from 'uuid';
import TooltipButton from '../Widgets/TooltipButton';

// Main TestSetupForm Component
const StudyForm = ({ item, onSave, onCancel, isEditing = false }) => {

  const { studies } = useGlobalDataContext();

  // Define your initial form state here, outside the component
  const [formData, setFormData] = useState({
    id: item?.id || '',
    name: item?.name || '',
    description: item?.description || '',
    submissionDate: item?.submissionDate || '',
    publicationDate: item?.publicationDate || '',
  });


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please fill in all required fields (Name, Location)');
      return;
    }

    const studyData = {
      ...formData,
      id: isEditing && item.id ? item.id : uuidv4(), // Generate a new ID if not editing}`
    };

    onSave(studyData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };


  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-300 max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Study' : 'Add new Study'}
          </h3>
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
        {/* Basic Information */}
        <div className="rounded-lg space-y-2 pt-2">

          <FormField
            name={"name"}
            onChange={handleChange}
            value={formData.name}
            label="Title"
            type='text'
            placeholder="Study Title"
            example="eg. BPFO Fault Severty 1 100%"
            explanation={"Title of the study"}
          />

          <FormField
            name={"description"}
            onChange={handleChange}
            value={formData.description}
            label="Description"
            type='textarea'
            placeholder="Study Description"
            example="eg. BPFO Fault Severty 1 100%"
            explanation={"Description of the study"}
          />

          <FormField
            name={"submissionDate"}
            onChange={handleChange}
            value={formData.submissionDate}
            label="Submission Date"
            type='date'
            example="10-12-2024"
            explanation={"Date when Study was submitted"} />

          <FormField
            name={"publicationDate"}
            onChange={handleChange}
            value={formData.publicationDate}
            label="Publication Date"
            type='date'
            example="10-12-2024"
            explanation={"Date when Study was published"} />

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