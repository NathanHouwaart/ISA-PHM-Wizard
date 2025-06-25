import React, { useState, useEffect } from 'react';
import { X, Save, Trash, Trash2, HelpCircle, ChevronDown, ChevronRight, Bold } from 'lucide-react';
import AnimatedTooltip, { AnimatedTooltipExample, AnimatedTooltipExplanation } from '../Tooltip/AnimatedTooltip';
import { cn } from '../../utils/utils';
import FormField from '../Form/FormField';
import { BaseInput, FormField2, FormFieldLabel } from '../Form/Inputs';

// Main TestSetupForm Component
const StudyForm = ({ item, onSave, onCancel, isEditing = false }) => {
  const initialFormState = {
    identifier: '',
    title: '',
    description: '',
    submissionDate: '',
    publicationDate: '',
    name: '',
    location: '',
    description: '',
    characteristics: [],
    sensors: []
  };

  const [formData, setFormData] = useState(initialFormState);

  // Calculate number of sensors from sensors array
  const numberOfSensors = formData.sensors.length;
  const numberOfCharacteristics = formData.characteristics.length

  useEffect(() => {
    console.log(item)
    if (item) {
      setFormData({
        identifier : item.identifier || '',
        title : item.title || '',
        submissionDate : item.submissionDate || '',
        publicationDate : item.publicationDate || '',
        name: item.name || '',
        location: item.location || '',
        description: item.description || '',
        characteristics: item.characteristics || [],
        sensors: item.sensors || []
      });
    } else {
      setFormData(initialFormState);
    }
  }, [item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please fill in all required fields (Name, Location)');
      return;
    }

    const testSetupData = {
      ...formData,
      number_of_sensors: numberOfSensors, // Include the calculated number
      id: isEditing && item.id ? item.id : `testsetup-${Date.now()}`
    };

    onSave(testSetupData);
  };

  const handleChange = (e) => {
      const { name, value } = e.target;
      console.log(name)
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  useEffect(() => {
    console.log(formData);
  }, [formData])

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-2";

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
                label="Title" 
                type='text' 
                placeholder="Study Title" 
                example="eg. BPFO Fault Severty 1 100%" 
                explanation={"Title of the study"}
            />

            <FormField name={"description"} label="Description" type='textarea' placeholder="Study Description" example="eg. BPFO Fault Severty 1 100%" explanation={"Title of the study"}/>

          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div> */}
                <FormField label="Submission Date" type='date' example="10-12-2024" explanation={"Date when Study was submitted"}/>
            {/* </div> */}
            {/* <div> */}
                <FormField label="Publication Date" type='date' example="10-12-2024" explanation={"Date when Study was published"}/>
            {/* </div> */}
          {/* </div> */}
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