import React from 'react';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import FormField from '../../Form/FormField';
import IconTooltipButton from '../../Widgets/IconTooltipButton';
import CommentEditor from './CommentEditor';

const CharacteristicCard = ({
  characteristic,
  index,
  isExpanded,
  onToggle,
  onRemove,
  onUpdateField,
  onCommentsChange,
}) => {
  const summary = `${characteristic.value || 'No value'} ${characteristic.unit || ''}`.trim();

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="font-medium text-gray-900">
              c{index + 1}:
            </span>
          </div>
          <span className="text-sm text-gray-600 truncate max-w-md">
            <span className="font-bold">{characteristic.category || 'No category'}: </span>
            {summary}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {characteristic.comments?.length || 0} comments
          </span>

          <IconTooltipButton
            icon={Trash2}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="h-6.5 w-6.5 text-gray-400 hover:bg-red-100 rounded-md p-1 transition-colors"
            tooltipText="Remove characteristic"
          />
          <span className="text-gray-400">
            {isExpanded
              ? <ChevronDown className="w-4 h-4 text-gray-500" />
              : <ChevronRight className="w-4 h-4 text-gray-500" />
            }
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex items-start gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              <FormField
                name={`characteristic-${index}-category`}
                value={characteristic.category}
                onChange={(e) => onUpdateField('category', e.target.value)}
                label="Category"
                type="text"
                placeholder="Enter category"
              />

              <FormField
                name={`characteristic-${index}-value`}
                value={characteristic.value}
                onChange={(e) => onUpdateField('value', e.target.value)}
                label="Value"
                type="text"
                placeholder="Enter value"
              />

              <FormField
                name={`characteristic-${index}-unit`}
                value={characteristic.unit}
                onChange={(e) => onUpdateField('unit', e.target.value)}
                label="Unit"
                type="text"
                placeholder="Enter unit (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <CommentEditor
            comments={characteristic.comments || []}
            onCommentsChange={onCommentsChange}
          />
        </div>
      )}
    </div>
  );
};

export default CharacteristicCard;
