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
import DeviceDefinitionDialog from '../DeviceDefinitionDialog';
import { createDeviceDefinition, instantiateDeviceDefinition, quantityNeedsMappingReview } from '../../../utils/deviceDefinitions';
import QuantityKindField from '../../Form/fields/QuantityKindField';
import SensorModelField from '../../Form/fields/SensorModelField';
import DatasheetField from '../../Form/fields/DatasheetField';
import { missingSensorTypeFields } from '../../../utils/sensorTypeValidation';
import { isAmbiguousQuantityName, isKnownSensorQuantity } from '../../../utils/quantityCatalogue';
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

const SensorsEditor = ({ sensors, sensorTypes = [], physicalDevices = [], deviceDefinitions = [], onDeviceDefinitionsChange, onPhysicalDevicesChange, onSensorsChange, onSensorTypesChange }) => {
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDeleteDeviceConfirmation, setShowDeleteDeviceConfirmation] = useState(false);
  const [isTypeManagerOpen, setIsTypeManagerOpen] = useState(false);
  const [isSavingType, setIsSavingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [typeDraft, setTypeDraft] = useState({});
  const [typeError, setTypeError] = useState('');
  const [manageMenu, setManageMenu] = useState(false);
  const [deviceManager, setDeviceManager] = useState(false);
  const [addChoice, setAddChoice] = useState('');
  const [addMethod, setAddMethod] = useState('');
  const [selectedDefinitionId, setSelectedDefinitionId] = useState('');
  const [outputSensorTypeId, setOutputSensorTypeId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [selectedOutputs, setSelectedOutputs] = useState([]);
  const [outputDeviceId, setOutputDeviceId] = useState('');
  const [deviceError, setDeviceError] = useState('');
  const [saveDeviceName, setSaveDeviceName] = useState('');
  const [savingDeviceDefinition, setSavingDeviceDefinition] = useState(false);
  const [deviceNotice, setDeviceNotice] = useState(null);
  const [manageDeviceDefinitionId, setManageDeviceDefinitionId] = useState('');
  const [manageSensorDefinitionId, setManageSensorDefinitionId] = useState('');
  const [showResetOverride, setShowResetOverride] = useState(false);

  const selectedIndex = useMemo(
    () => sensors.findIndex((sensor, index) => getSensorKey(sensor, index) === selectedId),
    [sensors, selectedId]
  );
  const selectedSensor = selectedIndex >= 0 ? normalizeSensor(sensors[selectedIndex]) : null;
  const selectedDevice = physicalDevices.find((device) => device.id === selectedDeviceId);
  const sensorDevice = physicalDevices.find((device) => device.id === selectedSensor?.physicalDeviceId);
  const linkedDeviceDefinition = deviceDefinitions.find((definition) => definition.id === sensorDevice?.definitionId);
  const linkedDeviceOutput = linkedDeviceDefinition?.outputs?.find((output) => output.id === selectedSensor?.definitionOutputId);
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

  const addSensor = (deviceId = '', typeId = '') => {
    const type = sensorTypes.find((item) => item.id === typeId);
    const sensor = {
      id: uuid4(),
      alias: `Sensor SE${String(sensors.length + 1).padStart(2, '0')}`,
      measurementType: type?.measurementType || '',
      quantityKindIdentifier: type?.quantityKindIdentifier || '',
      measurementUnit: '',
      samplingRate: '',
      description: '',
      technologyType: type?.technologyType || '',
      technologyPlatform: type?.technologyPlatform || '',
      additionalInfo: [],
      phase: '',
      usage: SENSOR_USAGE_DATASET_OUTPUT,
      sensorTypeId: typeId,
      physicalDeviceId: deviceId
    };
    onSensorsChange([...sensors, sensor]);
    setSelectedId(sensor.id);
    setSelectedDeviceId(null);
  };

  const resetSensorOverride = () => {
    const definition = linkedDeviceOutput || selectedSensorType;
    if (!definition || selectedIndex < 0) return;
    onSensorsChange(sensors.map((sensor, index) => index === selectedIndex ? normalizeSensor({
      ...sensor,
      definitionOverride: false,
      technologyType: definition.technologyType || '',
      technologyPlatform: definition.technologyPlatform || '',
      measurementType: definition.measurementType || '',
      quantityKindIdentifier: definition.quantityKindIdentifier || '',
      mappingReviewRequired: sensor.mappingReviewRequired || quantityNeedsMappingReview(sensor.measurementType, sensor.quantityKindIdentifier, definition.measurementType, definition.quantityKindIdentifier)
    }) : sensor));
    setShowResetOverride(false);
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
      quantityKindIdentifier: typeDraft.quantityKindIdentifier || '',
      ...(selectedSensor.datasheet ? { datasheet: selectedSensor.datasheet } : {})
    };
    onSensorTypesChange([...sensorTypes, type]);
    onSensorsChange(sensors.map((sensor, index) => index === selectedIndex ? normalizeSensor({ ...sensor, sensorTypeId: type.id, technologyPlatform: type.technologyPlatform, technologyType: type.technologyType, measurementType: type.measurementType, quantityKindIdentifier: type.quantityKindIdentifier, mappingReviewRequired: sensor.mappingReviewRequired || quantityNeedsMappingReview(sensor.measurementType, sensor.quantityKindIdentifier, type.measurementType, type.quantityKindIdentifier) }) : sensor));
    setIsSavingType(false);
  };

  const openSaveSensorDefinition = () => {
    setNewTypeName(selectedSensor.technologyPlatform || selectedSensor.technologyType || '');
    setTypeDraft({ technologyPlatform: selectedSensor.technologyPlatform || '', technologyType: selectedSensor.technologyType || '', measurementType: selectedSensor.measurementType || '', quantityKindIdentifier: selectedSensor.quantityKindIdentifier || '' });
    setTypeError('');
    setIsSavingType(true);
  };

  const startAddOutput = (deviceId = '') => {
    const device = physicalDevices.find((item) => item.id === deviceId);
    const definition = deviceDefinitions.find((item) => item.id === device?.definitionId);
    if (!definition && !sensorTypes.length) { setManageSensorDefinitionId(''); setIsTypeManagerOpen(true); return; }
    setOutputDeviceId(deviceId); setSelectedDefinitionId(definition?.id || ''); setOutputSensorTypeId(''); setSelectedOutputs([]); setDeviceError(''); setAddMethod(definition ? 'device-outputs' : sensorTypes.length ? 'saved' : ''); setAddChoice('output');
  };

  const requestStandalone = () => {
    if (!sensorTypes.length) { setManageSensorDefinitionId(''); setIsTypeManagerOpen(true); return; }
    setSelectedDefinitionId(''); setAddMethod(sensorTypes.length ? 'saved' : ''); setAddChoice('sensor');
  };

  const requestDevice = () => {
    if (!deviceDefinitions.length) { setManageDeviceDefinitionId(''); setDeviceManager(true); return; }
    setSelectedDefinitionId(''); setNewDeviceName(''); setSelectedOutputs([]); setDeviceError(''); setAddMethod(deviceDefinitions.length ? 'saved' : ''); setAddChoice('device');
  };

  const addFromDefinition = () => {
    const definition = deviceDefinitions.find((item) => item.id === selectedDefinitionId);
    if (!definition || !newDeviceName.trim()) { setDeviceError('Select a definition and enter a device name.'); return; }
    const created = instantiateDeviceDefinition(definition, newDeviceName, selectedOutputs);
    onPhysicalDevicesChange([...physicalDevices, created.device]);
    onSensorsChange([...sensors, ...created.sensors]);
    setSelectedId(null); setSelectedDeviceId(created.device.id); setAddChoice('');
  };

  const addDefinedOutputs = () => {
    const definition = deviceDefinitions.find((item) => item.id === selectedDefinitionId);
    if (!definition || !selectedOutputs.length) { setDeviceError('Select at least one output.'); return; }
    const created = instantiateDeviceDefinition(definition, 'temporary', selectedOutputs);
    onSensorsChange([...sensors, ...created.sensors.map((sensor) => ({ ...sensor, physicalDeviceId: outputDeviceId }))]);
    setAddChoice(''); setSelectedId(null); setSelectedDeviceId(outputDeviceId);
  };

  const getDeviceSensors = () => (
    sensors.filter((sensor) => sensor.physicalDeviceId === selectedDevice.id).map((sensor) => {
      const type = sensorTypes.find((item) => item.id === sensor.sensorTypeId);
      return { ...sensor, technologyType: type?.technologyType || sensor.technologyType,
        technologyPlatform: type?.technologyPlatform || sensor.technologyPlatform,
        datasheet: sensor.datasheet || type?.datasheet };
    })
  );

  const saveDeviceDefinition = () => {
    const deviceSensors = getDeviceSensors();
    if (!selectedDevice.name?.trim()) { setDeviceError('Enter a device name before saving its definition.'); return; }
    const incomplete = deviceSensors.filter((sensor) => !sensor.alias?.trim() || !sensor.technologyType?.trim() || !sensor.measurementType?.trim() || !sensor.technologyPlatform?.trim());
    if (incomplete.length) { setDeviceError(`Complete the name, sensor model, technology type and measured quantity for: ${incomplete.map((sensor) => sensor.alias || 'unnamed output').join(', ')}.`); return; }
    if (deviceSensors.some((sensor) => !isKnownSensorQuantity(sensor.measurementType, sensor.quantityKindIdentifier))) {
      setDeviceError('Select a recognized measured quantity for each output before saving a definition.'); return;
    }
    if (!selectedDevice.datasheet?.attachmentId && selectedDevice.datasheet?.notAvailable !== true) {
      setDeviceError('Attach a device datasheet or mark it unavailable before saving a definition.'); return;
    }
    setDeviceError('');
    setSaveDeviceName(selectedDevice.model?.trim() || selectedDevice.name.trim());
    setSavingDeviceDefinition(true);
  };

  const commitDeviceDefinition = () => {
    if (!saveDeviceName.trim()) { setDeviceError('Enter a definition name.'); return; }
    const deviceSensors = getDeviceSensors();
    const definition = createDeviceDefinition(selectedDevice, deviceSensors);
    definition.name = saveDeviceName.trim();
    onDeviceDefinitionsChange([...deviceDefinitions, definition]);
    onPhysicalDevicesChange(physicalDevices.map((device) => device.id === selectedDevice.id ? { ...device, definitionId: definition.id } : device));
    const outputBySensor = new Map(deviceSensors.map((sensor, index) => [sensor.id, definition.outputs[index].id]));
    const snapshots = new Map(deviceSensors.map((sensor) => [sensor.id, sensor]));
    const outputModels = new Map(deviceSensors.map((sensor, index) => [sensor.id, definition.outputs[index].technologyPlatform]));
    onSensorsChange(sensors.map((sensor) => outputBySensor.has(sensor.id) ? {
      ...sensor, definitionOutputId: outputBySensor.get(sensor.id),
      technologyType: snapshots.get(sensor.id).technologyType,
      technologyPlatform: outputModels.get(sensor.id),
      ...(snapshots.get(sensor.id).datasheet ? { datasheet: snapshots.get(sensor.id).datasheet } : {}),
    } : sensor));
    setDeviceError('');
    setSavingDeviceDefinition(false);
    setDeviceNotice({ id: selectedDevice.id, message: `Saved “${definition.name}” as a device definition.` });
  };

  const updateDevice = (field, value) => onPhysicalDevicesChange?.(physicalDevices.map((device) => (
    device.id === selectedDeviceId ? { ...device, [field]: value } : device
  )));

  return (
    <>
      <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 pb-2">
      <div className="rounded-lg border border-gray-300 bg-gray-50">
        <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 rounded-t-lg border-b border-gray-200 bg-white px-4 py-3">
          <div>
            <Heading3 className="text-base">Sensor outputs</Heading3>
            <Paragraph className="mt-1 text-sm text-gray-600">
              Describe the sensors in this test setup and how their data is used.
            </Paragraph>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="relative">
              <TooltipButton onClick={() => setManageMenu((open) => !open)} aria-expanded={manageMenu} tooltipText="Manage saved definitions" className="h-9 shrink-0 justify-center whitespace-nowrap px-3 py-0 text-xs font-medium leading-none border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 rounded-md"><Settings2 className="h-4 w-4" /><span>Manage definitions</span></TooltipButton>
              {manageMenu && <div className="absolute left-0 z-50 mt-1 w-56 max-w-[calc(100vw-2rem)] space-y-1 rounded-md border border-gray-200 bg-white p-1 shadow-lg">
                <button type="button" onClick={() => { setManageMenu(false); setManageSensorDefinitionId(''); setIsTypeManagerOpen(true); }} className="w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">Sensor definitions</button>
                <button type="button" onClick={() => { setManageMenu(false); setManageDeviceDefinitionId(''); setDeviceManager(true); }} className="w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">Device definitions</button>
              </div>}
            </div>
            <TooltipButton
              onClick={requestDevice}
              tooltipText="Add device"
              className="h-9 w-44 shrink-0 justify-center whitespace-nowrap px-2 py-0 text-xs font-medium leading-none bg-blue-600 text-white hover:bg-blue-700 rounded-md"
            ><Plus className="h-4 w-4" /><span>Add device</span></TooltipButton>
            <TooltipButton
              onClick={requestStandalone}
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
                  <TooltipButton onClick={() => startAddOutput(device.id)} aria-label={`Add output to ${device.name || device.model || 'unnamed device'}`} tooltipText="Add output to device" className="h-7 shrink-0 rounded-md bg-blue-600 px-1.5 py-0 text-xs text-white hover:bg-blue-700"><Plus className="h-3 w-3" /><span>Add</span></TooltipButton>
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
                    {normalizedSensor.mappingReviewRequired && <span className="mt-1 block pl-4 text-xs font-medium text-amber-700">Review mappings</span>}
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
                {selectedDevice.definitionId && <Paragraph className="text-sm text-gray-600">This device uses a saved definition. Its name and serial number identify this individual device. Changes to its model or datasheet here are local overrides; edit the definition to update linked devices that have not been overridden.</Paragraph>}
                {deviceNotice?.id === selectedDevice.id && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{deviceNotice.message}</p>}
                {[["name", "Device name"], ["model", "Model"], ["serialNumber", "Serial number"]].map(([field, label]) => <FormField key={field} label={label} name={`device-${field}`} value={selectedDevice[field] || ''} onChange={(event) => updateDevice(field, event.target.value)} required={field === 'name'} />)}
                <Paragraph className="text-sm text-gray-600">Serial number is optional and identifies this individual physical device.</Paragraph>
                <DatasheetField label="Device datasheet" required unavailableLabel="Datasheet unavailable" value={selectedDevice.datasheet} onChange={(datasheet) => updateDevice('datasheet', datasheet)} explanation="Attach the device datasheet or explicitly mark it unavailable. It applies to this device's outputs." />
                {deviceError && <p role="alert" className="text-sm text-red-700">{deviceError}</p>}
                <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4">
                  <TooltipButton onClick={() => startAddOutput(selectedDevice.id)} tooltipText="Add an output from this device" className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"><Plus className="h-4 w-4" /><span>Add output</span></TooltipButton>
                  {!selectedDevice.definitionId && <TooltipButton onClick={saveDeviceDefinition} tooltipText="Save this device and its outputs for reuse" className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg"><span>Save as definition</span></TooltipButton>}
                  {selectedDevice.definitionId && <TooltipButton onClick={() => { setManageDeviceDefinitionId(selectedDevice.definitionId); setDeviceManager(true); }} tooltipText="Edit the saved definition used by this device" className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg"><span>Edit definition</span></TooltipButton>}
                  <TooltipButton onClick={() => setShowDeleteDeviceConfirmation(true)} tooltipText="Remove this device from the test setup" className="px-3 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-lg"><Trash2 className="h-4 w-4" /><span>Delete device</span></TooltipButton>
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
                  <button type="button" onClick={requestStandalone} className="rounded-lg border border-gray-300 bg-white p-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-50">
                    <span className="block font-semibold text-gray-900">Add standalone sensor</span>
                    <span className="mt-1 block text-sm text-gray-600">For one sensor, such as a single-axis accelerometer.</span>
                  </button>
                  <button type="button" onClick={requestDevice} className="rounded-lg border border-gray-300 bg-white p-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-50">
                    <span className="block font-semibold text-gray-900">Add device with outputs</span>
                    <span className="mt-1 block text-sm text-gray-600">For a device with multiple channels, such as an enDAQ.</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                  <div>
                    <Heading3 className="text-xl">{selectedSensor.alias || 'Edit sensor'}</Heading3>
                    <Paragraph className="text-sm text-gray-500">{sensorDevice ? `Device: ${sensorDevice.name || sensorDevice.model || 'Unnamed device'}` : 'Standalone sensor'}</Paragraph>
                  </div>
                  <div className="flex items-center gap-2">
                  {linkedDeviceOutput ? <TooltipButton onClick={() => { setManageDeviceDefinitionId(linkedDeviceDefinition.id); setDeviceManager(true); }} tooltipText="Edit this output in its device definition" className="rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-800 hover:bg-gray-300"><span>Edit device definition</span></TooltipButton> : !selectedSensorType ? <TooltipButton onClick={openSaveSensorDefinition} tooltipText="Save these sensor details as a reusable definition in this test setup" className="rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-800 hover:bg-gray-300"><span>Save as sensor definition</span></TooltipButton> : <TooltipButton onClick={() => { setManageSensorDefinitionId(selectedSensorType.id); setIsTypeManagerOpen(true); }} tooltipText="Edit the reusable definition linked to this sensor" className="rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-800 hover:bg-gray-300"><span>Edit sensor definition</span></TooltipButton>}
                  <TooltipButton
                    onClick={() => setShowDeleteConfirmation(true)}
                    tooltipText="Remove sensor"
                    aria-label="Remove sensor"
                    className="rounded-md bg-none bg-transparent p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </TooltipButton>
                  </div>
                </div>

                <div className="space-y-3">
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

                {(linkedDeviceOutput || selectedSensorType) && <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(selectedSensor.definitionOverride)} onChange={(event) => { if (event.target.checked) { const definition = linkedDeviceOutput || selectedSensorType; onSensorsChange(sensors.map((sensor, index) => index === selectedIndex ? normalizeSensor({ ...sensor, definitionOverride: true, technologyType: linkedDeviceOutput ? sensor.technologyType : definition.technologyType || sensor.technologyType, technologyPlatform: linkedDeviceOutput ? sensor.technologyPlatform : definition.technologyPlatform || sensor.technologyPlatform }) : sensor)); } else setShowResetOverride(true); }} /><span>Override definition for this sensor</span></label>}
                {(linkedDeviceOutput || (selectedSensorType && !selectedSensor.definitionOutputId)) && !selectedSensor.definitionOverride ? <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-md bg-gray-50 px-3 py-2 text-sm"><span className="block text-gray-500">Technology type <span className="text-red-500">*</span></span><span className="font-medium text-gray-800">{linkedDeviceOutput ? selectedSensor.technologyType || 'Not specified' : selectedSensorType?.technologyType || selectedSensor.technologyType || 'Not specified'}</span></div>
                  <div className="rounded-md bg-gray-50 px-3 py-2 text-sm"><span className="block text-gray-500">Sensor model <span className="text-red-500">*</span></span><span className="font-medium text-gray-800">{linkedDeviceOutput ? selectedSensor.technologyPlatform || 'Not specified' : selectedSensorType?.technologyPlatform || selectedSensor.technologyPlatform || 'Not specified'}</span></div>
                </div> : <div className="grid gap-4 md:grid-cols-2">
                  <FormField name={`sensor-${selectedIndex}-technologyType`} label="Technology type" value={selectedSensor.technologyType || ''} onChange={(event) => updateSensor('technologyType', event.target.value)} required placeholder="e.g. Accelerometer" />
                  <SensorModelField name={`sensor-${selectedIndex}-technologyPlatform`} value={selectedSensor.technologyPlatform || ''} onChange={(value) => updateSensor('technologyPlatform', value)} />
                </div>}

                {(linkedDeviceOutput || selectedSensorType) && !selectedSensor.definitionOverride ? <div className="rounded-md bg-gray-50 px-3 py-2 text-sm"><span className="block text-gray-500">Measured quantity <span className="text-red-500">*</span></span><span className="font-medium text-gray-800">{selectedSensor.measurementType || 'Not specified'}</span></div> : <QuantityKindField
                  required
                  value={selectedSensor.measurementType}
                  identifier={selectedSensor.quantityKindIdentifier}
                  onChange={({ name, identifier }) => onSensorsChange(sensors.map((sensor, index) => (
                    index === selectedIndex ? normalizeSensor({ ...sensor, measurementType: name, quantityKindIdentifier: identifier,
                      mappingReviewRequired: sensor.mappingReviewRequired || quantityNeedsMappingReview(sensor.measurementType, sensor.quantityKindIdentifier, name, identifier) }) : sensor
                  )))}
                />}
                {selectedSensor.mappingReviewRequired && <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <p>The measured quantity changed. If mappings already exist, review this sensor’s measurement, processing and file mappings in every project that uses this setup. Existing mappings were kept. If there are no mappings yet, you can confirm that below.</p>
                  <TooltipButton onClick={() => updateSensor('mappingReviewRequired', false)} tooltipText="Confirm that you reviewed the mappings or none exist" className="mt-2 rounded-md bg-amber-100 px-3 py-2 text-amber-900 hover:bg-amber-200"><span>I reviewed them or no mappings exist</span></TooltipButton>
                </div>}
                {!selectedSensor.quantityKindIdentifier && isAmbiguousQuantityName(selectedSensor.measurementType) && <Paragraph className="text-sm text-amber-800">This older quantity name matches multiple ontology options. Select the intended option to include its identifier in the export.</Paragraph>}

                {(linkedDeviceOutput?.description || selectedSensor.channelDescription) && <div className="rounded-md bg-gray-50 px-3 py-2 text-sm"><span className="block text-gray-500">Channel description</span><span className="text-gray-800">{linkedDeviceOutput?.description || selectedSensor.channelDescription}</span></div>}
                <FormField
                  name={`sensor-${selectedIndex}-description`}
                  value={selectedSensor.description || ''}
                  onChange={(event) => updateSensor('description', event.target.value)}
                  label={linkedDeviceOutput ? 'Installation notes' : 'Description'}
                  type="textarea"
                  placeholder={linkedDeviceOutput ? 'Describe where this sensor is installed' : 'Describe this sensor and where it is installed'}
                  rows={2}
                />
                </div>

                <section className="border-y border-gray-200 py-3">
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

                {isSavingType && createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Create sensor definition"><div className="max-h-[calc(100vh-4rem)] w-full max-w-xl space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
                  <Heading3 className="text-base">Create sensor definition</Heading3>
                  <Paragraph className="text-sm text-gray-600">Save these details for reuse in this test setup. Editing the definition later can update linked sensors.</Paragraph>
                  {typeError && <p role="alert" className="text-sm text-red-700">{typeError}</p>}
                  <FormField label="Definition name" name="new-reusable-type-name" value={newTypeName} onChange={(event) => setNewTypeName(event.target.value)} required placeholder="e.g. Industrial accelerometer" />
                  <SensorModelField name="new-type-model" value={typeDraft.technologyPlatform || ''} onChange={(value) => setTypeDraft((current) => ({ ...current, technologyPlatform: value }))} />
                  <FormField label="Technology type" name="new-type-technology" value={typeDraft.technologyType || ''} onChange={(event) => setTypeDraft((current) => ({ ...current, technologyType: event.target.value }))} required placeholder="e.g. Accelerometer" />
                  <QuantityKindField label="Default measured quantity" required value={typeDraft.measurementType} identifier={typeDraft.quantityKindIdentifier} onChange={({ name, identifier }) => setTypeDraft((current) => ({ ...current, measurementType: name, quantityKindIdentifier: identifier }))} />
                  <div className="flex gap-2"><TooltipButton onClick={saveAsType} tooltipText="Save these sensor details as a definition" className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"><span>Save definition</span></TooltipButton>
                  <TooltipButton onClick={() => setIsSavingType(false)} tooltipText="Cancel" className="px-3 py-2 bg-gray-500 text-white hover:bg-gray-600 rounded-lg"><span>Cancel</span></TooltipButton></div>
                </div></div>, document.body)}

                {!sensorDevice ? <div className="border-t border-gray-200 pt-4">
                  <DatasheetField label="Sensor datasheet" required unavailableLabel="Unavailable" value={selectedSensor.datasheet?.attachmentId || selectedSensor.datasheet?.notAvailable ? selectedSensor.datasheet : selectedSensorType?.datasheet} onChange={(datasheet) => updateSensor('datasheet', datasheet)} explanation="Attach the standalone sensor's datasheet or explicitly mark it unavailable. A datasheet from its definition is shown until you change it here." />
                </div> : <details className="rounded-lg border border-gray-200 p-4">
                  <summary className="cursor-pointer font-semibold text-gray-800">Sensor datasheet (optional){selectedSensor.datasheet?.fileName ? `: ${selectedSensor.datasheet.fileName}` : selectedSensor.datasheet?.notAvailable ? ': N.A.' : ''}</summary>
                  <div className="mt-4"><DatasheetField label="Sensor datasheet" value={selectedSensor.datasheet} onChange={(datasheet) => updateSensor('datasheet', datasheet)} explanation="For a datasheet specific to this sensor. A device datasheet can be attached to the device instead; a reusable type may also have its own datasheet." /></div>
                </details>}
              </div>
            )}
          </main>
        </div>
      </div>
      </div>
      {savingDeviceDefinition && createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Save device definition">
        <div className="w-full max-w-lg space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
          <Heading3 className="text-lg">Save device definition</Heading3>
          <Paragraph className="text-sm text-gray-600">Reuse this device and its outputs in this test setup. Editing the definition later can update linked devices and outputs.</Paragraph>
          <Paragraph className="text-sm text-gray-600">Save this device model and its current outputs for reuse within this test setup.</Paragraph>
          <FormField label="Definition name" aria-label="Device definition name" name="save-device-definition-name" value={saveDeviceName} onChange={(event) => setSaveDeviceName(event.target.value)} required />
          {deviceError && <p role="alert" className="text-sm text-red-700">{deviceError}</p>}
          <div className="flex justify-end gap-2"><TooltipButton onClick={() => { setSavingDeviceDefinition(false); setDeviceError(''); }} tooltipText="Cancel" className="rounded-md bg-gray-500 px-3 py-2 text-white"><span>Cancel</span></TooltipButton><TooltipButton onClick={commitDeviceDefinition} tooltipText="Save this device definition" className="rounded-md bg-blue-600 px-3 py-2 text-white"><span>Save definition</span></TooltipButton></div>
        </div>
      </div>, document.body)}
      {addChoice && createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Add equipment">
        <div className="max-h-[calc(100vh-4rem)] w-full max-w-xl space-y-4 overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
          <Heading3 className="text-lg">{addChoice === 'device' ? 'Add device' : addChoice === 'output' ? 'Add output' : 'Add standalone sensor'}</Heading3>
            <Paragraph className="text-sm text-gray-600">Choose a reusable definition. Definitions describe the equipment; the item you add represents the equipment used in this test setup.</Paragraph>
            {!addMethod && <div className="space-y-3">
              <Paragraph className="text-sm text-gray-700">{addChoice === 'device' ? 'Create a device definition first.' : 'Create a sensor definition first.'}</Paragraph>
              <TooltipButton onClick={() => { const device = addChoice === 'device'; setAddChoice(''); if (device) { setManageDeviceDefinitionId(''); setDeviceManager(true); } else { setManageSensorDefinitionId(''); setIsTypeManagerOpen(true); } }} tooltipText="Create a reusable definition" className="rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"><span>{addChoice === 'device' ? 'Manage device definitions' : 'Manage sensor definitions'}</span></TooltipButton>
            </div>}
            {addChoice === 'output' && selectedDefinitionId && sensorTypes.length > 0 && <div className="flex flex-wrap gap-2"><TooltipButton onClick={() => setAddMethod('device-outputs')} tooltipText="Select outputs from the device definition" className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700"><span>Device outputs</span></TooltipButton><TooltipButton onClick={() => setAddMethod('saved')} tooltipText="Select a saved sensor definition" className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700"><span>Sensor definition</span></TooltipButton></div>}
            {addMethod === 'saved' && <FormField label="Saved definition" aria-label="Saved definition" name="add-equipment-definition" type="select" placeholder="Select a definition" value={addChoice === 'output' ? outputSensorTypeId : selectedDefinitionId} onChange={(event) => { if (addChoice === 'output') setOutputSensorTypeId(event.target.value); else setSelectedDefinitionId(event.target.value); setSelectedOutputs([]); }} tags={(addChoice === 'device' ? deviceDefinitions : sensorTypes).map((item) => ({ value: item.id, label: item.name }))} />}
            {((addChoice === 'device' && addMethod === 'saved') || (addChoice === 'output' && addMethod === 'device-outputs')) && selectedDefinitionId && <>
              {addChoice === 'device' && <FormField label="Device name" aria-label="Device name" name="new-device-name" value={newDeviceName} onChange={(event) => setNewDeviceName(event.target.value)} required />}
              <fieldset className="space-y-2"><legend className="font-semibold">{addChoice === 'output' ? 'Outputs in the device definition' : 'Select outputs used in this test setup'}</legend>
                {(deviceDefinitions.find((item) => item.id === selectedDefinitionId)?.outputs || []).filter((output) => addChoice !== 'output' || !sensors.some((sensor) => sensor.physicalDeviceId === outputDeviceId && sensor.definitionOutputId === output.id)).map((output) => <label key={output.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedOutputs.includes(output.id)} onChange={(event) => setSelectedOutputs((current) => event.target.checked ? [...current, output.id] : current.filter((id) => id !== output.id))} />{output.name}</label>)}
              </fieldset>
              {addChoice === 'output' && !(deviceDefinitions.find((item) => item.id === selectedDefinitionId)?.outputs || []).some((output) => !sensors.some((sensor) => sensor.physicalDeviceId === outputDeviceId && sensor.definitionOutputId === output.id)) && <Paragraph className="text-sm text-gray-600">No unused outputs in this device definition. Edit the definition to add outputs or choose a sensor definition.</Paragraph>}
            </>}
            {deviceError && <p role="alert" className="text-sm text-red-700">{deviceError}</p>}
            {addMethod && <TooltipButton disabled={addChoice === 'output' && addMethod === 'saved' ? !outputSensorTypeId : !selectedDefinitionId} onClick={() => { if (addChoice === 'device') addFromDefinition(); else if (addChoice === 'output' && addMethod === 'device-outputs') addDefinedOutputs(); else { addSensor(addChoice === 'output' ? outputDeviceId : '', addChoice === 'output' ? outputSensorTypeId : selectedDefinitionId); setAddChoice(''); } }} tooltipText="Add equipment using the selected definition" className="rounded-md bg-blue-600 px-3 py-2 text-white disabled:opacity-50"><span>{addChoice === 'output' && addMethod === 'device-outputs' ? 'Add selected outputs' : 'Add'}</span></TooltipButton>}
          <div className="flex justify-end"><TooltipButton onClick={() => { setAddChoice(''); setDeviceError(''); }} tooltipText="Cancel" className="rounded-md bg-gray-500 px-3 py-2 text-white"><span>Cancel</span></TooltipButton></div>
        </div>
      </div>, document.body)}
      <DeviceDefinitionDialog open={deviceManager} initialDefinitionId={manageDeviceDefinitionId} definitions={deviceDefinitions} devices={physicalDevices} sensors={sensors} onClose={() => { setDeviceManager(false); setManageDeviceDefinitionId(''); }} onSave={(definitions, devices, nextSensors) => { onDeviceDefinitionsChange(definitions); onPhysicalDevicesChange(devices); onSensorsChange(nextSensors); }} />
      <SensorTypeDialog
        open={isTypeManagerOpen}
        initialTypeId={manageSensorDefinitionId}
        types={sensorTypes}
        devices={physicalDevices}
        sensors={sensors}
        onChange={onSensorTypesChange}
        onDevicesChange={onPhysicalDevicesChange}
        onSensorsChange={onSensorsChange}
        typesOnly
        onClose={() => { setIsTypeManagerOpen(false); setManageSensorDefinitionId(''); }}
      />
      <AlertDecisionDialog open={showResetOverride} tone="warning" title="Return to definition?" message="This replaces this sensor's overridden details with the current definition. Existing mappings are kept and may need review." confirmLabel="Use definition" cancelLabel="Keep override" onConfirm={resetSensorOverride} onCancel={() => setShowResetOverride(false)} />
      <AlertDecisionDialog
        open={showDeleteDeviceConfirmation}
        tone="danger"
        title={`Delete ${selectedDevice?.name || 'device'}?`}
        message="This removes the device, its sensor outputs, and their measurement and processing protocol mappings from this test setup. Its saved device definition remains available."
        confirmLabel="Delete device"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (selectedDevice) {
            onSensorsChange(sensors.filter((sensor) => sensor.physicalDeviceId !== selectedDevice.id));
            onPhysicalDevicesChange?.(physicalDevices.filter((device) => device.id !== selectedDevice.id));
            setSelectedDeviceId(null);
          }
          setShowDeleteDeviceConfirmation(false);
        }}
        onCancel={() => setShowDeleteDeviceConfirmation(false)}
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
