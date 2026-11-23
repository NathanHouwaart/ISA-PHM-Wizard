import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { v4 as uuid4 } from 'uuid';
import AlertDecisionDialog from '../Widgets/AlertDecisionDialog';
import FormField from '../Form/FormField';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import TooltipButton from '../Widgets/TooltipButton';
import DatasheetField from '../Form/fields/DatasheetField';
import QuantityKindField from '../Form/fields/QuantityKindField';
import SensorModelField from '../Form/fields/SensorModelField';
import { SENSOR_USAGE_DATASET_OUTPUT } from '../../utils/sensorUsage';
import { missingSensorTypeFields } from '../../utils/sensorTypeValidation';
import { quantityNeedsMappingReview } from '../../utils/deviceDefinitions';
import { useProjectData } from '../../contexts/GlobalDataContext';
import {
  cleanupUnreferencedAttachmentRefs,
  cloneAttachmentRefs,
  collectAttachmentRefs,
  mergeAttachmentRefs,
  subtractAttachmentRefs
} from '../../utils/attachmentLifecycle';

const createEmptySensorType = () => ({
  id: uuid4(),
  name: '',
  technologyPlatform: '',
  technologyType: '',
  measurementType: ''
});

const SensorTypeDialog = ({ open, types = [], devices = [], sensors = [], onChange, onDevicesChange, onSensorsChange, onClose, typesOnly = false, initialTypeId = '' }) => {
  const { testSetups = [], configurationTypes = [] } = useProjectData();
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(createEmptySensorType);
  const [workingTypes, setWorkingTypes] = useState([]);
  const [workingDevices, setWorkingDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [activeTab, setActiveTab] = useState('devices');
  const [newOutputs, setNewOutputs] = useState([]);
  const [channelTypeId, setChannelTypeId] = useState('');
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingTypeUpdate, setPendingTypeUpdate] = useState(null);
  const wasOpenRef = useRef(false);
  const seenDraftRefs = useRef(collectAttachmentRefs(types));

  useEffect(() => {
    if (open) mergeAttachmentRefs(seenDraftRefs.current, collectAttachmentRefs([draft, workingDevices]));
  }, [open, draft, workingDevices]);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    const firstType = types.find((type) => type.id === initialTypeId) || types[0];
    setWorkingTypes(types.map((type) => ({ ...type })));
    setWorkingDevices(devices.map((device) => ({ ...device })));
    setSelectedDeviceId(devices[0]?.id || null);
    setActiveTab(typesOnly ? 'types' : 'devices');
    setNewOutputs([]);
    setChannelTypeId('');
    setSelectedId(firstType?.id || null);
    setDraft(firstType ? { ...firstType } : createEmptySensorType());
    seenDraftRefs.current = cloneAttachmentRefs(collectAttachmentRefs([types, devices]));
    setError('');
  }, [open, types, devices, typesOnly, initialTypeId]);

  const cleanupUnsavedDrafts = async (nextTypes = types, nextDevices = devices) => {
    const stagedRefs = subtractAttachmentRefs(
      seenDraftRefs.current,
      collectAttachmentRefs([types, devices])
    );
    const orphanedRefs = subtractAttachmentRefs(stagedRefs, collectAttachmentRefs([nextTypes, nextDevices]));
    try {
      await cleanupUnreferencedAttachmentRefs(
        orphanedRefs,
        [nextTypes, nextDevices, testSetups, configurationTypes]
      );
    } catch (cleanupError) {
      console.warn('[SensorTypeDialog] unable to clean up discarded attachments', cleanupError);
    }
  };

  const selectedType = useMemo(
    () => workingTypes.find((type) => type.id === selectedId) || null,
    [workingTypes, selectedId]
  );
  const isCreating = selectedId === null;
  const selectedDevice = workingDevices.find((device) => device.id === selectedDeviceId);
  const referencedCount = pendingDelete
    ? [...sensors, ...newOutputs].filter((sensor) => sensor.sensorTypeId === pendingDelete.id).length
    : 0;

  if (!open || typeof document === 'undefined') return null;

  const stagedTypes = () => {
    const exists = workingTypes.some((type) => type.id === draft.id);
    const hasContent = draft.name?.trim() || draft.technologyPlatform?.trim() || draft.technologyType?.trim() || draft.measurementType?.trim() || draft.datasheet?.attachmentId;
    if (!exists && !hasContent) return workingTypes;
    return exists ? workingTypes.map((type) => type.id === draft.id ? draft : type) : [...workingTypes, draft];
  };

  const selectType = (type) => {
    if (type.id === draft.id) return;
    setWorkingTypes(stagedTypes());
    setSelectedId(type.id);
    setDraft({ ...type });
    setError('');
  };

  const startNewType = () => {
    setWorkingTypes(stagedTypes());
    setSelectedId(null);
    setDraft(createEmptySensorType());
    setError('');
  };

  const commitTypes = async (nextTypes) => {
    const retainedIds = new Set(nextTypes.map((type) => type.id));
    const nextSensors = [...sensors, ...newOutputs].map((sensor) => {
      if (!sensor.sensorTypeId) return sensor;
      const previous = types.find((type) => type.id === sensor.sensorTypeId);
      if (!previous) return sensor;
      if (retainedIds.has(sensor.sensorTypeId)) {
        if (sensor.definitionOutputId || sensor.definitionOverride) return sensor;
        const next = nextTypes.find((type) => type.id === sensor.sensorTypeId);
        const matchesOld = sensor.measurementType === previous.measurementType
          && (sensor.quantityKindIdentifier || '') === (previous.quantityKindIdentifier || '');
        const changed = next.measurementType !== previous.measurementType
          || (next.quantityKindIdentifier || '') !== (previous.quantityKindIdentifier || '');
        return matchesOld && changed ? { ...sensor, measurementType: next.measurementType, quantityKindIdentifier: next.quantityKindIdentifier || '', mappingReviewRequired: sensor.mappingReviewRequired || quantityNeedsMappingReview(previous.measurementType, previous.quantityKindIdentifier, next.measurementType, next.quantityKindIdentifier) } : sensor;
      }
      if (sensor.definitionOutputId) return { ...sensor, sensorTypeId: '', ...(!sensor.datasheet && previous.datasheet ? { datasheet: previous.datasheet } : {}) };
      return { ...sensor, sensorTypeId: '',
        technologyPlatform: previous.technologyPlatform || sensor.technologyPlatform || '',
        technologyType: previous.technologyType || sensor.technologyType || '',
        measurementType: sensor.measurementType || previous.measurementType || '',
        quantityKindIdentifier: sensor.quantityKindIdentifier || (!sensor.measurementType ? previous.quantityKindIdentifier : '') || '',
        ...(!sensor.datasheet && previous.datasheet ? { datasheet: previous.datasheet } : {}),
      };
    });
    onChange(nextTypes);
    onDevicesChange?.(workingDevices);
    if (newOutputs.length || nextSensors.some((sensor, index) => sensor !== sensors[index])) onSensorsChange?.(nextSensors);
    await cleanupUnsavedDrafts(nextTypes, workingDevices);
    seenDraftRefs.current = cloneAttachmentRefs(collectAttachmentRefs([nextTypes, workingDevices]));
    setError('');
    onClose?.();
  };

  const saveTypes = async () => {
    const nextTypes = stagedTypes().map((type) => ({
      ...type,
      name: (type.name || '').trim(),
      technologyPlatform: (type.technologyPlatform || '').trim(),
      technologyType: (type.technologyType || '').trim(),
      measurementType: (type.measurementType || '').trim(),
    }));
    const invalidType = nextTypes.find((type) => missingSensorTypeFields(type).length);
    if (invalidType) {
      setError(`Sensor type ${invalidType.name || '(unnamed)'} needs: ${missingSensorTypeFields(invalidType).join(', ')}.`);
      setActiveTab('types');
      return;
    }
    const affected = sensors.filter((sensor) => {
      if (sensor.definitionOutputId || sensor.definitionOverride) return false;
      const old = types.find((type) => type.id === sensor.sensorTypeId);
      const next = nextTypes.find((type) => type.id === sensor.sensorTypeId);
      return old && next && sensor.measurementType === old.measurementType
        && (sensor.quantityKindIdentifier || '') === (old.quantityKindIdentifier || '')
        && (old.measurementType !== next.measurementType || (old.quantityKindIdentifier || '') !== (next.quantityKindIdentifier || ''));
    });
    if (affected.length) { setPendingTypeUpdate({ nextTypes, names: affected.map((sensor) => sensor.alias || sensor.id) }); return; }
    await commitTypes(nextTypes);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const remaining = stagedTypes().filter((type) => type.id !== pendingDelete.id);
    const nextSelected = remaining[0] || null;
    setWorkingTypes(remaining);
    setSelectedId(nextSelected?.id || null);
    setDraft(nextSelected ? { ...nextSelected } : createEmptySensorType());
    setPendingDelete(null);
  };

  const closeDialog = async () => {
    await cleanupUnsavedDrafts();
    seenDraftRefs.current = cloneAttachmentRefs(collectAttachmentRefs([types, devices]));
    onClose?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={typesOnly ? 'Manage sensor definitions' : 'Manage sensors'}>
      <div className="flex h-[min(80vh,48rem)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <Heading3 className="text-xl">{typesOnly ? 'Manage sensor definitions' : 'Manage sensors'}</Heading3>
          <TooltipButton onClick={closeDialog} tooltipText="Close" aria-label="Close" className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"><X className="h-5 w-5" /></TooltipButton>
        </div>
        {!typesOnly && <div className="flex gap-2 border-b border-gray-200 px-6" role="tablist" aria-label="Sensor management">
          {[['devices', 'Devices'], ['types', 'Sensor types']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`border-b-2 px-3 py-3 text-sm ${activeTab === id ? 'border-blue-600 font-semibold text-blue-700' : 'border-transparent text-gray-600'}`}>{label}</button>
          ))}
        </div>}
        {error && <Paragraph className="mx-6 mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</Paragraph>}
        {activeTab === 'devices' ? (
          <div className="flex min-h-80 overflow-hidden">
            <aside className="w-64 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <Heading3 className="text-base">Devices</Heading3>
                <TooltipButton onClick={() => { const device = { id: uuid4(), name: '', model: '', serialNumber: '' }; setWorkingDevices((current) => [...current, device]); setSelectedDeviceId(device.id); }} tooltipText="Add device" aria-label="Add device" className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"><Plus className="h-4 w-4" /></TooltipButton>
              </div>
              {workingDevices.map((device) => <button key={device.id} type="button" onClick={() => setSelectedDeviceId(device.id)} className={`w-full rounded-md px-3 py-2 text-left text-sm ${selectedDeviceId === device.id ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'}`}>{device.name || device.model || 'Unnamed device'}</button>)}
              {workingDevices.length === 0 && <Paragraph className="text-sm text-gray-500">No devices yet.</Paragraph>}
            </aside>
            <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-6">
              <Paragraph className="text-sm text-gray-600">Optionally group outputs from the same physical device, such as an enDAQ recorder.</Paragraph>
              {selectedDevice && <>
                <Heading3>Edit device</Heading3>
                {[["name", "Device name"], ["model", "Model"], ["serialNumber", "Serial number"]].map(([field, label]) => <FormField key={field} label={label} name={`device-${field}`} value={selectedDevice[field] || ''} onChange={(event) => { const value = event.target.value; setWorkingDevices((current) => current.map((device) => device.id === selectedDevice.id ? { ...device, [field]: value } : device)); }} />)}
                <DatasheetField value={selectedDevice.datasheet} onChange={(datasheet) => setWorkingDevices((current) => current.map((device) => device.id === selectedDevice.id ? { ...device, datasheet } : device))} explanation="Optional datasheet shared by this device's outputs." />
                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <Heading3 className="text-base">Outputs used from this device</Heading3>
                  <Paragraph className="text-sm text-gray-600">Add only channels used in this experiment. Configure their names, quantities and roles in the sensor editor after saving.</Paragraph>
                  {[...sensors, ...newOutputs].filter((sensor) => sensor.physicalDeviceId === selectedDevice.id).map((sensor) => <div key={sensor.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"><span>{sensor.alias || 'Unnamed output'} — {stagedTypes().find((type) => type.id === sensor.sensorTypeId)?.name || 'Sensor type'}</span>{newOutputs.some((output) => output.id === sensor.id) && <button type="button" className="text-rose-700" onClick={() => setNewOutputs((current) => current.filter((output) => output.id !== sensor.id))}>Remove</button>}</div>)}
                  <label className="block text-sm text-gray-700" htmlFor="device-output-type">Sensor type for new output</label>
                  <select id="device-output-type" value={channelTypeId} onChange={(event) => setChannelTypeId(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"><option value="">Select a sensor type</option>{stagedTypes().filter((type) => type.name?.trim()).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select>
                  <TooltipButton disabled={!channelTypeId || !stagedTypes().some((type) => type.id === channelTypeId) || !onSensorsChange} onClick={() => { const type = stagedTypes().find((item) => item.id === channelTypeId); if (!type) return; setNewOutputs((current) => [...current, { id: uuid4(), alias: `Sensor SE${String(sensors.length + current.length + 1).padStart(2, '0')}`, sensorTypeId: type.id, physicalDeviceId: selectedDevice.id, measurementType: type.measurementType || '', quantityKindIdentifier: type.quantityKindIdentifier || '', technologyType: type.technologyType || '', technologyPlatform: type.technologyPlatform || '', measurementUnit: '', samplingRate: '', description: '', additionalInfo: [], phase: '', usage: SENSOR_USAGE_DATASET_OUTPUT }]); }} tooltipText="Add a channel used in this experiment" className="px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-40"><Plus className="h-4 w-4" /><span>Add output</span></TooltipButton>
                </div>
                <TooltipButton onClick={() => { setWorkingDevices((current) => current.filter((device) => device.id !== selectedDevice.id)); setSelectedDeviceId(null); }} disabled={[...sensors, ...newOutputs].some((sensor) => sensor.physicalDeviceId === selectedDevice.id)} tooltipText="Devices assigned to outputs cannot be removed" className="px-3 py-2 text-sm bg-rose-600 text-white hover:bg-rose-700 rounded-lg disabled:opacity-40"><Trash2 className="h-4 w-4" /><span>Delete device</span></TooltipButton>
              </>}
            </div>
          </div>
        ) : <div className="flex min-h-80 overflow-hidden">
        <aside className="w-64 shrink-0 border-r border-gray-200 bg-gray-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <Heading3 className="text-base">{typesOnly ? 'Sensor definitions' : 'Sensor Types'}</Heading3>
            <TooltipButton onClick={startNewType} tooltipText={typesOnly ? 'Create sensor definition' : 'Create sensor type'} aria-label={typesOnly ? 'Add sensor definition' : 'Add sensor type'} className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md">
              <Plus className="h-4 w-4" />
            </TooltipButton>
          </div>
          <div className="space-y-1 overflow-y-auto">
            {isCreating && (
              <div className="rounded-md bg-blue-100 px-3 py-2 text-sm text-blue-800">
                {draft.name || (typesOnly ? 'New sensor definition' : 'New sensor type')}
              </div>
            )}
            {workingTypes.map((type) => (
              <button key={type.id} type="button" onClick={() => selectType(type)} className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${selectedId === type.id ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'}`}>
                <span className="block truncate font-medium">{type.name || 'Unnamed type'}</span>
                <span className="block truncate text-xs text-gray-500">{type.measurementType || type.technologyType || 'No specification'}</span>
              </button>
            ))}
            {workingTypes.length === 0 && !isCreating && <Paragraph className="px-2 py-4 text-sm text-gray-500">No sensor types yet.</Paragraph>}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
            <Heading3 className="text-xl">{typesOnly ? (selectedType ? 'Edit sensor definition' : 'Create sensor definition') : (selectedType ? 'Edit Sensor Type' : 'Create Sensor Type')}</Heading3>
            {typesOnly && selectedType && <Paragraph className="text-sm text-gray-600">Linked sensors in this test setup: {sensors.filter((sensor) => sensor.sensorTypeId === selectedType.id).map((sensor) => sensor.alias || 'Unnamed sensor').join(', ') || 'none'}. Changes to shared details can affect linked sensors.</Paragraph>}
          </div>
          <div className="space-y-4 p-6">
            <FormField label={typesOnly ? 'Definition name' : 'Sensor Type Name'} name="sensor-type-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} required placeholder="e.g. Wilcoxon 786B-10 vibration channel" />
            <div className="grid gap-4 md:grid-cols-2">
              <SensorModelField name="sensor-type-model" value={draft.technologyPlatform} onChange={(value) => setDraft((current) => ({ ...current, technologyPlatform: value }))} placeholder="e.g. Wilcoxon 786B-10" />
              <FormField label="Technology Type" name="sensor-type-technology" value={draft.technologyType} onChange={(event) => setDraft((current) => ({ ...current, technologyType: event.target.value }))} required placeholder="e.g. Accelerometer" />
              <QuantityKindField label="Default measured quantity" required value={draft.measurementType} identifier={draft.quantityKindIdentifier} onChange={({ name, identifier }) => setDraft((current) => ({ ...current, measurementType: name, quantityKindIdentifier: identifier }))} />
            </div>
            <DatasheetField
              value={draft.datasheet}
              onChange={(datasheet) => setDraft((current) => ({ ...current, datasheet }))}
              explanation="Attach the manufacturer PDF datasheet, or mark it as not available."
            />
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              {selectedType ? (
                <TooltipButton onClick={() => setPendingDelete(selectedType)} tooltipText="Delete sensor type" className="px-3 py-2 text-sm bg-rose-600 text-white hover:bg-rose-700 rounded-lg">
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </TooltipButton>
              ) : <span />}
            </div>
          </div>
        </div>
        </div>}
        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <TooltipButton onClick={closeDialog} tooltipText="Discard changes" className="px-4 py-2 bg-gray-500 text-white hover:bg-gray-600 rounded-lg"><span>Cancel</span></TooltipButton>
          <TooltipButton onClick={saveTypes} tooltipText="Save devices and sensor types" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"><Save className="h-4 w-4" /><span>Save all</span></TooltipButton>
        </div>
      </div>
      <AlertDecisionDialog
        open={Boolean(pendingDelete)}
        tone={referencedCount > 0 ? 'warning' : 'danger'}
        title={`Delete ${pendingDelete?.name || 'sensor definition'}?`}
        message={referencedCount > 0 ? `This definition is used by ${referencedCount} sensor${referencedCount === 1 ? '' : 's'}. They will keep their current details and mappings independently when you save.` : 'The deletion will be applied when you save all changes.'}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        showCancel
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        confirmButtonProps={{ className: 'bg-rose-600 hover:bg-rose-700' }}
      />
      <AlertDecisionDialog open={Boolean(pendingTypeUpdate)} tone="warning" title="Apply quantity changes?"
        message={`Affected sensors: ${(pendingTypeUpdate?.names || []).join(', ')}. Their existing file mappings will be kept for review.`}
        confirmLabel="Apply changes" cancelLabel="Cancel"
        onConfirm={() => { const next = pendingTypeUpdate?.nextTypes; setPendingTypeUpdate(null); if (next) commitTypes(next); }}
        onCancel={() => setPendingTypeUpdate(null)} />
    </div>,
    document.body
  );
};

export default SensorTypeDialog;
