import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Save, Trash2, HelpCircle, ChevronDown, ChevronRight, Plus, } from 'lucide-react';
import AnimatedTooltip, { AnimatedTooltipExample, AnimatedTooltipExplanation } from '../Tooltip/AnimatedTooltipProvider';
import FormField from '../Form/FormField';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import Heading3 from '../Typography/Heading3';
import { v4 as uuid4 } from 'uuid';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';


import IconTooltipButton, { IconToolTipButton } from '../Widgets/IconTooltipButton';
import TooltipButton from '../Widgets/TooltipButton';
import AlertDecisionDialog from '../Widgets/AlertDecisionDialog';
import TableTooltip from '../Widgets/TableTooltip';
import Paragraph, { SlidePageSubtitle } from '../Typography/Paragraph';
import DataGrid from '../DataGrid/DataGrid';
import { Template } from '@revolist/react-datagrid';
import { DeleteRowCellTemplate, PatternCellTemplate } from '../DataGrid/CellTemplates';
import ProtocolEntityGridSection from './ProtocolEntityGridSection';

const normalizeForDirtyCheck = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeForDirtyCheck);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        if (key === 'id') return acc;
        const normalized = normalizeForDirtyCheck(value[key]);
        if (normalized !== undefined) {
          acc[key] = normalized;
        }
        return acc;
      }, {});
  }

  return value;
};

const getDirtyFingerprint = (value) => JSON.stringify(normalizeForDirtyCheck(value));

