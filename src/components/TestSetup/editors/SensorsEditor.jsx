import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Plus, Settings2, Trash2 } from 'lucide-react';
import { v4 as uuid4 } from 'uuid';
import FormField from '../../Form/FormField';
import Heading3 from '../../Typography/Heading3';
import Paragraph from '../../Typography/Paragraph';
import AnimatedTooltip, { AnimatedTooltipExplanation, AnimatedTooltipExample } from '../../Tooltip/AnimatedTooltipProvider';
import TooltipButton from '../../Widgets/TooltipButton';
import AlertDecisionDialog from '../../Widgets/AlertDecisionDialog';
import SensorTypeDialog from '../SensorTypeDialog';
import QuantityKindField from '../../Form/fields/QuantityKindField';
import DatasheetField from '../../Form/fields/DatasheetField';
import { missingSensorTypeFields } from '../../../utils/sensorTypeValidation';
import { isAmbiguousQuantityName } from '../../../utils/quantityCatalogue';
import {
  normalizeSensor,
  SENSOR_USAGE_BOTH,
  SENSOR_USAGE_CONDITION_MONITORING,
  SENSOR_USAGE_DATASET_OUTPUT,
  SENSOR_USAGE_OPTIONS
} from '../../../utils/sensorUsage';

const getSensorKey = (sensor, index) => sensor.id || `sensor-${index}`;

const getSensorSummary = (sensor, sensorType) => (
  sensorType?.name || sensor.technologyType || sensor.measurementType || 'Not yet described'
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
  if (usage === SENSOR_USAGE_CONDITION_MONITORING) return 'Monitors conditions';
  if (usage === SENSOR_USAGE_BOTH) return 'Measures + monitors';
  return 'Measures degradation';
};

