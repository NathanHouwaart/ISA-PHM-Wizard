import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

const TestSetupForm = ({ testSetup, onSave, onCancel, isEditing = false }) => {
  const initialFormState = {
    name: '',
    location: '',
    characteristics: [],
    number_of_sensors: 0,
    sensors: []
  };

  const [formData, setFormData] = useState(initialFormState);
  const [expandedCharacteristics, setExpandedCharacteristics] = useState(new Set());
  const [expandedSensors, setExpandedSensors] = useState(new Set());

  useEffect(() => {
    if (testSetup) {
      setFormData({
        name: testSetup.name || '',
        location: testSetup.location || '',
        characteristics: testSetup.characteristics || [],
        number_of_sensors: testSetup.number_of_sensors || 0,
        sensors: testSetup.sensors || []
      });
    } else {
      setFormData(initialFormState);
    }
  }, [testSetup]);

  // Auto-adjust sensors array when number_of_sensors changes
  useEffect(() => {
    const targetSensorCount = formData.number_of_sensors;
    const currentSensorCount = formData.sensors.length;
    
    if (targetSensorCount > currentSensorCount) {
      // Add sensors
      const newSensors = [...formData.sensors];
      for (let i = currentSensorCount; i < targetSensorCount; i++) {
        newSensors.push({
          identifier: '',
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
        });
      }
      setFormData(prev => ({ ...prev, sensors: newSensors }));
    } else if (targetSensorCount < currentSensorCount) {
      // Remove excess sensors
      setFormData(prev => ({ 
        ...prev, 
        sensors: prev.sensors.slice(0, targetSensorCount) 
      }));
    }
  }, [formData.number_of_sensors]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.location.trim()) {
      alert('Please fill in all required fields (Name, Location)');
      return;
    }

    if (formData.sensors.length !== formData.number_of_sensors) {
      alert(`Number of sensors must match the specified count (${formData.number_of_sensors})`);
      return;
    }

    const testSetupData = {
      ...formData,
      id: isEditing ? testSetup.id : `testsetup-${Date.now()}`
    };

    onSave(testSetupData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'number_of_sensors' ? parseInt(value) || 0 : value
    }));
  };

  const toggleCharacteristic = (index) => {
    setExpandedCharacteristics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
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

  // Characteristic handlers
  const addCharacteristic = () => {
    const newIndex = formData.characteristics.length;
    setFormData(prev => ({
      ...prev,
      characteristics: [...prev.characteristics, { category: '', value: '', unit: '', comments: [] }]
    }));
    setExpandedCharacteristics(prev => new Set([...prev, newIndex]));
  };

  const updateCharacteristic = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      characteristics: prev.characteristics.map((char, i) => 
        i === index ? { ...char, [field]: value } : char
      )
    }));
  };

  const removeCharacteristic = (index) => {
    setFormData(prev => ({
      ...prev,
      characteristics: prev.characteristics.filter((_, i) => i !== index)
    }));
    setExpandedCharacteristics(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      // Adjust indices for remaining items
      const adjustedSet = new Set();
      Array.from(newSet).forEach(i => {
        if (i > index) adjustedSet.add(i - 1);
        else adjustedSet.add(i);
      });
      return adjustedSet;
    });
  };

  // Comment handlers
  const addComment = (charIndex) => {
    setFormData(prev => ({
      ...prev,
      characteristics: prev.characteristics.map((char, i) => 
        i === charIndex ? { ...char, comments: [...char.comments, { name: '', value: '' }] } : char
      )
    }));
  };

  const updateComment = (charIndex, commentIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      characteristics: prev.characteristics.map((char, i) => 
        i === charIndex ? {
          ...char,
          comments: char.comments.map((comment, j) => 
            j === commentIndex ? { ...comment, [field]: value } : comment
          )
        } : char
      )
    }));
  };

  const removeComment = (charIndex, commentIndex) => {
    setFormData(prev => ({
      ...prev,
      characteristics: prev.characteristics.map((char, i) => 
        i === charIndex ? {
          ...char,
          comments: char.comments.filter((_, j) => j !== commentIndex)
        } : char
      )
    }));
  };

  // Sensor handlers
  const updateSensor = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      sensors: prev.sensors.map((sensor, i) => 
        i === index ? { ...sensor, [field]: value } : sensor
      )
    }));
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const requiredAsterisk = <span className="text-red-500">*</span>;

  const getSensorSummary = (sensor) => {
    const identifier = sensor.identifier || 'Untitled';
    const type = sensor.measurement_type || 'No type';
    return `${identifier} - ${type}`;
  };

  const getCharacteristicSummary = (characteristic) => {
    const category = characteristic.category || 'No category';
    const value = characteristic.value || 'No value';
    return `${category}: ${value}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-h-screen overflow-y-auto">
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
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="name" className={labelClasses}>
                Name {requiredAsterisk}
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
                Location {requiredAsterisk}
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
          <div className="max-w-xs">
            <label htmlFor="number_of_sensors" className={labelClasses}>
              Number of Sensors {requiredAsterisk}
            </label>
            <input
              type="number"
              id="number_of_sensors"
              name="number_of_sensors"
              value={formData.number_of_sensors}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Enter number of sensors"
              min="0"
              max="100"
              required
            />
          </div>
        </div>

        {/* Characteristics Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">
              Characteristics {requiredAsterisk}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({formData.characteristics.length} items)
              </span>
            </h4>
            <button
              type="button"
              onClick={addCharacteristic}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Characteristic</span>
            </button>
          </div>

          <div className="space-y-2">
            {formData.characteristics.map((characteristic, charIndex) => (
              <div key={charIndex} className="bg-white border border-gray-200 rounded-lg">
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleCharacteristic(charIndex)}
                >
                  <div className="flex items-center space-x-3">
                    {expandedCharacteristics.has(charIndex) ? 
                      <ChevronDown className="w-4 h-4 text-gray-500" /> : 
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    }
                    <span className="font-medium text-gray-900">
                      Characteristic {charIndex + 1}
                    </span>
                    <span className="text-sm text-gray-500">
                      {getCharacteristicSummary(characteristic)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCharacteristic(charIndex);
                    }}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {expandedCharacteristics.has(charIndex) && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <div>
                        <label className={labelClasses}>Category {requiredAsterisk}</label>
                        <input
                          type="text"
                          value={characteristic.category}
                          onChange={(e) => updateCharacteristic(charIndex, 'category', e.target.value)}
                          className={inputClasses}
                          placeholder="Enter category"
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Value {requiredAsterisk}</label>
                        <input
                          type="text"
                          value={characteristic.value}
                          onChange={(e) => updateCharacteristic(charIndex, 'value', e.target.value)}
                          className={inputClasses}
                          placeholder="Enter value"
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Unit</label>
                        <input
                          type="text"
                          value={characteristic.unit}
                          onChange={(e) => updateCharacteristic(charIndex, 'unit', e.target.value)}
                          className={inputClasses}
                          placeholder="Enter unit"
                        />
                      </div>
                    </div>

                    {/* Comments for this characteristic */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h6 className="text-sm font-medium text-gray-700">
                          Comments ({characteristic.comments.length})
                        </h6>
                        <button
                          type="button"
                          onClick={() => addComment(charIndex)}
                          className="flex items-center space-x-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Comment</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {characteristic.comments.map((comment, commentIndex) => (
                          <div key={commentIndex} className="bg-white border border-gray-200 rounded p-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-600">
                                Comment {commentIndex + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeComment(charIndex, commentIndex)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Name {requiredAsterisk}</label>
                                <input
                                  type="text"
                                  value={comment.name}
                                  onChange={(e) => updateComment(charIndex, commentIndex, 'name', e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Comment name"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Value</label>
                                <input
                                  type="text"
                                  value={comment.value}
                                  onChange={(e) => updateComment(charIndex, commentIndex, 'value', e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Comment value"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sensors Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">
              Sensors {requiredAsterisk}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({formData.sensors.length} of {formData.number_of_sensors})
              </span>
            </h4>
            {formData.number_of_sensors === 0 && (
              <p className="text-sm text-gray-500">Set number of sensors above to add sensors</p>
            )}
          </div>

          <div className="space-y-2">
            {formData.sensors.map((sensor, sensorIndex) => (
              <div key={sensorIndex} className="bg-white border border-gray-200 rounded-lg">
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSensor(sensorIndex)}
                >
                  <div className="flex items-center space-x-3">
                    {expandedSensors.has(sensorIndex) ? 
                      <ChevronDown className="w-4 h-4 text-gray-500" /> : 
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    }
                    <span className="font-medium text-gray-900">
                      Sensor {sensorIndex + 1}
                    </span>
                    <span className="text-sm text-gray-500">
                      {getSensorSummary(sensor)}
                    </span>
                  </div>
                </div>

                {expandedSensors.has(sensorIndex) && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    {/* Basic Information */}
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className={labelClasses}>Identifier</label>
                          <input
                            type="text"
                            value={sensor.identifier}
                            onChange={(e) => updateSensor(sensorIndex, 'identifier', e.target.value)}
                            className={inputClasses}
                            placeholder="Enter sensor identifier"
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>Description</label>
                          <input
                            type="text"
                            value={sensor.description}
                            onChange={(e) => updateSensor(sensorIndex, 'description', e.target.value)}
                            className={inputClasses}
                            placeholder="Enter description"
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>Technology Type</label>
                          <input
                            type="text"
                            value={sensor.technology_type}
                            onChange={(e) => updateSensor(sensorIndex, 'technology_type', e.target.value)}
                            className={inputClasses}
                            placeholder="Enter technology type"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Measurement Information */}
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-gray-700 mb-3">Measurement</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className={labelClasses}>Measurement Type</label>
                          <input
                            type="text"
                            value={sensor.measurement_type}
                            onChange={(e) => updateSensor(sensorIndex, 'measurement_type', e.target.value)}
                            className={inputClasses}
                            placeholder="Enter measurement type"
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>Measurement Unit</label>
                          <input
                            type="text"
                            value={sensor.measurement_unit}
                            onChange={(e) => updateSensor(sensorIndex, 'measurement_unit', e.target.value)}
                            className={inputClasses}
                            placeholder="Enter measurement unit"
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>Technology Platform</label>
                          <input
                            type="text"
                            value={sensor.technology_platform}
                            onChange={(e) => updateSensor(sensorIndex, 'technology_platform', e.target.value)}
                            className={inputClasses}
                            placeholder="Enter technology platform"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Data Acquisition */}
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-gray-700 mb-3">Data Acquisition</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className={labelClasses}>Data Acquisition Unit</label>
                          <input
                            type="text"
                            value={sensor.data_acquisition_unit}
                            onChange={(e) => updateSensor(sensorIndex, 'data_acquisition_unit', e.target.value)}
                            className={inputClasses}
                            placeholder="Enter data acquisition unit"
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>Sampling Rate</label>
                          <input
                            type="text"
                            value={sensor.sampling_rate}
                            onChange={(e) => updateSensor(sensorIndex, 'sampling_rate', e.target.value)}
                            className={inputClasses}
                            placeholder="Enter sampling rate"
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>Sampling Unit</label>
                          <input
                            type="text"
                            value={sensor.sampling_unit}
                            onChange={(e) => updateSensor(sensorIndex, 'sampling_unit', e.target.value)}
                            className={inputClasses}
                            placeholder="Enter sampling unit"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Location & Orientation */}
                    <div>
                      <h6 className="text-sm font-medium text-gray-700 mb-3">Location & Orientation</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className={labelClasses}>Sensor Location</label>
                          <input
                            type="text"
                            value={sensor.sensor_location}
                            onChange={(e) => updateSensor(sensorIndex, 'sensor_location', e.target.value)}
                            className={inputClasses}
                            placeholder="Enter sensor location"
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>Location Unit</label>
                          <input
                            type="text"
                            value={sensor.location_unit}
                            onChange={(e) => updateSensor(sensorIndex, 'location_unit', e.target.value)}
                            className={inputClasses}
                            placeholder="Enter location unit"
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>Sensor Orientation</label>
                          <input
                            type="text"
                            value={sensor.sensor_orientation}
                            onChange={(e) => updateSensor(sensorIndex, 'sensor_orientation', e.target.value)}
                            className={inputClasses}
                            placeholder="Enter sensor orientation"
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>Orientation Unit</label>
                          <input
                            type="text"
                            value={sensor.orientation_unit}
                            onChange={(e) => updateSensor(sensorIndex, 'orientation_unit', e.target.value)}
                            className={inputClasses}
                            placeholder="Enter orientation unit"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
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