// Comment Component
const CommentEditor = ({ comments = [], onCommentsChange }) => {
  useEffect(() => {
    if (comments.some((comment) => !comment.id)) {
      onCommentsChange(
        comments.map((comment) => (comment.id ? comment : { ...comment, id: uuid4() }))
      );
    }
  }, [comments, onCommentsChange]);

  const addComment = useCallback(() => {
    const newComments = [...comments, { id: uuid4(), name: '', value: '' }];
    onCommentsChange(newComments);
  }, [comments, onCommentsChange]);

  const updateComment = useCallback((id, field, value) => {
    const updatedComments = comments.map((comment) =>
      comment.id === id ? { ...comment, [field]: value } : comment
    );
    onCommentsChange(updatedComments);
  }, [comments, onCommentsChange]);

  const removeComment = useCallback((id) => {
    const filteredComments = comments.filter((comment) => comment.id !== id);
    onCommentsChange(filteredComments);
  }, [comments, onCommentsChange]);

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <Heading3 className="text-sm font-semibold text-gray-700">
          Comments ({comments.length})
        </Heading3>
        <TooltipButton
          tooltipText="Add comment"
          onClick={addComment}
          className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <span>Add Comment</span>
        </TooltipButton>
      </div>

      <div className="space-y-4">
        {comments.map((comment, index) => (
          <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Paragraph className="text-sm font-medium text-gray-700">
                Comment {index + 1}
              </Paragraph>
              <IconToolTipButton
                icon={X}
                onClick={() => removeComment(comment.id)}
                tooltipText="Remove comment"
              />
            </div>

            <div className="space-y-3">
              <FormField
                name={`comment-${index}-title`}
                type="text"
                value={comment.name}
                label="Comment Title"
                placeholder="Enter a title for this comment"
                onChange={(e) => updateComment(comment.id, 'name', e.target.value)}
                required
              />

              <FormField
                name={`comment-${index}-text`}
                type="textarea"
                value={comment.value}
                label="Comment Text"
                placeholder="Enter your comment text here..."
                onChange={(e) => updateComment(comment.id, 'value', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <Paragraph className="text-sm text-gray-500 text-center py-6">
            No comments added yet. Click "Add Comment" to get started.
          </Paragraph>
        )}
      </div>
    </div>
  );
};

// Characteristics Component
const CharacteristicsEditor = ({ characteristics, onCharacteristicsChange }) => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [activeTooltips, setActiveTooltips] = useState(new Set());
  const [activeTooltip, setActiveTooltip] = useState(false);


  const addCharacteristic = () => {
    const newCharacteristic = {
      id: uuid4(),
      category: '',
      value: '',
      unit: '',
      comments: []
    };
    const newCharacteristics = [...characteristics, newCharacteristic];
    onCharacteristicsChange(newCharacteristics);

    // Auto-expand the new item
    setExpandedItems(prev => new Set([...prev, newCharacteristics.length - 1]));
  };

  const updateCharacteristic = (index, field, value) => {
    const updatedCharacteristics = characteristics.map((char, i) =>
      i === index ? { ...char, [field]: value } : char
    );
    onCharacteristicsChange(updatedCharacteristics);
  };

  const removeCharacteristic = (index) => {
    const filteredCharacteristics = characteristics.filter((_, i) => i !== index);
    onCharacteristicsChange(filteredCharacteristics);

    // Update expanded items
    setExpandedItems(prev => {
      const newSet = new Set();
      Array.from(prev).forEach(i => {
        if (i < index) newSet.add(i);
        else if (i > index) newSet.add(i - 1);
      });
      return newSet;
    });
  };

  const toggleTooltip = (index) => {
    setActiveTooltips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
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

  const updateComments = (charIndex, comments) => {
    updateCharacteristic(charIndex, 'comments', comments);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="p-2 mb-4 flex justify-between items-center border-b border-b-gray-300">
        <Heading3>
          Characteristics
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({characteristics.length} items)
          </span>
        </Heading3>


        <div className='flex items-center space-x-2'>
          <IconTooltipButton
            icon={Plus}
            onClick={addCharacteristic}
            tooltipText={"Add characteristic"}
          />

          <IconTooltipButton
            icon={HelpCircle}
            onClick={(e) => { e.stopPropagation(); setActiveTooltip(!activeTooltip) }}
            tooltipText={"Help"}
          />
        </div>

      </div>

      <Paragraph className={"px-2 pb-4 border-b border-gray-300 mb-3 text-sm text-gray-600"}>
        Specify details about the test set-up. Please also specify sensors and sensor details if they are only used to monitor operational conditions, if not used for fault detection (i.e. measure independent variables rather than dependent variables).
      </Paragraph>

      <div>
        <TableTooltip isVisible={activeTooltip}
          explanations={[
            <><b>Category:</b> Category of the characteristic you are describing</>,
            <><b>Value:</b> Value of the characteristic you are describing</>,
            <><b>Unit:</b> Unit of the characteristic you are describing (may be optional)</>
          ]}
          examples={[
            { category: "Motor", value: "WEG W21", unit: "N/A" },
            { category: "Motor Power", value: "2.2", unit: "kW" },
            { category: "Hydraulic Pump", value: "Hydropack", unit: "N/A" }
          ]}
        />
      </div>
      <div className="space-y-1">
        {characteristics.map((characteristic, index) => {
          const isExpanded = expandedItems.has(index);
          const summary = `${characteristic.value || 'No value'} ${characteristic.unit}`;

          return (
            <div key={characteristic.id ?? `characteristic-${index}`} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpanded(index)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="font-medium text-gray-900">
                      c{index + 1}:
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 truncate max-w-md">
                    <span className='font-bold'>{characteristic.category || 'No category'}: </span>{summary}
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
                      removeCharacteristic(index);
                    }}
                    className="h-6.5 w-6.5 text-gray-400 hover:bg-red-100 rounded-md p-1 transition-colors"
                    tooltipText={"Remove characteristic"}
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
                <div className="border-t border-gray-200 p-4 bg-white">
                  <div className="flex items-start gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                      <FormField
                        name={`characteristic-${index}-category`}
                        value={characteristic.category}
                        onChange={(e) => updateCharacteristic(index, 'category', e.target.value)}
                        label="Category"
                        type="text"
                        placeholder="Enter category"
                      />

                      <FormField
                        name={`characteristic-${index}-value`}
                        value={characteristic.value}
                        onChange={(e) => updateCharacteristic(index, 'value', e.target.value)}
                        label="Value"
                        type="text"
                        placeholder="Enter value"
                      />

                      <FormField
                        name={`characteristic-${index}-unit`}
                        value={characteristic.unit}
                        onChange={(e) => updateCharacteristic(index, 'unit', e.target.value)}
                        label="Unit"
                        type="text"
                        placeholder="Enter unit (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <CommentEditor
                    comments={characteristic.comments || []}
                    onCommentsChange={(comments) => updateComments(index, comments)}
                  />
                </div>
              )}
            </div>
          );
        })}

        {characteristics.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">No characteristics added yet.</p>
            <p className="text-sm">Click "Add Characteristic" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Sensors Component
const SensorsEditor = ({ sensors, onSensorsChange }) => {
  const [expandedSensors, setExpandedSensors] = useState(new Set());
  const [activeTooltip, setActiveTooltip] = useState(false);
  const [selectedTab, setSelectedTab] = useState('basic-information');

  const addSensor = () => {
    const newSensor = {
      id: uuid4(),
      // Auto-generate alias like 'Sensor SE01', 'Sensor SE02', zero-padded 2 digits
      alias: `Sensor SE${String(sensors.length + 1).padStart(2, '0')}`,
      measurementType: '',
      measurementUnit: '',
      samplingRate: '',
      description: '',
      technologyType: '',
      technologyPlatform: '',
      // flexible additional info entries (name/value pairs)
      additionalInfo: [],
      phase: ''
    };
    const newSensors = [...sensors, newSensor];
    onSensorsChange(newSensors);

    // Auto-expand the new sensor
    setExpandedSensors(prev => new Set([...prev, newSensors.length - 1]));
  };

  // Helper: convert legacy fixed fields into additionalInfo entries
  const convertOldFieldsToAdditional = (sensor) => {
    const entries = [];
    const pushIf = (label, value) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        entries.push({ id: uuid4(), name: label, value: String(value) });
      }
    };

    pushIf('Data Acquisition Unit', sensor.dataAcquisitionUnit);
  // samplingRate is now a dedicated field on the sensor; don't convert it here
    pushIf('Sampling Unit', sensor.samplingUnit);
    pushIf('Phase', sensor.phase);
    pushIf('Sensor Location', sensor.sensorLocation);
    pushIf('Location Unit', sensor.locationUnit);
    pushIf('Sensor Orientation', sensor.sensorOrientation);
    pushIf('Orientation Unit', sensor.orientationUnit);

    return entries;
  };

  const addAdditionalInfo = (sensorIndex) => {
    const newEntry = { id: uuid4(), name: '', value: '' };
    const updatedSensors = sensors.map((s, i) => {
      if (i !== sensorIndex) return s;
      const base = { ...s };
      const current = base.additionalInfo && base.additionalInfo.length > 0
        ? [...base.additionalInfo]
        : convertOldFieldsToAdditional(base);
      base.additionalInfo = [...current, newEntry];
      return base;
    });
    onSensorsChange(updatedSensors);
  };

  const updateAdditionalInfo = (sensorIndex, entryIndex, field, value) => {
    const updatedSensors = sensors.map((s, i) => {
      if (i !== sensorIndex) return s;
      const base = { ...s };
      const current = base.additionalInfo && base.additionalInfo.length > 0
        ? [...base.additionalInfo]
        : convertOldFieldsToAdditional(base);
      current[entryIndex] = { ...current[entryIndex], [field]: value };
      base.additionalInfo = current;
      return base;
    });
    onSensorsChange(updatedSensors);
  };

  const removeAdditionalInfo = (sensorIndex, entryIndex) => {
    const updatedSensors = sensors.map((s, i) => {
      if (i !== sensorIndex) return s;
      const base = { ...s };
      const current = base.additionalInfo && base.additionalInfo.length > 0
        ? [...base.additionalInfo]
        : convertOldFieldsToAdditional(base);
      current.splice(entryIndex, 1);
      base.additionalInfo = current;
      return base;
    });
    onSensorsChange(updatedSensors);
  };

  const removeSensor = (index) => {
    const filteredSensors = sensors.filter((_, i) => i !== index);
    onSensorsChange(filteredSensors);

    // Update expanded sensors
    setExpandedSensors(prev => {
      const newSet = new Set();
      Array.from(prev).forEach(i => {
        if (i < index) newSet.add(i);
        else if (i > index) newSet.add(i - 1);
      });
      return newSet;
    });
  };

  const updateSensor = (index, field, value) => {
    const updatedSensors = sensors.map((sensor, i) =>
      i === index ? { ...sensor, [field]: value } : sensor
    );
    onSensorsChange(updatedSensors);
  };

  const toggleSensor = (index) => {
    setExpandedSensors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getSensorSummary = (sensor) => {
    const platform = sensor.technologyPlatform || 'No platform';
    const measurementType = sensor.measurementType || 'No measurementType';

    return `${platform} - ${measurementType}`;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="p-2 mb-4 flex justify-between items-center border-b border-b-gray-300">
        <Heading3>
          Sensors
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({sensors.length} items)
          </span>
        </Heading3>


        <div className='flex items-center space-x-2'>
          <IconTooltipButton
            icon={Plus}
            onClick={addSensor}
            tooltipText={"Add Sensor"}
          />

          <IconTooltipButton
            icon={HelpCircle}
            onClick={(e) => { e.stopPropagation(); setActiveTooltip(!activeTooltip) }}
            tooltipText={"Help"}
          />
        </div>
      </div>

       <Paragraph className={"px-2 pb-4 border-b border-gray-300 mb-3 text-sm text-gray-600"}>
        Specify the sensors on the test set-up from which fault responses will be extracted.
      </Paragraph>


      <div>
        <TableTooltip isVisible={activeTooltip}
          explanations={[
            <><b>Basic Information:</b> Basic Information about the sensor</>,
            <><b>- Technology Platform:</b> Platform of the sensor</>,
            <><b>- Technology Type:</b> Technology Type of the sensor</>,
            <><b>- Description:</b> Description of the sensor</>
          ]}
          examples={[
            { "technology Platform": "PT5401", "Technology Type": "PT", description: "measures pressure on the radial cylinder" },
          ]}
        />
      </div>

      <div className="space-y-1">
        {sensors.map((sensor, index) => {
          const isExpanded = expandedSensors.has(index);

          return (
            <div key={sensor.id ?? `sensor-${index}`} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSensor(index)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="font-medium text-gray-900">
                      s{index + 1}:
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 truncate max-w-md">
                    <span className='font-bold'>{sensor.alias || 'Unnamed Sensor'}: </span>
                    {getSensorSummary(sensor)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <IconTooltipButton
                    icon={Trash2}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSensor(index);
                    }}
                    className="h-6.5 w-6.5 text-gray-400 hover:bg-red-100 rounded-md p-1 transition-colors"
                    tooltipText={"Remove sensor"}
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

                <div>

                  <div className="border-t border-gray-200 p-4 bg-white space-y-6">
                    {/* Basic Information */}
                    <div className='space-y-3'>
                      <h6 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                        Basic Information
                      </h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <FormField
                          name={`sensor-${index}-alias`}
                          value={sensor.alias}
                          onChange={(e) => updateSensor(index, 'alias', e.target.value)}
                          label="Sensor alias"
                          type="text"
                          placeholder="Enter a sensor name/alias"
                          explanation="Provide a name for the sensor. This name will appear in the ISA Questionnaire fields when adding sensor information."
                          example="vib_ch_1"
                        />

                        <FormField
                          name={`sensor-${index}-technologyPlatform`}
                          value={sensor.technologyPlatform}
                          onChange={(e) => updateSensor(index, 'technologyPlatform', e.target.value)}
                          label="Sensor Model"
                          type="text"
                          placeholder="Enter Sensor model"
                          explanation="Specify the specific sensor model that is used."
                          example="Wilcoxon 786B-10"
                        />

                        <FormField
                          name={`sensor-${index}-technologyType`}
                          value={sensor.technologyType}
                          onChange={(e) => updateSensor(index, 'technologyType', e.target.value)}
                          label="Sensor Type"
                          type="text"
                          placeholder="Enter Sensor type"
                          explanation="Specify the type of sensor used"
                          example="Accelerometer"
                        />

                        <FormField
                          name={`sensor-${index}-measurementType`}
                          value={sensor.measurementType}
                          onChange={(e) => updateSensor(index, 'measurementType', e.target.value)}
                          label="Measurement Type"
                          type="text"
                          placeholder="Enter measurement type"
                          explanation="Specify the type of measurement"
                          example={"Vibration"}
                        />
                      </div>

                      <div>
                        <FormField
                          name={`sensor-${index}-description`}
                          value={sensor.description}
                          onChange={(e) => updateSensor(index, 'description', e.target.value)}
                          label="Description"
                          type="textarea"
                          placeholder="Enter description"
                          className='min-h-20'
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}

        {sensors.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">No sensors added yet.</p>
            <p className="text-sm">Click "Add Sensor" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

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

// Main TestSetupForm Component
const TestSetupForm = ({ item, onSave, onCancel, isEditing = false }) => {
  const { setScreenWidth } = useGlobalDataContext();
  
  const initialFormState = {
    name: '',
    location: '',
    experimentPreparationProtocolName: '',
    testSpecimenName: '',
    description: '',
    characteristics: [],
    sensors: [],
    configurations: [],
    measurementProtocols: [],
    processingProtocols: [],
    sensorToMeasurementProtocolMapping: [],
    sensorToProcessingProtocolMapping: []
  };

  const buildFormState = (sourceItem) => {
    if (!sourceItem) return initialFormState;
    return {
      name: sourceItem.name || '',
      location: sourceItem.location || '',
      experimentPreparationProtocolName: sourceItem.experimentPreparationProtocolName || '',
      testSpecimenName: sourceItem.testSpecimenName || '',
      description: sourceItem.description || '',
      characteristics: sourceItem.characteristics || [],
      sensors: sourceItem.sensors || [],
      configurations: sourceItem.configurations || [],
      measurementProtocols: sourceItem.measurementProtocols || [],
      processingProtocols: sourceItem.processingProtocols || [],
      sensorToMeasurementProtocolMapping: sourceItem.sensorToMeasurementProtocolMapping || [],
      sensorToProcessingProtocolMapping: sourceItem.sensorToProcessingProtocolMapping || []
    };
  };

  const [newFormHistoryScope] = useState(() => `new:${uuid4()}`);
  const formHistoryScope = item?.id ? `testsetup:${item.id}` : `testsetup:${newFormHistoryScope}`;

  const [formData, setFormData] = useState(() => buildFormState(item));
  const [formError, setFormError] = useState('');
  const [selectedTab, setSelectedTab] = useState('basic-info');
  const [activeTooltips, setActiveTooltips] = useState(false);
  const [characteristicsView, setCharacteristicsView] = useState('simple-view');
  const [sensorsView, setSensorsView] = useState('simple-view');
  const [configurationsView, setConfigurationsView] = useState('simple-view');
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [initialFingerprint, setInitialFingerprint] = useState(() => getDirtyFingerprint(buildFormState(item)));
  const [activeMeasurementProtocolId, setActiveMeasurementProtocolId] = useState(null);
  const [activeProcessingProtocolId, setActiveProcessingProtocolId] = useState(null);


  // Calculate number of sensors from sensors array
  const numberOfSensors = formData.sensors.length;
  const numberOfCharacteristics = formData.characteristics.length;
  const numberOfConfigurations = formData.configurations.length;
  const numberOfMeasurementProtocols = formData.measurementProtocols.length;
  const numberOfProcessingProtocols = formData.processingProtocols.length;

  // Update screen width based on active view
  useEffect(() => {
    const isGridActive = 
      (selectedTab === 'characteristics' && characteristicsView === 'grid-view') ||
      (selectedTab === 'sensors' && sensorsView === 'grid-view') ||
      (selectedTab === 'configurations' && configurationsView === 'grid-view') ||
      selectedTab === 'measurement-protocols' ||
      selectedTab === 'processing-protocols';
    setScreenWidth(isGridActive ? 'max-w-[100rem]' : 'max-w-5xl');
    
    // Reset to default width when component unmounts
    return () => {
      setScreenWidth('max-w-5xl');
    };
  }, [
    selectedTab,
    characteristicsView,
    sensorsView,
    configurationsView,
    setScreenWidth
  ]);

  useEffect(() => {
    const nextFormData = buildFormState(item);
    setFormData(nextFormData);
    setInitialFingerprint(getDirtyFingerprint(nextFormData));
  }, [item]);

  useEffect(() => {
    const needsCharacteristicIds = formData.characteristics.some((c) => !c.id);
    const needsSensorIds = formData.sensors.some((s) => !s.id);
    const needsConfigurationIds = formData.configurations.some((c) => !c.id);
    const needsMeasurementProtocolIds = formData.measurementProtocols.some(
      (protocol) => !protocol.id || (protocol.parameters || []).some((parameter) => !parameter.id)
    );
    const needsProcessingProtocolIds = formData.processingProtocols.some(
      (protocol) => !protocol.id || (protocol.parameters || []).some((parameter) => !parameter.id)
    );

    if (
      needsCharacteristicIds ||
      needsSensorIds ||
      needsConfigurationIds ||
      needsMeasurementProtocolIds ||
      needsProcessingProtocolIds
    ) {
      setFormData((prev) => ({
        ...prev,
        characteristics: prev.characteristics.map((c) => (c.id ? c : { ...c, id: uuid4() })),
        sensors: prev.sensors.map((s) => (s.id ? s : { ...s, id: uuid4() })),
        configurations: prev.configurations.map((c) => (c.id ? c : { ...c, id: uuid4() })),
        measurementProtocols: (prev.measurementProtocols || []).map((protocol) => ({
          ...protocol,
          id: protocol.id || uuid4(),
          parameters: (protocol.parameters || []).map((parameter) =>
            parameter.id ? parameter : { ...parameter, id: uuid4() }
          )
        })),
        processingProtocols: (prev.processingProtocols || []).map((protocol) => ({
          ...protocol,
          id: protocol.id || uuid4(),
          parameters: (protocol.parameters || []).map((parameter) =>
            parameter.id ? parameter : { ...parameter, id: uuid4() }
          )
        })),
      }));
    }
  }, [
    formData.characteristics,
    formData.sensors,
    formData.configurations,
    formData.measurementProtocols,
    formData.processingProtocols
  ]);

  const currentFingerprint = useMemo(() => getDirtyFingerprint(formData), [formData]);
  const hasUnsavedChanges = currentFingerprint !== initialFingerprint;
  const historyScopeBase = `${formHistoryScope}:${initialFingerprint}`;

  const saveForm = useCallback(() => {
    if (
      !formData.name.trim() ||
      !formData.location.trim() ||
      !formData.experimentPreparationProtocolName.trim() ||
      !formData.testSpecimenName.trim()
    ) {
      setFormError('Please fill in all required fields (Name, Location, Experiment Preparation Protocol Name, Set-up or test specimen-name).');
      return false;
    }
    setFormError('');

    const testSetupData = {
      ...formData,
      number_of_sensors: numberOfSensors,
      id: isEditing && item?.id ? item.id : `testsetup-${Date.now()}`
    };

    onSave(testSetupData);
    setInitialFingerprint(currentFingerprint);
    return true;
  }, [formData, numberOfSensors, isEditing, item, onSave, currentFingerprint]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    saveForm();
  }, [saveForm]);

  const handleCloseRequest = useCallback(() => {
    if (isEditing || hasUnsavedChanges) {
      setShowCloseWarning(true);
      return;
    }
    onCancel?.();
  }, [isEditing, hasUnsavedChanges, onCancel]);

  const handleKeepEditing = useCallback(() => {
    setShowCloseWarning(false);
  }, []);

  const handleSaveAndClose = useCallback(() => {
    setShowCloseWarning(false);
    saveForm();
  }, [saveForm]);

  const handleDiscardAndClose = useCallback(() => {
    setShowCloseWarning(false);
    onCancel?.();
  }, [onCancel]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleTooltip = () => {
    setActiveTooltips(prev => !prev)
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-2";

  const characteristicRows = useMemo(() => {
    return formData.characteristics.map((c) => ({
      ...c,
      commentsCount: Array.isArray(c?.comments) ? c.comments.length : 0,
      commentHint: 'Manage comments in Simple View'
    }));
  }, [formData.characteristics]);
  const sensorRows = useMemo(() => formData.sensors, [formData.sensors]);

  const addCharacteristicRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      characteristics: [
        ...prev.characteristics,
        {
          id: uuid4(),
          category: '',
          value: '',
          unit: '',
          comments: [],
          commentsCount: 0,
          commentHint: 'Manage comments in Simple View'
        }
      ]
    }));
  }, []);

  const addSensorRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      sensors: [
        ...prev.sensors,
        {
          id: uuid4(),
          alias: `Sensor SE${String(prev.sensors.length + 1).padStart(2, '0')}`,
          technologyPlatform: '',
          technologyType: '',
          measurementType: '',
          description: '',
          additionalInfo: []
        }
      ]
    }));
  }, []);

  const characteristicGridConfig = useMemo(() => ({
    title: 'Characteristics',
    rowData: characteristicRows,
    columnData: [],
    mappings: [],
    staticColumns: [
      {
        prop: 'actions',
        name: '',
        size: 70,
        readonly: true,
        cellTemplate: Template(DeleteRowCellTemplate),
        cellProperties: () => ({ style: { 'text-align': 'center' } })
      },
      {
        prop: 'pattern',
        name: 'Identifier',
        size: 150,
        readonly: true,
        cellTemplate: Template(PatternCellTemplate, { prefix: 'Characteristic C' })
      },
      { prop: 'category', name: 'Category', size: 180, readonly: false },
      { prop: 'value', name: 'Value', size: 200, readonly: false },
      { prop: 'unit', name: 'Unit', size: 120, readonly: false },
      { prop: 'commentsCount', name: 'Comments (#)', size: 140, readonly: true },
      { prop: 'commentHint', name: 'Comments', size: 200, readonly: true },
    ],
    customActions: [
      {
        label: '+ Add characteristic',
        title: 'Add characteristic row',
        onClick: addCharacteristicRow,
        className: 'px-3 py-1 text-sm rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
      }
    ]
  }), [characteristicRows]);

  const sensorGridConfig = useMemo(() => ({
    title: 'Sensors',
    rowData: sensorRows,
    columnData: [],
    mappings: [],
    staticColumns: [
      {
        prop: 'actions',
        name: '',
        size: 70,
        readonly: true,
        cellTemplate: Template(DeleteRowCellTemplate),
        cellProperties: () => ({ style: { 'text-align': 'center' } })
      },
      {
        prop: 'pattern',
        name: 'Identifier',
        size: 140,
        readonly: true,
        cellTemplate: Template(PatternCellTemplate, { prefix: 'Sensor S' })
      },
      { prop: 'alias', name: 'Alias', size: 160, readonly: false },
      { prop: 'technologyPlatform', name: 'Sensor Model', size: 200, readonly: false },
      { prop: 'technologyType', name: 'Sensor Type', size: 180, readonly: false },
      { prop: 'measurementType', name: 'Measurement Type', size: 180, readonly: false },
      { prop: 'description', name: 'Description', size: 220, readonly: false },
    ],
    customActions: [
      {
        label: '+ Add sensor',
        title: 'Add sensor row',
        onClick: addSensorRow,
        className: 'px-3 py-1 text-sm rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
      }
    ]
  }), [sensorRows]);

  const configurationRows = useMemo(() => {
    return formData.configurations.map((c) => ({
      ...c,
      detailsCount: Array.isArray(c?.details) ? c.details.length : 0,
      detailsHint: Array.isArray(c?.details) && c.details.length > 0
        ? c.details.map((d) => `${d.name}: ${d.value}`).join(', ')
        : 'No details'
    }));
  }, [formData.configurations]);

  const addConfigurationRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      configurations: [
        ...prev.configurations,
        {
          id: uuid4(),
          name: '',
          replaceableComponentId: '',
          details: [],
          detailsCount: 0,
          detailsHint: 'No details'
        }
      ]
    }));
  }, []);

  const configurationGridConfig = useMemo(() => ({
    title: 'Configurations',
    rowData: configurationRows,
    columnData: [],
    mappings: [],
    staticColumns: [
      {
        prop: 'actions',
        name: '',
        size: 70,
        readonly: true,
        cellTemplate: Template(DeleteRowCellTemplate),
        cellProperties: () => ({ style: { 'text-align': 'center' } })
      },
      {
        prop: 'pattern',
        name: 'Identifier',
        size: 150,
        readonly: true,
        cellTemplate: Template(PatternCellTemplate, { prefix: 'Config C' })
      },
      { prop: 'name', name: 'Name', size: 200, readonly: false },
      { prop: 'replaceableComponentId', name: 'Replaceable Component ID', size: 200, readonly: false },
      { prop: 'detailsCount', name: 'Details (#)', size: 140, readonly: true },
      { prop: 'detailsHint', name: 'Details', size: 300, readonly: true },
    ],
    customActions: [
      {
        label: '+ Add configuration',
        title: 'Add configuration row',
        onClick: addConfigurationRow,
        className: 'px-3 py-1 text-sm rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
      }
    ]
  }), [configurationRows]);

  useEffect(() => {
    if (!formData.measurementProtocols.length) {
      setActiveMeasurementProtocolId(null);
      return;
    }
    const hasActive = formData.measurementProtocols.some((protocol) => protocol.id === activeMeasurementProtocolId);
    if (activeMeasurementProtocolId && !hasActive) {
      setActiveMeasurementProtocolId(formData.measurementProtocols[0].id);
    }
  }, [formData.measurementProtocols, activeMeasurementProtocolId]);

  useEffect(() => {
    if (!formData.processingProtocols.length) {
      setActiveProcessingProtocolId(null);
      return;
    }
    const hasActive = formData.processingProtocols.some((protocol) => protocol.id === activeProcessingProtocolId);
    if (activeProcessingProtocolId && !hasActive) {
      setActiveProcessingProtocolId(formData.processingProtocols[0].id);
    }
  }, [formData.processingProtocols, activeProcessingProtocolId]);

  const activeMeasurementProtocol = useMemo(
    () => formData.measurementProtocols.find((protocol) => protocol.id === activeMeasurementProtocolId) || null,
    [formData.measurementProtocols, activeMeasurementProtocolId]
  );

  const activeProcessingProtocol = useMemo(
    () => formData.processingProtocols.find((protocol) => protocol.id === activeProcessingProtocolId) || null,
    [formData.processingProtocols, activeProcessingProtocolId]
  );

  const activeMeasurementProtocolRows = useMemo(
    () => activeMeasurementProtocol?.parameters || [],
    [activeMeasurementProtocol]
  );

  const activeProcessingProtocolRows = useMemo(
    () => activeProcessingProtocol?.parameters || [],
    [activeProcessingProtocol]
  );

  const activeMeasurementProtocolMappings = useMemo(
    () => (formData.sensorToMeasurementProtocolMapping || [])
      .filter((mapping) => mapping.protocolId === activeMeasurementProtocolId),
    [formData.sensorToMeasurementProtocolMapping, activeMeasurementProtocolId]
  );

  const activeProcessingProtocolMappings = useMemo(
    () => (formData.sensorToProcessingProtocolMapping || [])
      .filter((mapping) => mapping.protocolId === activeProcessingProtocolId),
    [formData.sensorToProcessingProtocolMapping, activeProcessingProtocolId]
  );

  const addMeasurementProtocol = useCallback(() => {
    const newProtocolId = uuid4();
    setFormData((prev) => ({
      ...prev,
      measurementProtocols: [
        ...(prev.measurementProtocols || []),
        {
          id: newProtocolId,
          name: `Measurement Protocol ${prev.measurementProtocols.length + 1}`,
          description: '',
          parameters: []
        }
      ]
    }));
    setActiveMeasurementProtocolId(newProtocolId);
  }, []);

  const addProcessingProtocol = useCallback(() => {
    const newProtocolId = uuid4();
    setFormData((prev) => ({
      ...prev,
      processingProtocols: [
        ...(prev.processingProtocols || []),
        {
          id: newProtocolId,
          name: `Processing Protocol ${prev.processingProtocols.length + 1}`,
          description: '',
          parameters: []
        }
      ]
    }));
    setActiveProcessingProtocolId(newProtocolId);
  }, []);

  const updateMeasurementProtocol = useCallback((protocolId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      measurementProtocols: (prev.measurementProtocols || []).map((protocol) =>
        protocol.id === protocolId ? { ...protocol, [field]: value } : protocol
      )
    }));
  }, []);

  const updateProcessingProtocol = useCallback((protocolId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      processingProtocols: (prev.processingProtocols || []).map((protocol) =>
        protocol.id === protocolId ? { ...protocol, [field]: value } : protocol
      )
    }));
  }, []);

  const removeMeasurementProtocol = useCallback((protocolId) => {
    setFormData((prev) => ({
      ...prev,
      measurementProtocols: (prev.measurementProtocols || []).filter((protocol) => protocol.id !== protocolId),
      sensorToMeasurementProtocolMapping: (prev.sensorToMeasurementProtocolMapping || [])
        .filter((mapping) => mapping.protocolId !== protocolId)
    }));
    setActiveMeasurementProtocolId((prev) => (prev === protocolId ? null : prev));
  }, []);

  const removeProcessingProtocol = useCallback((protocolId) => {
    setFormData((prev) => ({
      ...prev,
      processingProtocols: (prev.processingProtocols || []).filter((protocol) => protocol.id !== protocolId),
      sensorToProcessingProtocolMapping: (prev.sensorToProcessingProtocolMapping || [])
        .filter((mapping) => mapping.protocolId !== protocolId)
    }));
    setActiveProcessingProtocolId((prev) => (prev === protocolId ? null : prev));
  }, []);

  const toggleMeasurementProtocol = useCallback((protocolId) => {
    setActiveMeasurementProtocolId((prev) => (prev === protocolId ? null : protocolId));
  }, []);

  const toggleProcessingProtocol = useCallback((protocolId) => {
    setActiveProcessingProtocolId((prev) => (prev === protocolId ? null : protocolId));
  }, []);

  const addMeasurementProtocolParameter = useCallback(() => {
    if (!activeMeasurementProtocolId) return;
    setFormData((prev) => ({
      ...prev,
      measurementProtocols: (prev.measurementProtocols || []).map((protocol) => {
        if (protocol.id !== activeMeasurementProtocolId) return protocol;
        return {
          ...protocol,
          parameters: [
            ...(protocol.parameters || []),
            {
              id: uuid4(),
              name: `Parameter ${(protocol.parameters || []).length + 1}`,
              description: '',
              unit: ''
            }
          ]
        };
      })
    }));
  }, [activeMeasurementProtocolId]);

  const addProcessingProtocolParameter = useCallback(() => {
    if (!activeProcessingProtocolId) return;
    setFormData((prev) => ({
      ...prev,
      processingProtocols: (prev.processingProtocols || []).map((protocol) => {
        if (protocol.id !== activeProcessingProtocolId) return protocol;
        return {
          ...protocol,
          parameters: [
            ...(protocol.parameters || []),
            {
              id: uuid4(),
              name: `Parameter ${(protocol.parameters || []).length + 1}`,
              description: '',
              unit: ''
            }
          ]
        };
      })
    }));
  }, [activeProcessingProtocolId]);

  const handleMeasurementProtocolMappingsChange = useCallback((newMappings) => {
    if (!activeMeasurementProtocolId) return;
    setFormData((prev) => ({
      ...prev,
      sensorToMeasurementProtocolMapping: [
        ...(prev.sensorToMeasurementProtocolMapping || []).filter((mapping) => mapping.protocolId !== activeMeasurementProtocolId),
        ...newMappings.map((mapping) => ({ ...mapping, protocolId: activeMeasurementProtocolId }))
      ]
    }));
  }, [activeMeasurementProtocolId]);

  const handleProcessingProtocolMappingsChange = useCallback((newMappings) => {
    if (!activeProcessingProtocolId) return;
    setFormData((prev) => ({
      ...prev,
      sensorToProcessingProtocolMapping: [
        ...(prev.sensorToProcessingProtocolMapping || []).filter((mapping) => mapping.protocolId !== activeProcessingProtocolId),
        ...newMappings.map((mapping) => ({ ...mapping, protocolId: activeProcessingProtocolId }))
      ]
    }));
  }, [activeProcessingProtocolId]);

  const handleMeasurementProtocolRowsChange = useCallback((protocolId, nextRows) => {
    setFormData((prev) => ({
      ...prev,
      measurementProtocols: (prev.measurementProtocols || []).map((targetProtocol) => {
        if (targetProtocol.id !== protocolId) return targetProtocol;
        return {
          ...targetProtocol,
          parameters: nextRows.map((row) => {
            const existing = (targetProtocol.parameters || []).find((parameter) => parameter.id === row.id) || {};
            return { ...existing, ...row };
          })
        };
      })
    }));
  }, []);

  const handleProcessingProtocolRowsChange = useCallback((protocolId, nextRows) => {
    setFormData((prev) => ({
      ...prev,
      processingProtocols: (prev.processingProtocols || []).map((targetProtocol) => {
        if (targetProtocol.id !== protocolId) return targetProtocol;
        return {
          ...targetProtocol,
          parameters: nextRows.map((row) => {
            const existing = (targetProtocol.parameters || []).find((parameter) => parameter.id === row.id) || {};
            return { ...existing, ...row };
          })
        };
      })
    }));
  }, []);

  const measurementProtocolGridConfig = useMemo(() => ({
    title: activeMeasurementProtocol
      ? `${activeMeasurementProtocol.name} - Sensor parameter mapping`
      : 'Measurement Protocol parameter mapping',
    rowData: activeMeasurementProtocolRows,
    columnData: formData.sensors,
    mappings: activeMeasurementProtocolMappings,
    fieldMappings: {
      rowId: 'id',
      rowName: 'name',
      columnId: 'id',
      columnName: 'alias',
      columnUnit: 'measurementUnit',
      mappingRowId: 'targetId',
      mappingColumnId: 'sourceId',
      mappingValue: 'value',
      hasChildColumns: true
    },
    staticColumns: [
      {
        prop: 'actions',
        name: '',
        size: 70,
        readonly: true,
        cellTemplate: Template(DeleteRowCellTemplate),
        cellProperties: () => ({ style: { 'text-align': 'center' } })
      },
      {
        prop: 'pattern',
        name: 'Identifier',
        size: 150,
        readonly: true,
        cellTemplate: Template(PatternCellTemplate, { prefix: 'Parameter P' })
      },
      { prop: 'name', name: 'Parameter Name', size: 240, readonly: false },
      {
        prop: 'description',
        name: 'Description',
        size: 260,
        readonly: false,
        cellProperties: () => ({
          style: {
            "border-right": "3px solid "
          }
        })
      }
    ],
    customActions: [
      {
        label: '+ Add parameter',
        title: 'Add parameter row',
        onClick: addMeasurementProtocolParameter,
        className: 'px-3 py-1 text-sm rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
      }
    ]
  }), [
    activeMeasurementProtocol,
    activeMeasurementProtocolRows,
    activeMeasurementProtocolMappings,
    formData.sensors,
    addMeasurementProtocolParameter
  ]);

  const processingProtocolGridConfig = useMemo(() => ({
    title: activeProcessingProtocol
      ? `${activeProcessingProtocol.name} - Sensor parameter mapping`
      : 'Processing Protocol parameter mapping',
    rowData: activeProcessingProtocolRows,
    columnData: formData.sensors,
    mappings: activeProcessingProtocolMappings,
    fieldMappings: {
      rowId: 'id',
      rowName: 'name',
      columnId: 'id',
      columnName: 'alias',
      columnUnit: 'measurementUnit',
      mappingRowId: 'targetId',
      mappingColumnId: 'sourceId',
      mappingValue: 'value',
      hasChildColumns: true
    },
    staticColumns: [
      {
        prop: 'actions',
        name: '',
        size: 70,
        readonly: true,
        cellTemplate: Template(DeleteRowCellTemplate),
        cellProperties: () => ({ style: { 'text-align': 'center' } })
      },
      {
        prop: 'pattern',
        name: 'Identifier',
        size: 150,
        readonly: true,
        cellTemplate: Template(PatternCellTemplate, { prefix: 'Parameter P' })
      },
      { prop: 'name', name: 'Parameter Name', size: 240, readonly: false },
      {
        prop: 'description',
        name: 'Description',
        size: 260,
        readonly: false,
        cellProperties: () => ({
          style: {
            "border-right": "3px solid "
          }
        })
      }
    ],
    customActions: [
      {
        label: '+ Add parameter',
        title: 'Add parameter row',
        onClick: addProcessingProtocolParameter,
        className: 'px-3 py-1 text-sm rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
      }
    ]
  }), [
    activeProcessingProtocol,
    activeProcessingProtocolRows,
    activeProcessingProtocolMappings,
    formData.sensors,
    addProcessingProtocolParameter
  ]);

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
        <div className="flex items-center justify-between">
          <Heading3 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Test Setup' : 'Add New Test Setup'}
          </Heading3>
          <TooltipButton
            className="p-2 bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={handleCloseRequest}
            tooltipText="Close"
          >
            <X className="w-5 h-5" />
          </TooltipButton>
        </div>
      </div>

      <div className="p-4">
        {formError && (
          <Paragraph className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {formError}
          </Paragraph>
        )}
        <TabSwitcher
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          tabs={[
            { id: 'basic-info', label: 'Basic Info', tooltip: 'Basic Information about the test setup' },
            { id: 'characteristics', label: `Characteristics (${numberOfCharacteristics})`, tooltip: 'Characteristics of the test setup' },
            { id: 'sensors', label: `Sensors (${numberOfSensors})`, tooltip: 'Sensors used in the test setup' },
            { id: 'configurations', label: `Configurations (${numberOfConfigurations})`, tooltip: 'Manage test setup configurations' },
            { id: 'measurement-protocols', label: `Measurement (${numberOfMeasurementProtocols})`, tooltip: 'Define raw data acquisition protocol variants and parameter values' },
            { id: 'processing-protocols', label: `Processing (${numberOfProcessingProtocols})`, tooltip: 'Define processing protocol variants and parameter values' },
          ]}
        />

        <TabPanel isActive={selectedTab === 'basic-info'}>

          <div className="p-4 bg-gray-50 rounded-lg space-y-4">

            <div>
              {/* Basic Information */}
              <div className="p-2 flex justify-between items-center border-b border-b-gray-300">
                <Heading3>
                  Basic Information
                </Heading3>

                {/* <IconTooltipButton icon={HelpCircle} onClick={toggleTooltip} tooltipText={"Help"} /> */}
              </div>

              {/* <TableTooltip
                isVisible={activeTooltips}
                explanations={["This section contains the basic information about the test setup including its name, location, and description",
                  <><b>- Name:</b> Name of the test setup</>,
                  <><b>- Location:</b> Location of the test setup</>,
                  <><b>- Description:</b> A brief description of the test setup</>
                ]}
                examples={[
                  { name: "Test Setup xxx", location: "Utrecht, Hogeschool Utrecht", description: "This is a test setup for testing the performance of the new motor." },
                  { name: "Test Setup yyy", location: "Amsterdam, Hogeschool van Amsterrdam (HvA)", description: "This is a test setup for testing the performance of the new hydraulic pump." },
                ]} /> */}

            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FormField
                name={'name'}
                type='text'
                value={formData.name}
                label={'Name'}
                placeholder={'Enter test setup name'}
                onChange={handleChange}
                required
              />

              <FormField
                name={'location'}
                type='text'
                value={formData.location}
                label={'Location'}
                placeholder={'Enter test setup location'}
                onChange={handleChange}
                required
              />

            </div>

              <FormField
                name={'experimentPreparationProtocolName'}
                type='text'
                value={formData.experimentPreparationProtocolName}
                label={'Experiment Preparation Protocol Name'}
                placeholder={'Enter experiment preparation protocol name'}
                onChange={handleChange}
                explanation={"Please specify a name for the preparation of the experiments."}
                example= {"experiment preparation, simulation preparation or other"}
                required
              />

              <FormField
                name={'testSpecimenName'}
                type='text'
                value={formData.testSpecimenName}
                label={'Set-up or test specimen-name'}
                placeholder={'Enter Set-up or test specimen-name'}
                onChange={handleChange}
                explanation={"If multiple components are tested, please specify the name of the test set-up. If a particular component/part is tested, please name the part."}
                example= {"Hydraulic pump test set-up (if >1 component in the set-up are being tested in the investigation) or “Bearing” / “Test specimen” (if only a specific component is being tested in the investigation)"}
                required
              />

            <FormField
              name="description"
              type="textarea"
              value={formData.description}
              label="Description"
              placeholder="Enter a brief description of the test setup"
              onChange={handleChange}
              rows={4}
              className='min-h-20'
            />
          </div>
        </TabPanel>

        <TabPanel isActive={selectedTab === 'characteristics'}>
          <TabSwitcher
            selectedTab={characteristicsView}
            onTabChange={setCharacteristicsView}
            tabs={[
              { id: 'simple-view', label: 'Simple View', tooltip: 'Edit characteristics with collapsible cards' },
              { id: 'grid-view', label: 'Grid View', tooltip: 'Edit characteristics inline in a grid' }
            ]}
          />
          <TabPanel isActive={characteristicsView === 'simple-view'}>
            <CharacteristicsEditor
              characteristics={formData.characteristics}
              onCharacteristicsChange={(characteristics) =>
                setFormData(prev => ({ ...prev, characteristics }))
              }
            />
          </TabPanel>
          <TabPanel isActive={characteristicsView === 'grid-view'}>
            <div className="mt-3 border border-gray-200 rounded-lg">
              <DataGrid
                {...characteristicGridConfig}
                showControls={true}
                showDebug={false}
                historyScopeKey={`${historyScopeBase}:characteristics`}
                isActive={selectedTab === 'characteristics' && characteristicsView === 'grid-view'}
                onRowDataChange={(nextRows) => setFormData(prev => ({
                  ...prev,
                  characteristics: nextRows.map((row) => {
                    const existing = prev.characteristics.find((c) => c.id === row.id) || {};
                    return {
                      ...existing,
                      ...row,
                      comments: existing.comments || row.comments || [],
                      commentsCount: undefined,
                      commentHint: undefined
                    };
                  })
                }))}
                height={"45vh"}
                hideClearAllMappings={true}
              />
            </div>
          </TabPanel>
        </TabPanel>

        <TabPanel isActive={selectedTab === 'sensors'}>
          <TabSwitcher
            selectedTab={sensorsView}
            onTabChange={setSensorsView}
            tabs={[
              { id: 'simple-view', label: 'Simple View', tooltip: 'Edit sensors with collapsible cards' },
              { id: 'grid-view', label: 'Grid View', tooltip: 'Edit sensors inline in a grid' }
            ]}
          />
          <TabPanel isActive={sensorsView === 'simple-view'}>
            <SensorsEditor
              sensors={formData.sensors}
              onSensorsChange={(sensors) =>
                setFormData(prev => ({ ...prev, sensors }))
              }
            />
          </TabPanel>
          <TabPanel isActive={sensorsView === 'grid-view'}>
            <div className="mt-3 border border-gray-200 rounded-lg">
              <DataGrid
                {...sensorGridConfig}
                showControls={true}
                showDebug={false}
                historyScopeKey={`${historyScopeBase}:sensors`}
                isActive={selectedTab === 'sensors' && sensorsView === 'grid-view'}
                onRowDataChange={(nextRows) => setFormData(prev => ({
                  ...prev,
                  sensors: nextRows.map((row) => {
                    const existing = prev.sensors.find((s) => s.id === row.id) || {};
                    return {
                      ...existing,
                      ...row,
                      additionalInfo: existing.additionalInfo || row.additionalInfo || []
                    };
                  })
                }))}
                height={"45vh"}
                hideClearAllMappings={true}
              />
            </div>
          </TabPanel>
        </TabPanel>

        <TabPanel isActive={selectedTab === 'configurations'}>
          <TabSwitcher
            selectedTab={configurationsView}
            onTabChange={setConfigurationsView}
            tabs={[
              { id: 'simple-view', label: 'Simple View', tooltip: 'Edit configurations with collapsible cards' },
              { id: 'grid-view', label: 'Grid View', tooltip: 'Edit configurations inline in a grid' }
            ]}
          />
          <TabPanel isActive={configurationsView === 'simple-view'}>
            <ConfigurationsEditor
              configurations={formData.configurations}
              onConfigurationsChange={(configurations) =>
                setFormData(prev => ({ ...prev, configurations }))
              }
            />
          </TabPanel>
          <TabPanel isActive={configurationsView === 'grid-view'}>
            <div className="mt-3 border border-gray-200 rounded-lg">
              <DataGrid
                {...configurationGridConfig}
                showControls={true}
                showDebug={false}
                historyScopeKey={`${historyScopeBase}:configurations`}
                isActive={selectedTab === 'configurations' && configurationsView === 'grid-view'}
                onRowDataChange={(nextRows) => setFormData(prev => ({
                  ...prev,
                  configurations: nextRows.map((row) => {
                    const existing = prev.configurations.find((c) => c.id === row.id) || {};
                    return {
                      ...existing,
                      ...row,
                      details: existing.details || row.details || [],
                      detailsCount: undefined,
                      detailsHint: undefined
                    };
                  })
                }))}
                height={"45vh"}
                hideClearAllMappings={true}
              />
            </div>
          </TabPanel>
        </TabPanel>

        <TabPanel isActive={selectedTab === 'measurement-protocols'}>
          <ProtocolEntityGridSection
            title="Measurement Protocols"
            count={numberOfMeasurementProtocols}
            items={formData.measurementProtocols || []}
            itemPrefix="mp"
            activeItemId={activeMeasurementProtocolId}
            onToggleItem={toggleMeasurementProtocol}
            onAddItem={addMeasurementProtocol}
            onRemoveItem={removeMeasurementProtocol}
            onUpdateItemField={updateMeasurementProtocol}
            addButtonTooltip="Add Measurement Protocol"
            removeButtonTooltip="Remove measurement protocol"
            accentDotClassName="bg-indigo-500"
            description="Define measurement protocol variants. Open a variant to edit its name, description, and sensor-parameter mapping grid."
            sensors={formData.sensors || []}
            gridConfig={measurementProtocolGridConfig}
            onGridMappingsChange={handleMeasurementProtocolMappingsChange}
            onGridRowDataChange={handleMeasurementProtocolRowsChange}
            isTabActive={selectedTab === 'measurement-protocols'}
            historyScopeKey={`${historyScopeBase}:measurement-protocol:${activeMeasurementProtocolId || 'none'}`}
            emptyStateTitle="No measurement protocols added yet."
            emptyStateHint='Click "Add Measurement Protocol" to get started.'
          />
        </TabPanel>

        <TabPanel isActive={selectedTab === 'processing-protocols'}>
          <ProtocolEntityGridSection
            title="Processing Protocols"
            count={numberOfProcessingProtocols}
            items={formData.processingProtocols || []}
            itemPrefix="pp"
            activeItemId={activeProcessingProtocolId}
            onToggleItem={toggleProcessingProtocol}
            onAddItem={addProcessingProtocol}
            onRemoveItem={removeProcessingProtocol}
            onUpdateItemField={updateProcessingProtocol}
            addButtonTooltip="Add Processing Protocol"
            removeButtonTooltip="Remove processing protocol"
            accentDotClassName="bg-orange-500"
            description="Define processing protocol variants. Open a variant to edit its name, description, and sensor-parameter mapping grid."
            sensors={formData.sensors || []}
            gridConfig={processingProtocolGridConfig}
            onGridMappingsChange={handleProcessingProtocolMappingsChange}
            onGridRowDataChange={handleProcessingProtocolRowsChange}
            isTabActive={selectedTab === 'processing-protocols'}
            historyScopeKey={`${historyScopeBase}:processing-protocol:${activeProcessingProtocolId || 'none'}`}
            emptyStateTitle="No processing protocols added yet."
            emptyStateHint='Click "Add Processing Protocol" to get started.'
          />
        </TabPanel>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end space-x-3">
        <TooltipButton
          onClick={handleCloseRequest}
          tooltipText={"Cancel"}
          className="cursor-pointer px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <span>Cancel</span>
        </TooltipButton>

        <TooltipButton
          onClick={handleSubmit}
          tooltipText={isEditing ? 'Update Test Setup' : 'Add Test Setup'}
        >
          <Save className="w-4 h-4" />
          <span>{isEditing ? 'Update Test Setup' : 'Add Test Setup'}</span>
        </TooltipButton>
      </div>

      <AlertDecisionDialog
        open={showCloseWarning}
        tone="warning"
        title="Unsaved changes"
        message="You are closing the test setup editor. Save changes before closing, or discard them."
        confirmLabel="Save and close"
        cancelLabel="Keep editing"
        confirmTooltip="Save test setup and close the editor"
        cancelTooltip="Return to the form without closing"
        tertiaryLabel="Discard and close"
        tertiaryTooltip="Close and discard unsaved changes"
        tertiaryButtonProps={{
          className: 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700'
        }}
        onConfirm={handleSaveAndClose}
        onTertiary={handleDiscardAndClose}
        onCancel={handleKeepEditing}
      />
    </div>
  );
};

export default TestSetupForm;

