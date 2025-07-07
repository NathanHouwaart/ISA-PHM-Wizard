import React, { useState, useEffect } from 'react';
import { X, Save, Trash, Trash2, HelpCircle, ChevronDown, ChevronRight, Bold } from 'lucide-react';
import AnimatedTooltip, { AnimatedTooltipExample, AnimatedTooltipExplanation } from '../Tooltip/AnimatedTooltip';
import { cn } from '../../utils/utils';
import FormField from '../Form/FormField';
import { BaseInput, FormField2, FormFieldLabel } from '../Form/Inputs';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import { v4 as uuidv4 } from 'uuid';

// Main TestSetupForm Component
const StudyForm = ({ item, onSave, onCancel, isEditing = false }) => {

  const {studies } = useGlobalDataContext();

  // Define your initial form state here, outside the component
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    submissionDate: '',
    publicationDate: ''
  });

  useEffect(() => {
      setFormData({
        id: item?.id || '',
        title: item?.title || '',
        description: item?.description || '',
        submissionDate: item?.submissionDate|| '',
        publicationDate: item?.publicationDate || '',
      });
  }, [item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
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
    const { name, value } = e.target;
    // console.log(name)
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  useEffect(() => {
    // console.log(formData);
  }, [formData])

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-300 max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Study' : 'Add new Study'}
          </h3>
          <button
            onClick={onCancel}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="bg-gray-50 rounded-lg space-y-1 pt-2">

          <FormField
            name={"title"}
            onChange={handleChange}
            value={formData.title}
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
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isEditing ? 'Update Study' : 'Add Study'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyForm;