import { Edit2, Trash2 } from 'lucide-react';
import React from 'react';

import AvatarInitials from '../Widgets/AvatarInitials';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import TooltipButton from '../Widgets/TooltipButton';

/**
 * StudyVariableCard Component
 * 
 * Card component for displaying study variable information with edit/remove actions.
 * Shows variable name, type, unit, and description with gradient avatar.
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.item - The study variable object
 * @param {string} props.item.name - Variable name
 * @param {string} props.item.type - Variable type
 * @param {string} [props.item.unit] - Variable unit
 * @param {string} props.item.description - Variable description
 * @param {() => void} props.onEdit - Handler for edit action
 * @param {() => void} props.onRemove - Handler for remove action
 * @returns {JSX.Element} Study variable card with actions
 */
const StudyVariableCard = ({ item, onEdit, onRemove }) => {
  const variable = item;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex grow-0 items-center space-x-4">
          <AvatarInitials 
            name={variable?.name || 'Variable'} 
            size="md"
            gradientFrom="from-green-500"
            gradientTo="to-teal-600"
          />
          <div>
            <Heading3 className="line-clamp-1 mr-4 text-gray-900">
              {variable.name}
            </Heading3>
            <div className="mt-2 mb-3">
              <Paragraph className="min-h-10 text-gray-700 text-sm italic line-clamp-2">
                {variable.description || "No description available"}
              </Paragraph>
            </div>
            <div className="mt-2 text-sm text-gray-500 space-y-1">
              <div className="flex items-center space-x-2">
                <Paragraph className="font-bold flex-none">Type -</Paragraph>
                <span className="flex-1 min-w-0 truncate">{(variable?.type && String(variable.type).trim()) ? variable.type : 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Paragraph className="font-bold flex-none">Unit -</Paragraph>
                <span className="flex-1 min-w-0 truncate">{(variable?.unit && String(variable.unit).trim()) ? variable.unit : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <TooltipButton
            className="p-2 bg-transparent text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            onClick={(e) => { e.stopPropagation(); onEdit(item) }}
            tooltipText="Edit variable"
          >
            <Edit2 className="w-4 h-4" />
          </TooltipButton>
          <TooltipButton
            className="p-2 bg-transparent text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
            tooltipText="Remove variable"
          >
            <Trash2 className="w-4 h-4" />
          </TooltipButton>
        </div>
      </div>
    </div>
  );
};

export default StudyVariableCard;
