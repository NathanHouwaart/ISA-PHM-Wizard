import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Plus, Settings2, Trash2 } from 'lucide-react';
import { v4 as uuid4 } from 'uuid';
import FormField from '../../Form/FormField';
import Heading3 from '../../Typography/Heading3';
import Paragraph from '../../Typography/Paragraph';
import TableTooltip from '../../Widgets/TableTooltip';
import TooltipButton from '../../Widgets/TooltipButton';
import SensorTypeDialog from '../SensorTypeDialog';
import SensorTypePickerDialog from '../SensorTypePickerDialog';
import {
  normalizeSensor,
  SENSOR_USAGE_BOTH,
  SENSOR_USAGE_CONDITION_MONITORING,
  SENSOR_USAGE_DATASET_OUTPUT,
  SENSOR_USAGE_OPTIONS
} from '../../../utils/sensorUsage';

const getSensorKey = (sensor, index) => sensor.id || `sensor-${index}`;

const getSensorSummary = (sensor, sensorType) => (
  sensorType?.name || sensor.technologyType || 'No sensor type selected'
);

const getUsageBadgeClassName = (usage) => {
  if (usage === SENSOR_USAGE_CONDITION_MONITORING) {
    return 'bg-amber-100 text-amber-700';
  }
  if (usage === SENSOR_USAGE_BOTH) {
    return 'bg-violet-100 text-violet-700';
  }
  return 'bg-blue-100 text-blue-700';
};

const getUsageShortLabel = (usage) => {
  if (usage === SENSOR_USAGE_CONDITION_MONITORING) return 'Operating conditions';
  if (usage === SENSOR_USAGE_BOTH) return 'Degradation + conditions';
  return 'Degradation';
};

const SensorsEditor = ({ sensors, sensorTypes = [], onSensorsChange, onSensorTypesChange }) => {
  const [selectedId, setSelectedId] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState(false);
  const [isSpecificationExpanded, setIsSpecificationExpanded] = useState(false);
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const [isTypeManagerOpen, setIsTypeManagerOpen] = useState(false);

  const selectedIndex = useMemo(
    () => sensors.findIndex((sensor, index) => getSensorKey(sensor, index) === selectedId),
    [sensors, selectedId]
  );
  const selectedSensor = selectedIndex >= 0 ? normalizeSensor(sensors[selectedIndex]) : null;
  const selectedSensorType = useMemo(
    () => sensorTypes.find((type) => type.id === selectedSensor?.sensorTypeId) || null,
    [sensorTypes, selectedSensor?.sensorTypeId]
  );

  useEffect(() => {
    const hasSelectedSensor = sensors.some((sensor, index) => getSensorKey(sensor, index) === selectedId);
    if (hasSelectedSensor) return;
    setSelectedId(sensors.length ? getSensorKey(sensors[0], 0) : null);
  }, [sensors, selectedId]);

  const addSensor = (sensorType) => {
    if (!sensorType) return;
    const sensor = {
      id: uuid4(),
      alias: `Sensor SE${String(sensors.length + 1).padStart(2, '0')}`,
      measurementType: '',
      measurementUnit: '',
      samplingRate: '',
      description: '',
      technologyType: sensorType.technologyType || '',
      technologyPlatform: sensorType.technologyPlatform || '',
      additionalInfo: [],
      phase: '',
      usage: SENSOR_USAGE_DATASET_OUTPUT,
      sensorTypeId: sensorType.id
    };
    onSensorsChange([...sensors, sensor]);
    setSelectedId(sensor.id);
    setIsSpecificationExpanded(false);
    setIsTypePickerOpen(false);
  };

  const applySensorType = (sensorTypeId) => {
    const sensorType = sensorTypes.find((type) => type.id === sensorTypeId);
    if (!sensorType) return;
    onSensorsChange(sensors.map((sensor, index) => (
      index === selectedIndex
        ? normalizeSensor({
          ...sensor,
          sensorTypeId,
          technologyPlatform: sensorType.technologyPlatform || '',
          technologyType: sensorType.technologyType || '',
          measurementType: sensorType.measurementType || ''
        })
        : sensor
    )));
  };

  const updateSensor = (field, value) => {
    if (selectedIndex < 0) return;
    onSensorsChange(sensors.map((sensor, index) => (
      index === selectedIndex ? normalizeSensor({ ...sensor, [field]: value }) : sensor
    )));
  };

  const removeSelectedSensor = () => {
    if (selectedIndex < 0) return;
    const nextSensors = sensors.filter((_, index) => index !== selectedIndex);
    const nextSelected = nextSensors[selectedIndex] || nextSensors[selectedIndex - 1];
    onSensorsChange(nextSensors);
    setSelectedId(nextSelected ? getSensorKey(nextSelected, Math.min(selectedIndex, nextSensors.length - 1)) : null);
    setIsSpecificationExpanded(false);
  };

  const selectSensor = (sensorId) => {
    setSelectedId(sensorId);
    setIsSpecificationExpanded(false);
  };

  return (
    <>
      <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 pb-2">
      <div className="overflow-hidden rounded-lg border border-gray-300 bg-gray-50">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <div>
            <Heading3 className="text-base">Sensors</Heading3>
            <Paragraph className="mt-1 text-sm text-gray-600">
              Describe the sensors in this test setup and how their data is used.
            </Paragraph>
          </div>
          <div className="flex items-center gap-2">
            <TooltipButton
              onClick={() => setIsTypeManagerOpen(true)}
              tooltipText="Manage sensor types"
              className="h-8 px-3 py-0 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
            >
              <Settings2 className="h-4 w-4" />
              <span>Manage Types</span>
            </TooltipButton>
            <TooltipButton
              onClick={() => setIsTypePickerOpen(true)}
              tooltipText="Add sensor"
              disabled={sensorTypes.length === 0}
              className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md disabled:bg-gray-300"
            >
              <Plus className="h-4 w-4" />
            </TooltipButton>
            <TooltipButton
              onClick={() => setActiveTooltip((visible) => !visible)}
              tooltipText="Show sensor field guidance"
              aria-label="Show sensor field guidance"
              className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
            >
              <HelpCircle className="h-4 w-4 text-white" />
            </TooltipButton>
          </div>
        </div>

        <TableTooltip
          isVisible={activeTooltip}
          explanations={[
            <><b>Degradation monitoring:</b> The sensor is included in raw and/or processed output file mappings.</>,
            <><b>Operating-condition monitoring:</b> The sensor records operating conditions without requiring output files.</>,
            <><b>Both:</b> The sensor supports both degradation and operating-condition monitoring.</>
          ]}
          examples={[
            { alias: 'vib_de', usage: 'Degradation monitoring', description: 'Drive-end vibration accelerometer' },
            { alias: 'pressure_guard', usage: 'Operating-condition monitoring', description: 'Protective hydraulic-pressure sensor' },
            { alias: 'motor_torque', usage: 'Degradation + operating-condition monitoring', description: 'Measured motor torque from controller' }
          ]}
        />

        <div className="flex min-h-[28rem] flex-col md:h-[45rem] md:flex-row md:items-stretch">
          <aside className="w-full shrink-0 border-b border-gray-200 bg-white md:flex md:w-72 md:self-stretch md:flex-col md:border-b-0 md:border-r">
            <div className="max-h-56 space-y-1 overflow-y-auto p-2 md:max-h-none md:min-h-0 md:flex-1">
              {sensors.map((sensor, index) => {
                const sensorId = getSensorKey(sensor, index);
                const normalizedSensor = normalizeSensor(sensor);
                const usage = normalizedSensor.usage;
                const sensorType = sensorTypes.find((type) => type.id === normalizedSensor.sensorTypeId);

                return (
                  <button
                    key={sensorId}
                    type="button"
                    onClick={() => selectSensor(sensorId)}
                    className={`w-full rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                      sensorId === selectedId
                        ? 'border-blue-200 bg-blue-50 text-blue-900'
                        : 'border-transparent text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {normalizedSensor.alias || `Sensor ${index + 1}`}
                      </span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getUsageBadgeClassName(usage)}`}>
                        {getUsageShortLabel(usage)}
                      </span>
                    </span>
                    <span
                      className="mt-1 block truncate pl-4 text-xs text-gray-500"
                      title={getSensorSummary(normalizedSensor, sensorType)}
                    >
                      Type · {getSensorSummary(normalizedSensor, sensorType)}
                    </span>
                  </button>
                );
              })}

              {sensors.length === 0 && (
                <Paragraph className="px-2 py-5 text-sm text-gray-500">No sensors yet.</Paragraph>
              )}
            </div>
          </aside>

          <main className="min-w-0 flex-1 p-5 md:min-h-0 md:overflow-y-auto">
            {!selectedSensor ? (
              <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
                <Settings2 className="mb-4 h-14 w-14 text-gray-300" />
                <Heading3>No sensor selected</Heading3>
                <Paragraph className="mt-1 text-sm text-gray-600">
                  Add a sensor to describe the test setup and its data role.
                </Paragraph>
                <TooltipButton
                  onClick={() => setIsTypePickerOpen(true)}
                  tooltipText="Add sensor"
                  disabled={sensorTypes.length === 0}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:bg-gray-300"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Sensor</span>
                </TooltipButton>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <Heading3 className="text-xl">Edit Sensor</Heading3>
                  <TooltipButton
                    onClick={removeSelectedSensor}
                    tooltipText="Remove sensor"
                    aria-label="Remove sensor"
                    className="rounded-md bg-none bg-transparent p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </TooltipButton>
                </div>

                <FormField
                  name={`sensor-${selectedIndex}-sensorTypeId`}
                  value={selectedSensor.sensorTypeId || ''}
                  onChange={(event) => applySensorType(event.target.value)}
                  label="Sensor Type"
                  type="select"
                  placeholder="Select sensor type"
                  tags={sensorTypes.map((type) => ({ value: type.id, label: type.name || 'Unnamed type' }))}
                />

                <FormField
                  name={`sensor-${selectedIndex}-alias`}
                  value={selectedSensor.alias || ''}
                  onChange={(event) => updateSensor('alias', event.target.value)}
                  label="Alias"
                  type="text"
                  placeholder="e.g. vib_de"
                  required
                />

                <FormField
                  name={`sensor-${selectedIndex}-description`}
                  value={selectedSensor.description || ''}
                  onChange={(event) => updateSensor('description', event.target.value)}
                  label="Description"
                  type="textarea"
                  placeholder="Describe where the sensor is installed and what it measures"
                  rows={3}
                />

                <section className="border-y border-gray-200 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <Heading3 className="text-sm font-semibold text-gray-800">Sensor role</Heading3>
                      <TooltipButton
                        tooltipText="Degradation monitoring: include files in the dataset. Operating-condition monitoring: record operating conditions without output file mappings. Both: do both."
                        className="h-7 w-7 rounded-full bg-none bg-transparent p-0 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                        aria-label="Explain sensor role options"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </TooltipButton>
                    </div>
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1" role="radiogroup" aria-label="Sensor role">
                    {SENSOR_USAGE_OPTIONS.map((option) => {
                      const isSelected = selectedSensor.usage === option.value;
                      const label = option.value === SENSOR_USAGE_DATASET_OUTPUT
                        ? 'Degradation'
                        : option.value === SENSOR_USAGE_CONDITION_MONITORING
                          ? 'Operating conditions'
                          : 'Both';
                      return (
                        <TooltipButton
                          key={option.value}
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => updateSensor('usage', option.value)}
                          tooltipText={option.description}
                          className={`h-8 rounded-md bg-none px-3 py-0 text-xs font-medium ${
                            isSelected
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-transparent text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <span>{label}</span>
                        </TooltipButton>
                      );
                    })}
                    </div>
                  </div>
                </section>

                <section className="border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsSpecificationExpanded((expanded) => !expanded)}
                    className="flex w-full items-center justify-between rounded-md py-1 text-left text-sm font-medium text-gray-700 transition-colors hover:text-blue-600"
                    aria-expanded={isSpecificationExpanded}
                  >
                    <span>Sensor type specification</span>
                    {isSpecificationExpanded
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {isSpecificationExpanded && (
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      {[
                        ['Sensor model', selectedSensorType?.technologyPlatform || selectedSensor.technologyPlatform],
                        ['Technology type', selectedSensorType?.technologyType || selectedSensor.technologyType],
                        ['Measurement type', selectedSensorType?.measurementType || selectedSensor.measurementType]
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                          <span className="block text-xs font-medium text-gray-500">{label}</span>
                          <span className="mt-1 block text-sm text-gray-800">{value || 'Not specified'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
      </div>
      <SensorTypeDialog
        open={isTypeManagerOpen}
        types={sensorTypes}
        sensors={sensors}
        onChange={onSensorTypesChange}
        onClose={() => setIsTypeManagerOpen(false)}
      />
      <SensorTypePickerDialog
        open={isTypePickerOpen}
        types={sensorTypes}
        onSelect={addSensor}
        onClose={() => setIsTypePickerOpen(false)}
      />
    </>
  );
};

export default SensorsEditor;
