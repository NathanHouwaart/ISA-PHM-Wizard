import React, { useState } from 'react';
import { Trash2, HelpCircle, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import FormField from '../../Form/FormField';
import { v4 as uuid4 } from 'uuid';
import IconTooltipButton from '../../Widgets/IconTooltipButton';
import TableTooltip from '../../Widgets/TableTooltip';
import Paragraph from '../../Typography/Paragraph';
// Sensors Component
const SensorsEditor = ({ sensors, onSensorsChange }) => {
  const [expandedSensors, setExpandedSensors] = useState(new Set());
  const [activeTooltip, setActiveTooltip] = useState(false);

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

export default SensorsEditor;

