import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

import FormField from '../Form/FormField';
import TooltipButton from '../Widgets/TooltipButton';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import {
  VARIABLE_TYPE_OPTIONS,
  STUDY_VARIABLE_VALUE_MODE_OPTIONS,
  STUDY_VARIABLE_VALUE_MODE_SCALAR,
  normalizeStudyVariableValueMode
} from '../../constants/variableTypes';
import generateId from '../../utils/generateId';
import SuggestionStrip from '../Suggestions/SuggestionStrip';

/**
 * StudyVariableForm Component
 * 
 * Form for editing study variable properties.
 * Used within Collection for creating and updating variables.
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.item - The variable being edited (null for new)
 * @param {(data: Object) => void} props.onSave - Save handler
 * @param {() => void} props.onCancel - Cancel handler
 * @param {boolean} props.isEditing - Whether editing existing item
 * @param {string} [props.lockedType] - If provided, type is fixed to this value and field is hidden/readonly
 * @param {string[]} [props.allowedTypes] - If provided, limits the type dropdown options
 * @returns {JSX.Element} Variable edit form
 */
const StudyVariableForm = ({
  item,
  onSave,
  onCancel,
  isEditing = false,
  allowedTypes,
  lockedType,
  suggestions = [],
  onAddSuggestionAsNew
}) => {
  const [formData, setFormData] = useState({
    id: item?.id || '',
    name: item?.name || 'New Variable',
    type: item?.type || lockedType || (allowedTypes ? allowedTypes[0] : VARIABLE_TYPE_OPTIONS[0]),
    valueMode: normalizeStudyVariableValueMode(item?.valueMode, STUDY_VARIABLE_VALUE_MODE_SCALAR),
    unit: item?.unit || '',
    description: item?.description || ''
  });
  const [formError, setFormError] = useState('');

  const typeOptions = allowedTypes || VARIABLE_TYPE_OPTIONS;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Please fill in all required fields (Variable Name).');
      return;
    }
    setFormError('');

    const variableData = {
      ...formData,
      id: isEditing && item?.id ? item.id : generateId()
    };

    onSave(variableData);
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
          <Heading3 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Variable' : 'Add new Variable'}
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

        <SuggestionStrip
          title="Suggested variables"
          subtitle="Click to add one of these suggestions as a new variable."
          suggestions={suggestions}
          onSelect={onAddSuggestionAsNew}
        />
        
        <div className="rounded-lg space-y-2 pt-2">
      <FormField
        label="Variable Name"
        name="name"
        value={formData.name || ''}
        onChange={handleChange}
        placeholder="Enter variable name"
        explanation="The name of the study variable"
        example="Temperature, Pressure, RPM"
        required
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type
        </label>
        {lockedType ? (
          <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500">
             {lockedType}
          </div>
        ) : (
          <select
            name="type"
            value={formData.type || typeOptions[0]}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Value Mode
        </label>
        <select
          name="valueMode"
          value={normalizeStudyVariableValueMode(formData.valueMode, STUDY_VARIABLE_VALUE_MODE_SCALAR)}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STUDY_VARIABLE_VALUE_MODE_OPTIONS.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </div>

      <FormField
        label="Unit"
        name="unit"
        value={formData.unit || ''}
        onChange={handleChange}
        placeholder="Enter unit"
        explanation="The unit of measurement for this variable"
        example="°C, Pa, Hz, rpm"
      />

      <FormField
        label="Description"
        name="description"
        value={formData.description || ''}
        onChange={handleChange}
        placeholder="Enter description"
        explanation="Detailed description of the variable"
        example="Ambient temperature measured at sensor location"
        type="textarea"
      />
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-300 px-6 py-4 flex justify-end space-x-3">
        <TooltipButton
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          tooltipText="Cancel and close"
        >
          Cancel
        </TooltipButton>
        <TooltipButton
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
          tooltipText="Save variable"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </TooltipButton>
      </div>
    </div>
  );
};

export default StudyVariableForm;