const SensorsEditor = ({ sensors, sensorTypes = [], physicalDevices = [], onPhysicalDevicesChange, onSensorsChange, onSensorTypesChange }) => {
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isTypeManagerOpen, setIsTypeManagerOpen] = useState(false);
  const [isSavingType, setIsSavingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [typeDraft, setTypeDraft] = useState({});
  const [typeError, setTypeError] = useState('');

  const selectedIndex = useMemo(
    () => sensors.findIndex((sensor, index) => getSensorKey(sensor, index) === selectedId),
    [sensors, selectedId]
  );
  const selectedSensor = selectedIndex >= 0 ? normalizeSensor(sensors[selectedIndex]) : null;
  const selectedDevice = physicalDevices.find((device) => device.id === selectedDeviceId);
  const sensorDevice = physicalDevices.find((device) => device.id === selectedSensor?.physicalDeviceId);
  const selectedSensorType = useMemo(
    () => sensorTypes.find((type) => type.id === selectedSensor?.sensorTypeId) || null,
    [sensorTypes, selectedSensor?.sensorTypeId]
  );

  useEffect(() => {
    if (selectedDeviceId && physicalDevices.some((device) => device.id === selectedDeviceId)) return;
    const hasSelectedSensor = sensors.some((sensor, index) => getSensorKey(sensor, index) === selectedId);
    if (hasSelectedSensor) return;
    setSelectedId(sensors.length ? getSensorKey(sensors[0], 0) : null);
  }, [sensors, selectedId, selectedDeviceId, physicalDevices]);

  const addSensor = (deviceId = '') => {
    const sensor = {
      id: uuid4(),
      alias: `Sensor SE${String(sensors.length + 1).padStart(2, '0')}`,
      measurementType: '',
      quantityKindIdentifier: '',
      measurementUnit: '',
      samplingRate: '',
      description: '',
      technologyType: '',
      technologyPlatform: '',
      additionalInfo: [],
      phase: '',
      usage: SENSOR_USAGE_DATASET_OUTPUT,
      sensorTypeId: '',
      physicalDeviceId: deviceId
    };
    onSensorsChange([...sensors, sensor]);
    setSelectedId(sensor.id);
    setSelectedDeviceId(null);
  };

  const applySensorType = (sensorTypeId) => {
    if (!sensorTypeId) {
      updateSensor('sensorTypeId', '');
      return;
    }
    const sensorType = sensorTypes.find((type) => type.id === sensorTypeId);
    if (!sensorType) return;
    onSensorsChange(sensors.map((sensor, index) => (
      index === selectedIndex
        ? normalizeSensor({
          ...sensor,
          sensorTypeId,
          technologyPlatform: sensorType.technologyPlatform || '',
          technologyType: sensorType.technologyType || '',
          measurementType: sensor.measurementType || sensorType.measurementType || '',
          quantityKindIdentifier: sensor.quantityKindIdentifier || (!sensor.measurementType ? sensorType.quantityKindIdentifier : '') || ''
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
  };

  const selectSensor = (sensorId) => {
    setSelectedId(sensorId);
    setSelectedDeviceId(null);
    setIsSavingType(false);
  };

  const saveAsType = () => {
    if (!selectedSensor) return;
    const missing = missingSensorTypeFields({ ...typeDraft, name: newTypeName });
    if (missing.length) {
      setTypeError(`Please provide: ${missing.join(', ')}.`);
      return;
    }
    const type = {
      id: uuid4(), name: newTypeName.trim(),
      technologyPlatform: (typeDraft.technologyPlatform || '').trim(),
      technologyType: (typeDraft.technologyType || '').trim(),
      measurementType: typeDraft.measurementType || '',
      quantityKindIdentifier: typeDraft.quantityKindIdentifier || ''
    };
    onSensorTypesChange([...sensorTypes, type]);
    onSensorsChange(sensors.map((sensor, index) => index === selectedIndex ? normalizeSensor({ ...sensor, sensorTypeId: type.id, technologyPlatform: type.technologyPlatform, technologyType: type.technologyType, measurementType: type.measurementType, quantityKindIdentifier: type.quantityKindIdentifier }) : sensor));
    setIsSavingType(false);
  };

  const startAddOutput = (deviceId = '') => {
    addSensor(deviceId);
  };

  const addDevice = () => {
    const device = { id: uuid4(), name: '', model: '', serialNumber: '' };
    onPhysicalDevicesChange?.([...physicalDevices, device]);
    setSelectedId(null);
    setSelectedDeviceId(device.id);
  };

  const updateDevice = (field, value) => onPhysicalDevicesChange?.(physicalDevices.map((device) => (
    device.id === selectedDeviceId ? { ...device, [field]: value } : device
  )));

  return (
    <>
      <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 pb-2">
      <div className="overflow-hidden rounded-lg border border-gray-300 bg-gray-50">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <div>
            <Heading3 className="text-base">Sensor outputs</Heading3>
            <Paragraph className="mt-1 text-sm text-gray-600">
              Describe the sensors in this test setup and how their data is used.
            </Paragraph>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <TooltipButton
              onClick={() => setIsTypeManagerOpen(true)}
              tooltipText="Manage reusable sensor types"
              className="h-9 shrink-0 justify-center whitespace-nowrap px-3 py-0 text-xs font-medium leading-none border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <Settings2 className="h-4 w-4" />
              <span>Manage types</span>
            </TooltipButton>
            <TooltipButton
              onClick={addDevice}
              tooltipText="Add device"
              className="h-9 w-44 shrink-0 justify-center whitespace-nowrap px-2 py-0 text-xs font-medium leading-none bg-blue-600 text-white hover:bg-blue-700 rounded-md"
            ><Plus className="h-4 w-4" /><span>Add device</span></TooltipButton>
            <TooltipButton
              onClick={() => startAddOutput()}
              tooltipText="Add standalone sensor output"
              aria-label="Add standalone sensor output"
              className="h-9 w-44 shrink-0 justify-center whitespace-nowrap px-2 py-0 text-xs font-medium leading-none bg-blue-600 text-white hover:bg-blue-700 rounded-md disabled:bg-gray-300"
            >
              <Plus className="h-4 w-4" />
              <span>Add standalone sensor</span>
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

        <AnimatedTooltip isVisible={activeTooltip}>
          <AnimatedTooltipExplanation>A device groups related sensor outputs. A standalone sensor does not need a separate device entry.</AnimatedTooltipExplanation>
          <AnimatedTooltipExplanation><b>Measures degradation:</b> Include the sensor in raw or processed output file mappings. <b>Monitors operating conditions:</b> Record operating conditions without requiring output file mappings. <b>Both:</b> Do both.</AnimatedTooltipExplanation>
          <AnimatedTooltipExample>
            <ul className="space-y-3 p-2" aria-label="Example sensor tree">
              <li>
                <div className="font-semibold text-gray-800">Device: enDAQ 1</div>
                <ul className="ml-2 mt-1 space-y-1 border-l-2 border-blue-200 pl-4">
                  <li><span className="font-medium text-gray-800">Acceleration X</span> <span className="text-gray-500">— Measures degradation</span></li>
                  <li><span className="font-medium text-gray-800">Temperature</span> <span className="text-gray-500">— Monitors operating conditions</span></li>
                </ul>
              </li>
              <li>
                <div className="font-semibold text-gray-800">Standalone sensors</div>
                <ul className="ml-2 mt-1 border-l-2 border-gray-300 pl-4">
                  <li><span className="font-medium text-gray-800">Bearing accelerometer</span> <span className="text-gray-500">— Measures degradation</span></li>
                </ul>
              </li>
            </ul>
          </AnimatedTooltipExample>
        </AnimatedTooltip>

        <div className="flex min-h-[28rem] flex-col md:h-[45rem] md:flex-row md:items-stretch">
          <aside className="w-full shrink-0 border-b border-gray-200 bg-white md:flex md:w-72 md:self-stretch md:flex-col md:border-b-0 md:border-r">
            <div className="max-h-56 space-y-1 overflow-y-auto p-2 md:max-h-none md:min-h-0 md:flex-1">
              {[...physicalDevices, null].map((device, deviceIndex) => <div key={device?.id || 'standalone'}>
                {device ? <div className="flex items-center gap-1">
                  <button type="button" onClick={() => { setSelectedId(null); setSelectedDeviceId(device.id); }} className={`min-w-0 flex-1 truncate rounded-md px-3 py-2 text-left text-sm font-semibold ${selectedDeviceId === device.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}`}>{device.name?.trim() ? device.name : `Unnamed device ${deviceIndex + 1}`}</button>
                  <TooltipButton onClick={() => startAddOutput(device.id)} aria-label={`Add output to ${device.name || device.model || 'unnamed device'}`} tooltipText="Add output to device" className="rounded-md bg-blue-600 p-1 text-white hover:bg-blue-700"><Plus className="h-4 w-4" /></TooltipButton>
                </div> : <div className="px-3 pt-4 text-xs font-semibold uppercase text-gray-500">Standalone sensors</div>}
              <div className="ml-3 border-l-2 border-gray-200">
              {sensors.map((sensor, index) => {
                if (device ? sensor.physicalDeviceId !== device.id : physicalDevices.some((item) => item.id === sensor.physicalDeviceId)) return null;
                const sensorId = getSensorKey(sensor, index);
                const normalizedSensor = normalizeSensor(sensor);
                const usage = normalizedSensor.usage;
                const sensorType = sensorTypes.find((type) => type.id === normalizedSensor.sensorTypeId);

                return (
                  <button
                    key={sensorId}
                    type="button"
                    onClick={() => selectSensor(sensorId)}
                    className={`ml-4 w-[calc(100%-1rem)] rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
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
              </div>
              </div>)}

              {sensors.length === 0 && (
                <Paragraph className="px-2 py-5 text-sm text-gray-500">No sensors yet.</Paragraph>
              )}
            </div>
          </aside>

          <main className="min-w-0 flex-1 p-5 md:min-h-0 md:overflow-y-auto">
            {selectedDevice ? (
              <div className="space-y-4">
                <Heading3 className="text-xl">Edit device</Heading3>
                <Paragraph className="text-sm text-gray-600">Describe the physical device. Add only outputs used in this experiment.</Paragraph>
                {[["name", "Device name"], ["model", "Model"], ["serialNumber", "Serial number"]].map(([field, label]) => <FormField key={field} label={label} name={`device-${field}`} value={selectedDevice[field] || ''} onChange={(event) => updateDevice(field, event.target.value)} required={field === 'name'} />)}
                <DatasheetField label="Device datasheet" required unavailableLabel="Datasheet unavailable" value={selectedDevice.datasheet} onChange={(datasheet) => updateDevice('datasheet', datasheet)} explanation="Attach the device datasheet or explicitly mark it unavailable. It applies to this device's outputs." />
                <div className="flex gap-2 border-t border-gray-200 pt-4">
                  <TooltipButton onClick={() => startAddOutput(selectedDevice.id)} tooltipText="Add an output from this device" className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"><Plus className="h-4 w-4" /><span>Add output</span></TooltipButton>
                  <TooltipButton onClick={() => { onPhysicalDevicesChange?.(physicalDevices.filter((device) => device.id !== selectedDevice.id)); setSelectedDeviceId(null); }} disabled={sensors.some((sensor) => sensor.physicalDeviceId === selectedDevice.id)} tooltipText="Remove outputs from the device before deleting it" className="px-3 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-lg disabled:opacity-40"><Trash2 className="h-4 w-4" /><span>Delete device</span></TooltipButton>
                </div>
              </div>
            ) : !selectedSensor ? (
              <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
                <Settings2 className="mb-4 h-14 w-14 text-gray-300" />
                <Heading3>{sensors.length || physicalDevices.length ? 'Select a sensor or device' : 'How would you like to start?'}</Heading3>
                <Paragraph className="mt-1 text-sm text-gray-600">
                  {sensors.length || physicalDevices.length ? 'Choose an item from the tree, or add a new one.' : 'Choose the option that best describes your equipment.'}
                </Paragraph>
                <div className="mt-5 grid w-full max-w-xl gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => startAddOutput()} className="rounded-lg border border-gray-300 bg-white p-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-50">
                    <span className="block font-semibold text-gray-900">Add standalone sensor</span>
                    <span className="mt-1 block text-sm text-gray-600">For one sensor, such as a single-axis accelerometer.</span>
                  </button>
                  <button type="button" onClick={addDevice} className="rounded-lg border border-gray-300 bg-white p-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-50">
                    <span className="block font-semibold text-gray-900">Add device with outputs</span>
                    <span className="mt-1 block text-sm text-gray-600">For a device with multiple channels, such as an enDAQ.</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div>
                    <Heading3 className="text-xl">{selectedSensor.alias || 'Edit sensor'}</Heading3>
                    <Paragraph className="text-sm text-gray-500">{sensorDevice ? `Device: ${sensorDevice.name || sensorDevice.model || 'Unnamed device'}` : 'Standalone sensor'}</Paragraph>
                  </div>
                  <TooltipButton
                    onClick={() => setShowDeleteConfirmation(true)}
                    tooltipText="Remove sensor"
                    aria-label="Remove sensor"
                    className="rounded-md bg-none bg-transparent p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </TooltipButton>
                </div>

                <div className="space-y-4">
                  <Heading3 className="text-base">Basic information</Heading3>
                <FormField
                  name={`sensor-${selectedIndex}-alias`}
                  value={selectedSensor.alias || ''}
                  onChange={(event) => updateSensor('alias', event.target.value)}
                  label="Alias"
                  type="text"
                  placeholder="e.g. vib_de"
                  required
                />

                {selectedSensorType ? <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md bg-gray-50 p-3 text-sm"><span className="block text-gray-500">Technology type <span className="text-red-500">*</span></span><span className="font-medium text-gray-800">{selectedSensorType.technologyType || selectedSensor.technologyType || 'Not specified'}</span></div>
                  <div className="rounded-md bg-gray-50 p-3 text-sm"><span className="block text-gray-500">Sensor model <span className="text-red-500">*</span></span><span className="font-medium text-gray-800">{selectedSensorType.technologyPlatform || selectedSensor.technologyPlatform || 'Not specified'}</span></div>
                  <Paragraph className="text-xs text-gray-500 md:col-span-2">Model and technology come from the selected reusable type. Edit that type under Manage types.</Paragraph>
                </div> : <div className="grid gap-4 md:grid-cols-2">
                  <FormField name={`sensor-${selectedIndex}-technologyType`} label="Technology type" value={selectedSensor.technologyType || ''} onChange={(event) => updateSensor('technologyType', event.target.value)} required placeholder="e.g. Accelerometer" />
                  <FormField name={`sensor-${selectedIndex}-technologyPlatform`} label="Sensor model" value={selectedSensor.technologyPlatform || ''} onChange={(event) => updateSensor('technologyPlatform', event.target.value)} required placeholder="Sensor model" />
                </div>}

                <QuantityKindField
                  required
                  value={selectedSensor.measurementType}
                  identifier={selectedSensor.quantityKindIdentifier}
                  onChange={({ name, identifier }) => onSensorsChange(sensors.map((sensor, index) => (
                    index === selectedIndex ? normalizeSensor({ ...sensor, measurementType: name, quantityKindIdentifier: identifier }) : sensor
                  )))}
                />
                {!selectedSensor.quantityKindIdentifier && isAmbiguousQuantityName(selectedSensor.measurementType) && <Paragraph className="text-sm text-amber-800">This older quantity name matches multiple ontology options. Select the intended option to include its identifier in the export.</Paragraph>}

                <FormField name={`sensor-${selectedIndex}-physicalDeviceId`} value={selectedSensor.physicalDeviceId || ''}
                  onChange={(event) => updateSensor('physicalDeviceId', event.target.value)} label="Physical device"
                  type="select" placeholder="No device assigned"
                  tags={physicalDevices.map((device) => ({ value: device.id, label: device.name || device.model || 'Unnamed device' }))} />

                <FormField
                  name={`sensor-${selectedIndex}-description`}
                  value={selectedSensor.description || ''}
                  onChange={(event) => updateSensor('description', event.target.value)}
                  label="Description"
                  type="textarea"
                  placeholder="Describe where the sensor is installed and what it measures"
                  rows={3}
                />
                </div>

                <section className="border-y border-gray-200 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <Heading3 className="text-sm font-semibold text-gray-800">Sensor role</Heading3>
                      <TooltipButton
                        tooltipText="Measures degradation: include files in the dataset. Monitors operating conditions: record operating conditions without output file mappings. Both: do both."
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
                        ? 'Measures degradation'
                        : option.value === SENSOR_USAGE_CONDITION_MONITORING
                          ? 'Monitors operating conditions'
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

                <details className="rounded-lg border border-gray-200 p-4">
                  <summary className="cursor-pointer font-semibold text-gray-800">Reusable sensor type (optional){selectedSensorType ? `: ${selectedSensorType.name}` : ''}</summary>
                  <div className="mt-4 space-y-4">
                <FormField
                  name={`sensor-${selectedIndex}-sensorTypeId`}
                  value={selectedSensor.sensorTypeId || ''}
                  onChange={(event) => applySensorType(event.target.value)}
                  label="Reusable sensor type (optional)"
                  type="select"
                  placeholder="No reusable type"
                  tags={sensorTypes.map((type) => ({ value: type.id, label: type.name || 'Unnamed type' }))}
                />

                {!selectedSensorType && (isSavingType ? createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Create reusable sensor type"><div className="max-h-[calc(100vh-4rem)] w-full max-w-xl space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
                  <Heading3 className="text-base">Create reusable sensor type</Heading3>
                  <Paragraph className="text-sm text-gray-600">Review the reusable details before saving.</Paragraph>
                  {typeError && <p role="alert" className="text-sm text-red-700">{typeError}</p>}
                  <FormField label="Reusable type name" name="new-reusable-type-name" value={newTypeName} onChange={(event) => setNewTypeName(event.target.value)} required placeholder="e.g. Industrial accelerometer" />
                  <FormField label="Sensor model" name="new-type-model" value={typeDraft.technologyPlatform || ''} onChange={(event) => setTypeDraft((current) => ({ ...current, technologyPlatform: event.target.value }))} required />
                  <FormField label="Technology type" name="new-type-technology" value={typeDraft.technologyType || ''} onChange={(event) => setTypeDraft((current) => ({ ...current, technologyType: event.target.value }))} required placeholder="e.g. Accelerometer" />
                  <QuantityKindField label="Default measured quantity" required value={typeDraft.measurementType} identifier={typeDraft.quantityKindIdentifier} onChange={({ name, identifier }) => setTypeDraft((current) => ({ ...current, measurementType: name, quantityKindIdentifier: identifier }))} />
                  <div className="flex gap-2"><TooltipButton onClick={saveAsType} tooltipText="Save these sensor details as a reusable type" className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"><span>Save type</span></TooltipButton>
                  <TooltipButton onClick={() => setIsSavingType(false)} tooltipText="Cancel" className="px-3 py-2 bg-gray-500 text-white hover:bg-gray-600 rounded-lg"><span>Cancel</span></TooltipButton></div>
                </div></div>, document.body) : <TooltipButton onClick={() => { setNewTypeName(selectedSensor.technologyPlatform || selectedSensor.technologyType || ''); setTypeDraft({ technologyPlatform: selectedSensor.technologyPlatform || '', technologyType: selectedSensor.technologyType || '', measurementType: selectedSensor.measurementType || '', quantityKindIdentifier: selectedSensor.quantityKindIdentifier || '' }); setTypeError(''); setIsSavingType(true); }} tooltipText="Reuse this sensor's model, technology and quantity for other sensors" className="px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"><span>Save as reusable type</span></TooltipButton>)}

                  </div>
                </details>
                <details className="rounded-lg border border-gray-200 p-4">
                  <summary className="cursor-pointer font-semibold text-gray-800">Sensor datasheet (optional){selectedSensor.datasheet?.fileName ? `: ${selectedSensor.datasheet.fileName}` : selectedSensor.datasheet?.notAvailable ? ': N.A.' : ''}</summary>
                  <div className="mt-4"><DatasheetField label="Sensor datasheet" value={selectedSensor.datasheet} onChange={(datasheet) => updateSensor('datasheet', datasheet)} explanation="For a datasheet specific to this sensor. A device datasheet can be attached to the device instead; a reusable type may also have its own datasheet." /></div>
                </details>
              </div>
            )}
          </main>
        </div>
      </div>
      </div>
      <SensorTypeDialog
        open={isTypeManagerOpen}
        types={sensorTypes}
        devices={physicalDevices}
        sensors={sensors}
        onChange={onSensorTypesChange}
        onDevicesChange={onPhysicalDevicesChange}
        onSensorsChange={onSensorsChange}
        typesOnly
        onClose={() => setIsTypeManagerOpen(false)}
      />
      <AlertDecisionDialog
        open={showDeleteConfirmation}
        tone="danger"
        title={`Remove ${selectedSensor?.alias || 'sensor'}?`}
        message="This removes the sensor from the test setup and removes its associated measurement and processing protocol mappings."
        confirmLabel="Remove sensor"
        cancelLabel="Cancel"
        onConfirm={() => { removeSelectedSensor(); setShowDeleteConfirmation(false); }}
        onCancel={() => setShowDeleteConfirmation(false)}
      />
    </>
  );
};

export default SensorsEditor;
