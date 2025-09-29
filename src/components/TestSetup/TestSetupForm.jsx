import React, { useState, useEffect } from 'react';
import { X, Save, Trash, Trash2, HelpCircle, ChevronDown, ChevronRight, Bold, Heading, Plus, Icon, Circle } from 'lucide-react';
import AnimatedTooltip, { AnimatedTooltipExample, AnimatedTooltipExplanation } from '../Tooltip/AnimatedTooltipProvider';
import { cn } from '../../utils/utils';
import FormField from '../Form/FormField';
import TabSwitcher, { TabPanel } from '../TabSwitcher';
import Heading3 from '../Typography/Heading3';
import { Form, set } from 'react-hook-form';
import { v4 as uuid4 } from 'uuid';


import IconTooltipButton, { IconToolTipButton } from '../Widgets/IconTooltipButton';
import { TooltipButton } from '../Widgets/TooltipButton';
import { TableTooltip } from '../Widgets/TableTooltip';
import Paragraph, { SlidePageSubtitle } from '../Typography/Paragraph';

// Comment Component
const CommentEditor = ({ comments = [], onCommentsChange }) => {
  const addComment = () => {
    const newComments = [...comments, { name: '', value: '' }];
    onCommentsChange(newComments);
  };

  const updateComment = (index, field, value) => {
    const updatedComments = comments.map((comment, i) =>
      i === index ? { ...comment, [field]: value } : comment
    );
    onCommentsChange(updatedComments);
  };

  const removeComment = (index) => {
    const filteredComments = comments.filter((_, i) => i !== index);
    onCommentsChange(filteredComments);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h6 className="text-sm font-semibold text-gray-700">
          Comments ({comments.length})
        </h6>
        <button
          type="button"
          onClick={addComment}
          className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors"
        >
          Add Comment
        </button>
      </div>

      <div className="space-y-4">
        {comments.map((comment, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                Comment {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeComment(index)}
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-1 transition-colors"
                title="Remove comment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={comment.name}
                  onChange={(e) => updateComment(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter a title for this comment"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment Text
                </label>
                <textarea
                  value={comment.value}
                  onChange={(e) => updateComment(index, 'value', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your comment text here..."
                  rows="3"
                />
              </div>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">
            No comments added yet. Click "Add Comment" to get started.
          </p>
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
            <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
            <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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

                    {/* Additional Information (dynamic key/value entries) */}
                    <div>
                      <h6 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                        Additional Information
                        <span className="text-xs text-gray-500 ml-2">(add or remove custom fields)</span>
                      </h6>
                   
                      <Paragraph className={"px-2 border-b border-gray-300 pb-3 mb-3 text-sm text-gray-600"}>
                        Specify measurement details for each sensor. As many measurement details can be added/removed as required to describe the measurement. If a detail is only relevant for part of the sensors, please leave cells empty for the sensors where they are not applicable.
                      </Paragraph>

                      <div className="space-y-3">
                        {(sensor.additionalInfo && sensor.additionalInfo.length > 0 ? sensor.additionalInfo : convertOldFieldsToAdditional(sensor)).map((entry, eIdx) => (
                          <div key={entry.id || eIdx} className="grid gap-3 items-center grid-cols-[1fr_1fr_auto]">
                            <div>
                              <FormField
                                name={`sensor-${index}-additional-${eIdx}-name`}
                                label={"Name"}
                                value={entry.name}
                                onChange={(e) => updateAdditionalInfo(index, eIdx, 'name', e.target.value)}
                                placeholder="Field name (e.g. Sampling Rate)"
                              />
                            </div>
                            <div>
                              <FormField
                                name={`sensor-${index}-additional-${eIdx}-value`}
                                label={"Value"}
                                value={entry.value}
                                onChange={(e) => updateAdditionalInfo(index, eIdx, 'value', e.target.value)}
                                placeholder="Value"
                              />
                            </div>
                            <div className="flex justify-end">
                              <IconTooltipButton
                                icon={Trash}
                                onClick={() => removeAdditionalInfo(index, eIdx)}
                                className="h-8 w-8 mt-5 text-gray-400 hover:bg-red-100 rounded-md p-1 transition-colors"
                                tooltipText={"Remove field"}
                              />
                            </div>
                          </div>
                        ))}

                        <div>
                          <TooltipButton
                            type="button"
                            onClick={() => addAdditionalInfo(index)}
                            tooltipText={"Add a custom field"}
                            className="px-6 py-3 mt-5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                          >
                            <span className='mr-2'><Plus /></span> Add Field
                          </TooltipButton>
                        </div>
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

// Main TestSetupForm Component
const TestSetupForm = ({ item, onSave, onCancel, isEditing = false }) => {
  const initialFormState = {
    name: '',
    location: '',
    description: '',
    characteristics: [],
    sensors: []
  };

  const [formData, setFormData] = useState(initialFormState);
  const [selectedTab, setSelectedTab] = useState('basic-info');
  const [activeTooltips, setActiveTooltips] = useState(false);


  // Calculate number of sensors from sensors array
  const numberOfSensors = formData.sensors.length;
  const numberOfCharacteristics = formData.characteristics.length

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        location: item.location || '',
        experimentPreparationProtocolName: item.experimentPreparationProtocolName || '',
        testSpecimenName: item.testSpecimenName || '',
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
    if (!formData.name.trim() || !formData.location.trim() || !formData.experimentPreparationProtocolName.trim() || !formData.testSpecimenName.trim()) {
      alert('Please fill in all required fields (Name, Location, Experiment Preparation Protocol Name, Set-up or test specimen-name).');
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

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Test Setup' : 'Add New Test Setup'}
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

      <div className="p-4">
        <TabSwitcher
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          tabs={[
            { id: 'basic-info', label: 'Basic Information', tooltip: 'Basic Information about the test setup' },
            { id: 'characteristics', label: `Characteristics (${numberOfCharacteristics})`, tooltip: 'Characteristics of the test setup' },
            { id: 'sensors', label: `Sensors (${numberOfSensors})`, tooltip: 'Sensors used in the test setup' },
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
          {/* Characteristics Section */}
          <CharacteristicsEditor
            characteristics={formData.characteristics}
            onCharacteristicsChange={(characteristics) =>
              setFormData(prev => ({ ...prev, characteristics }))
            }
          />
        </TabPanel>

        <TabPanel isActive={selectedTab === 'sensors'}>
          {/* Sensors Section */}
          <SensorsEditor
            sensors={formData.sensors}
            onSensorsChange={(sensors) =>
              setFormData(prev => ({ ...prev, sensors }))
            }
          />
        </TabPanel>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end space-x-3">
        <TooltipButton
          onClick={onCancel}
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
    </div>
  );
};

export default TestSetupForm;