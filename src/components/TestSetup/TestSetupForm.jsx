import React, { useState, useEffect } from 'react';
import { X, Save, Trash, Trash2, HelpCircle, ChevronDown, ChevronRight, Bold } from 'lucide-react';
import AnimatedTooltip, { AnimatedTooltipExample, AnimatedTooltipExplanation } from '../Tooltip/AnimatedTooltip';
import { cn } from '../../utils/utils';

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


  const addCharacteristic = () => {
    const newCharacteristic = {
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
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">
          Characteristics
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({characteristics.length} items)
          </span>
        </h4>
        <button
          type="button"
          onClick={addCharacteristic}
          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
        >
          Add Characteristic
        </button>
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCharacteristic(index);
                    }}
                    className="px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded text-sm transition-colors"
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={characteristic.category}
                          onChange={(e) => updateCharacteristic(index, 'category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter category"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Value <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={characteristic.value}
                          onChange={(e) => updateCharacteristic(index, 'value', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter value"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unit
                        </label>
                        <input
                          type="text"
                          value={characteristic.unit}
                          onChange={(e) => updateCharacteristic(index, 'unit', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter unit"
                        />
                      </div>
                    </div>
                    <div className="flex-shrink-0 mt-6">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleTooltip(index) }}
                        className="h-12 w-12 flex items-center justify-center group hover:bg-gray-100 rounded-full transition-colors duration-200"
                      >
                        <HelpCircle className="h-5 w-5 text-gray-500 hover:text-blue-500 transition-colors duration-200" />
                      </button>
                    </div>

                  </div>

                  <div className="">
                    <AnimatedTooltip isVisible={activeTooltips.has(index)}>
                      {/* Explanations */}
                      <AnimatedTooltipExplanation><b>Category: </b>Category of the characteristic you are describing</AnimatedTooltipExplanation>
                      <AnimatedTooltipExplanation><b>Value: </b>Value of the characteristic you are describing</AnimatedTooltipExplanation>
                      <AnimatedTooltipExplanation><b>Unit: </b>Unit of the characteristic you are describing (may be optional)</AnimatedTooltipExplanation>

                      {/* Examples */}
                      <AnimatedTooltipExample>
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {["Category", "Unit", "Value"].map((header, index) => (
                                <th
                                  key={index} // Using index as key is acceptable here since headers are static
                                  className="px-6 py-3 text-left text-xs text-gray-500 uppercase" /* Applied rounded corners to first/last header cells */
                                >
                                  <b>{header}</b>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          {/* Table Body */}
                          <tbody className="bg-white divide-y divide-gray-200">
                            {[
                              { category: "Motor", value: "WEG W21", unit: "N/A" },
                              { category: "Motor Power", value: "2.2", unit: "kW" },
                              { category: "Hydraulic Pump", value: "Hydropack", unit: "N/A" }
                            ].map((row, rowIndex) => (
                              <tr key={row.id} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                  {row.category}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                  {row.value}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                  {row.unit}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </AnimatedTooltipExample>
                    </AnimatedTooltip>
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

  const addSensor = () => {
    const newSensor = {
      id: '',
      measurement_type: '',
      measurement_unit: '',
      description: '',
      technology_type: '',
      technology_platform: '',
      data_acquisition_unit: '',
      sampling_rate: '',
      sampling_unit: '',
      sensor_location: '',
      location_unit: '',
      sensor_orientation: '',
      orientation_unit: ''
    };
    const newSensors = [...sensors, newSensor];
    onSensorsChange(newSensors);

    // Auto-expand the new sensor
    setExpandedSensors(prev => new Set([...prev, newSensors.length - 1]));
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

    const platform = sensor.technology_platform;
    const samplingRate = sensor.sampling_rate;
    const samplingUnit = sensor.sampling_unit;

    return `${platform} - ${samplingRate} ${samplingUnit}`;
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">
          Sensors
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({sensors.length} items)
          </span>
        </h4>
        <button
          type="button"
          onClick={addSensor}
          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
        >
          Add Sensor
        </button>
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
                    <span className='font-bold'>{sensor.measurement_type} ({sensor.measurement_unit}): </span>
                    {getSensorSummary(sensor)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSensor(index);
                    }}
                    className="px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded text-sm transition-colors"
                  >
                    <Trash2 className='h-4 w-4' />
                  </button>
                  <span className="text-gray-400">
                    {isExpanded ?
                      <ChevronDown className="w-4 h-4 text-gray-500" /> :
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    }
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-200 p-4 bg-white space-y-6">
                  {/* Basic Information */}
                  <div className='space-y-3'>
                    <h6 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                      Basic Information
                    </h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClasses}>Identifier</label>
                        <input
                          type="text"
                          value={"s" + (index + 1)}
                          onChange={(e) => updateSensor(index, 'identifier', e.target.value)}
                          className={cn(inputClasses, "bg-gray-300")}
                          disabled={true}
                        />
                      </div>

                      <div>
                        <label className={labelClasses}>Technology Platform</label>
                        <input
                          type="text"
                          value={sensor.technology_platform}
                          onChange={(e) => updateSensor(index, 'technology_platform', e.target.value)}
                          className={inputClasses}
                          placeholder="Enter technology platform"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Technology Type</label>
                        <input
                          type="text"
                          value={sensor.technology_type}
                          onChange={(e) => updateSensor(index, 'technology_type', e.target.value)}
                          className={inputClasses}
                          placeholder="Enter technology type"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClasses}>Description</label>
                      <textarea
                        type="text"
                        value={sensor.description}
                        onChange={(e) => updateSensor(index, 'description', e.target.value)}
                        className={inputClasses}
                        placeholder="Enter description"
                        rows={4}
                      />
                    </div>
                  </div>

                  {/* Measurement Information */}
                  <div>
                    <h6 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                      Measurement
                    </h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClasses}>Measurement Type</label>
                        <input
                          type="text"
                          value={sensor.measurement_type}
                          onChange={(e) => updateSensor(index, 'measurement_type', e.target.value)}
                          className={inputClasses}
                          placeholder="Enter measurement type"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Measurement Unit</label>
                        <input
                          type="text"
                          value={sensor.measurement_unit}
                          onChange={(e) => updateSensor(index, 'measurement_unit', e.target.value)}
                          className={inputClasses}
                          placeholder="Enter measurement unit"
                        />
                      </div>

                    </div>
                  </div>

                  {/* Data Acquisition */}
                  <div>
                    <h6 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                      Data Acquisition
                    </h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClasses}>Data Acquisition Unit</label>
                        <input
                          type="text"
                          value={sensor.data_acquisition_unit}
                          onChange={(e) => updateSensor(index, 'data_acquisition_unit', e.target.value)}
                          className={inputClasses}
                          placeholder="Enter data acquisition unit"
                        />
                      </div>

                      <div>
                        <label className={labelClasses}>Sampling Rate</label>
                        <input
                          type="text"
                          value={sensor.sampling_rate}
                          onChange={(e) => updateSensor(index, 'sampling_rate', e.target.value)}
                          className={inputClasses}
                          placeholder="Enter sampling rate"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Sampling Unit</label>
                        <input
                          type="text"
                          value={sensor.sampling_unit}
                          onChange={(e) => updateSensor(index, 'sampling_unit', e.target.value)}
                          className={inputClasses}
                          placeholder="Enter sampling unit"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Location & Orientation */}
                  <div>
                    <h6 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                      Location & Orientation
                    </h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className={labelClasses}>Sensor Location</label>
                        <input
                          type="text"
                          value={sensor.sensor_location}
                          onChange={(e) => updateSensor(index, 'sensor_location', e.target.value)}
                          className={inputClasses}
                          placeholder="Enter sensor location"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Location Unit</label>
                        <input
                          type="text"
                          value={sensor.location_unit}
                          onChange={(e) => updateSensor(index, 'location_unit', e.target.value)}
                          className={inputClasses}
                          placeholder="Enter location unit"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Sensor Orientation</label>
                        <input
                          type="text"
                          value={sensor.sensor_orientation}
                          onChange={(e) => updateSensor(index, 'sensor_orientation', e.target.value)}
                          className={inputClasses}
                          placeholder="Enter sensor orientation"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Orientation Unit</label>
                        <input
                          type="text"
                          value={sensor.orientation_unit}
                          onChange={(e) => updateSensor(index, 'orientation_unit', e.target.value)}
                          className={inputClasses}
                          placeholder="Enter orientation unit"
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

  // Calculate number of sensors from sensors array
  const numberOfSensors = formData.sensors.length;
  const numberOfCharacteristics = formData.characteristics.length

  useEffect(() => {
    if (item) {
      setFormData({
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
    if (!formData.name.trim() || !formData.location.trim()) {
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-2";

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Test Setup' : 'Add New Test Setup'}
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
        <div className="bg-gray-50 rounded-lg space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className={labelClasses}>
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Enter test setup name"
                required
              />
            </div>
            <div>
              <label htmlFor="location" className={labelClasses}>
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Enter location"
                required
              />
            </div>
          </div>
          <label htmlFor="location" className={labelClasses}>
            Description
          </label>
          <textarea
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={inputClasses}
            placeholder="Enter description"
            rows={4}
          />

          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="number_of_characteristics" className={labelClasses}>
                Number of Characteristics
              </label>
              <input
                type="number"
                id="number_of_characteristics"
                name="number_of_characteristics"
                value={numberOfCharacteristics}
                className={`${inputClasses} bg-gray-100 cursor-not-allowed`}
                placeholder="Calculated automatically"
                readOnly
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">
                This value is calculated automatically based on the characteristics you add below.
              </p>
            </div>
            <div>
              <label htmlFor="number_of_sensors" className={labelClasses}>
                Number of Sensors
              </label>
              <input
                type="number"
                id="number_of_sensors"
                name="number_of_sensors"
                value={numberOfSensors}
                className={`${inputClasses} bg-gray-100 cursor-not-allowed`}
                placeholder="Calculated automatically"
                readOnly
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">
                This value is calculated automatically based on the sensors you add below.
              </p>
            </div>
          </div> */}
        </div>

        {/* Characteristics Section */}
        <CharacteristicsEditor
          characteristics={formData.characteristics}
          onCharacteristicsChange={(characteristics) =>
            setFormData(prev => ({ ...prev, characteristics }))
          }
        />

        {/* Sensors Section */}
        <SensorsEditor
          sensors={formData.sensors}
          onSensorsChange={(sensors) =>
            setFormData(prev => ({ ...prev, sensors }))
          }
        />

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
            <span>{isEditing ? 'Update Test Setup' : 'Add Test Setup'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestSetupForm;