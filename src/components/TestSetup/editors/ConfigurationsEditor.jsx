import React, { useState } from 'react';
import { X, Trash2, HelpCircle, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import FormField from '../../Form/FormField';
import Heading3 from '../../Typography/Heading3';
import { v4 as uuid4 } from 'uuid';
import IconTooltipButton, { IconToolTipButton } from '../../Widgets/IconTooltipButton';
import TooltipButton from '../../Widgets/TooltipButton';
import TableTooltip from '../../Widgets/TableTooltip';
import Paragraph from '../../Typography/Paragraph';
// Configurations Component
const ConfigurationsEditor = ({ configurations, onConfigurationsChange }) => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [activeTooltip, setActiveTooltip] = useState(false);

  const addConfiguration = () => {
    const newConfiguration = {
      id: uuid4(),
      name: '',
      replaceableComponentId: '',
      details: []
    };
    const newConfigurations = [...configurations, newConfiguration];
    onConfigurationsChange(newConfigurations);

    // Auto-expand the new item
    setExpandedItems(prev => new Set([...prev, newConfigurations.length - 1]));
  };

  const updateConfiguration = (index, field, value) => {
    const updated = configurations.map((config, i) =>
      i === index ? { ...config, [field]: value } : config
    );
    onConfigurationsChange(updated);
  };

  const removeConfiguration = (index) => {
    const filtered = configurations.filter((_, i) => i !== index);
    onConfigurationsChange(filtered);

    setExpandedItems(prev => {
      const newSet = new Set();
      Array.from(prev).forEach(i => {
        if (i < index) newSet.add(i);
        else if (i > index) newSet.add(i - 1);
      });
      return newSet;
    });
  };

  const toggleExpanded = (index) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const addDetail = (configIndex) => {
    const newEntry = { id: uuid4(), name: '', value: '' };
    const updated = configurations.map((config, i) => {
      if (i !== configIndex) return config;
      return { ...config, details: [...(config.details || []), newEntry] };
    });
    onConfigurationsChange(updated);
  };

  const updateDetail = (configIndex, detailIndex, field, value) => {
    const updated = configurations.map((config, i) => {
      if (i !== configIndex) return config;
      const newDetails = [...(config.details || [])];
      newDetails[detailIndex] = { ...newDetails[detailIndex], [field]: value };
      return { ...config, details: newDetails };
    });
    onConfigurationsChange(updated);
  };

  const removeDetail = (configIndex, detailIndex) => {
    const updated = configurations.map((config, i) => {
      if (i !== configIndex) return config;
      const newDetails = [...(config.details || [])];
      newDetails.splice(detailIndex, 1);
      return { ...config, details: newDetails };
    });
    onConfigurationsChange(updated);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="p-2 mb-4 flex justify-between items-center border-b border-b-gray-300">
        <Heading3>
          Configurations
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({configurations.length} items)
          </span>
        </Heading3>

        <div className='flex items-center space-x-2'>
          <IconTooltipButton
            icon={Plus}
            onClick={addConfiguration}
            tooltipText={"Add Configuration"}
          />

          <IconTooltipButton
            icon={HelpCircle}
            onClick={(e) => { e.stopPropagation(); setActiveTooltip(!activeTooltip) }}
            tooltipText={"Help"}
          />
        </div>
      </div>

      <Paragraph className={"px-2 pb-4 border-b border-gray-300 mb-3 text-sm text-gray-600"}>
        Define configurations for this test setup. Each configuration represents a specific setup variant (e.g. a particular replaceable component used during a study).
      </Paragraph>

      <div>
        <TableTooltip isVisible={activeTooltip}
          explanations={[
            <><b>Name:</b> Name of the configuration (e.g. "Healthy Bearing", "Faulty Bearing BPFO")</>,
            <><b>Replaceable Component ID:</b> Identifier for the specific component used in this configuration</>,
            <><b>Details:</b> Additional key-value pairs describing the configuration (optional)</>
          ]}
          examples={[
            { name: "Healthy Bearing", "RC ID": "RC-001" },
            { name: "Faulty Bearing BPFO", "RC ID": "RC-002" }
          ]}
        />
      </div>

      <div className="space-y-1">
        {configurations.map((config, index) => {
          const isExpanded = expandedItems.has(index);
          const detailsCount = config.details?.length || 0;

          return (
            <div key={config.id ?? `config-${index}`} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpanded(index)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span className="font-medium text-gray-900">
                      c{index + 1}:
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 truncate max-w-md">
                    <span className='font-bold'>{config.name || 'Unnamed Configuration'}: </span>
                    {config.replaceableComponentId ? `: ${config.replaceableComponentId}` : 'No RC ID'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <IconTooltipButton
                    icon={Trash2}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeConfiguration(index);
                    }}
                    className="h-6.5 w-6.5 text-gray-400 hover:bg-red-100 rounded-md p-1 transition-colors"
                    tooltipText={"Remove configuration"}
                  />
                  <span className="text-gray-400">
                    {isExpanded ?
                      <ChevronDown className="w-4 h-4 text-gray-500" /> :
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    }
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-200 p-4 bg-white space-y-4">
                  <FormField
                    name={`config-${index}-name`}
                    value={config.name}
                    onChange={(e) => updateConfiguration(index, 'name', e.target.value)}
                    label="Configuration Name"
                    type="text"
                    placeholder="Enter configuration name"
                  />

                  <FormField
                    name={`config-${index}-replaceableComponentId`}
                    value={config.replaceableComponentId || ''}
                    onChange={(e) => updateConfiguration(index, 'replaceableComponentId', e.target.value)}
                    label="Replaceable Component ID"
                    type="text"
                    placeholder="e.g. RC-001"
                    explanation="Identifier for the replaceable component used in this configuration"
                  />

                  {/* Details (key-value pairs) */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <Heading3 className="text-sm font-semibold text-gray-700">
                        Details ({detailsCount})
                      </Heading3>
                      <TooltipButton
                        tooltipText="Add detail"
                        onClick={() => addDetail(index)}
                        className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                      >
                        <span>Add Detail</span>
                      </TooltipButton>
                    </div>

                    <div className="space-y-3">
                      {(config.details || []).map((detail, detailIdx) => (
                        <div key={detail.id ?? `detail-${detailIdx}`} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Paragraph className="text-sm font-medium text-gray-700">
                              Detail {detailIdx + 1}
                            </Paragraph>
                            <IconToolTipButton
                              icon={X}
                              onClick={() => removeDetail(index, detailIdx)}
                              tooltipText="Remove detail"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              name={`config-${index}-detail-${detailIdx}-name`}
                              value={detail.name}
                              onChange={(e) => updateDetail(index, detailIdx, 'name', e.target.value)}
                              label="Name"
                              type="text"
                              placeholder="e.g. Replaceable Component ID"
                            />

                            <FormField
                              name={`config-${index}-detail-${detailIdx}-value`}
                              value={detail.value}
                              onChange={(e) => updateDetail(index, detailIdx, 'value', e.target.value)}
                              label="Value"
                              type="text"
                              placeholder="e.g. RC-001"
                            />
                          </div>
                        </div>
                      ))}

                      {detailsCount === 0 && (
                        <Paragraph className="text-sm text-gray-500 text-center py-6">
                          No details added yet. Click "Add Detail" to get started.
                        </Paragraph>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {configurations.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">No configurations added yet.</p>
            <p className="text-sm">Click "Add Configuration" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigurationsEditor;

