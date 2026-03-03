import React from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import FormField from '../Form/FormField';
import DataGrid from '../DataGrid/DataGrid';
import IconTooltipButton from '../Widgets/IconTooltipButton';

const ProtocolEntityGridSection = ({
  title,
  count = 0,
  items = [],
  itemPrefix,
  activeItemId = null,
  onToggleItem,
  onAddItem,
  onRemoveItem,
  onUpdateItemField,
  addButtonTooltip,
  removeButtonTooltip,
  accentDotClassName,
  description,
  sensors = [],
  gridConfig,
  onGridMappingsChange,
  onGridRowDataChange,
  isTabActive = false,
  historyScopeKey = '',
  emptyStateTitle,
  emptyStateHint
}) => {
  return (
    <div className="mt-3 bg-gray-50 rounded-lg p-4">
      <div className="p-2 mb-4 flex justify-between items-center border-b border-b-gray-300">
        <Heading3>
          {title}
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({count} items)
          </span>
        </Heading3>
        <div className='flex items-center space-x-2'>
          <IconTooltipButton
            icon={Plus}
            onClick={onAddItem}
            tooltipText={addButtonTooltip}
          />
        </div>
      </div>

      <Paragraph className={"px-2 pb-4 border-b border-gray-300 mb-3 text-sm text-gray-600"}>
        {description}
      </Paragraph>

      <div className="space-y-1">
        {items.map((item, index) => {
          const isExpanded = activeItemId === item.id;
          const parameterCount = item.parameters?.length || 0;

          return (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onToggleItem?.(item.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${accentDotClassName}`}></span>
                    <span className="font-medium text-gray-900">
                      {itemPrefix}{index + 1}:
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 truncate max-w-md">
                    <span className='font-bold'>{item.name || `Unnamed ${title.slice(0, -1)}`}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {parameterCount} parameter{parameterCount === 1 ? '' : 's'}
                  </span>
                  <IconTooltipButton
                    icon={Trash2}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem?.(item.id);
                    }}
                    className="h-6.5 w-6.5 text-gray-400 hover:bg-red-100 rounded-md p-1 transition-colors"
                    tooltipText={removeButtonTooltip}
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
                <div className="border-t border-gray-200 p-4 bg-white space-y-4">
                  <FormField
                    name={`${itemPrefix}-protocol-${index}-name`}
                    label={`${title.slice(0, -1)} Name`}
                    value={item.name || ''}
                    onChange={(e) => onUpdateItemField?.(item.id, 'name', e.target.value)}
                    type="text"
                    placeholder="Enter protocol name"
                  />

                  <FormField
                    name={`${itemPrefix}-protocol-${index}-description`}
                    label="Description"
                    value={item.description || ''}
                    onChange={(e) => onUpdateItemField?.(item.id, 'description', e.target.value)}
                    type="textarea"
                    placeholder="Optional notes for this protocol variant"
                    className="min-h-20"
                  />

                  {sensors.length === 0 ? (
                    <Paragraph className="text-sm text-gray-500 bg-white border border-gray-200 rounded-lg p-3">
                      Add sensors first to map parameter values per sensor.
                    </Paragraph>
                  ) : (
                    <div className="border border-gray-200 rounded-lg">
                      <DataGrid
                        {...gridConfig}
                        showControls={true}
                        showDebug={false}
                        historyScopeKey={historyScopeKey}
                        isActive={isTabActive && activeItemId === item.id}
                        onDataChange={onGridMappingsChange}
                        onRowDataChange={(nextRows) => onGridRowDataChange?.(item.id, nextRows)}
                        height={"45vh"}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">{emptyStateTitle}</p>
            <p className="text-sm">{emptyStateHint}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProtocolEntityGridSection;
