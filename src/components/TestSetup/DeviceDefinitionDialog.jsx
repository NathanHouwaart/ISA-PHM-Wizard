import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { v4 as uuid4 } from 'uuid';
import FormField from '../Form/FormField';
import QuantityKindField from '../Form/fields/QuantityKindField';
import SensorModelField from '../Form/fields/SensorModelField';
import DatasheetField from '../Form/fields/DatasheetField';
import TooltipButton from '../Widgets/TooltipButton';
import AlertDecisionDialog from '../Widgets/AlertDecisionDialog';
import { updateLinkedDefinition } from '../../utils/deviceDefinitions';
import { DEVICE_CATALOGUE, createDefinitionFromCatalogue } from '../../utils/deviceCatalogue';
import { isKnownSensorQuantity } from '../../utils/quantityCatalogue';
import { useProjectData } from '../../contexts/GlobalDataContext';
import { cleanupUnreferencedAttachmentRefs, collectAttachmentRefs, mergeAttachmentRefs, subtractAttachmentRefs } from '../../utils/attachmentLifecycle';

export default function DeviceDefinitionDialog({ open, definitions, devices, sensors, onSave, onClose, initialDefinitionId = '' }) {
  const [selectedId, setSelectedId] = useState('');
  const [selectedOutputId, setSelectedOutputId] = useState('');
  const [draft, setDraft] = useState(null);
  const [pending, setPending] = useState('');
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [loadingCatalogue, setLoadingCatalogue] = useState(false);
  const [error, setError] = useState('');
  const { testSetups = [], configurationTypes = [] } = useProjectData();
  const seenRefs = useRef(collectAttachmentRefs([]));
  const [nextDefinitionId, setNextDefinitionId] = useState('');
  const [savedFingerprint, setSavedFingerprint] = useState('');
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (!open) { wasOpenRef.current = false; return; }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    const first = definitions.find((item) => item.id === initialDefinitionId) || definitions[0];
    setSelectedId(first?.id || '');
    setSelectedOutputId('');
    setDraft(first ? structuredClone(first) : { id: uuid4(), name: '', model: '', datasheet: null, outputs: [] });
    seenRefs.current = collectAttachmentRefs(definitions);
    setError('');
    setSavedFingerprint('');
    setShowCatalogue(!first);
    setLoadingCatalogue(false);
  }, [open, definitions, initialDefinitionId]);
  useEffect(() => { if (open && draft) mergeAttachmentRefs(seenRefs.current, collectAttachmentRefs(draft)); }, [open, draft]);
  if (!open) return null;
  const original = definitions.find((item) => item.id === selectedId);
  const isNew = Boolean(draft && !original);
  const hasUnsavedChanges = () => Boolean(draft && (isNew ? draft.name?.trim() || draft.model?.trim() || draft.datasheet || draft.outputs?.length : JSON.stringify(draft) !== JSON.stringify(original)));
  const switchDefinition = (id) => {
    const next = definitions.find((item) => item.id === id);
    if (!next || id === selectedId || loadingCatalogue) return;
    if (hasUnsavedChanges()) { setNextDefinitionId(id); setPending('switch'); return; }
    setSelectedId(id); setSelectedOutputId(''); setDraft(structuredClone(next)); setError('');
  };
  const affected = devices.filter((device) => device.definitionId === selectedId);
  const affectedNames = sensors.filter((sensor) => affected.some((device) => device.id === sensor.physicalDeviceId) && sensor.definitionOutputId).map((sensor) => sensor.alias || sensor.id);
  const updateOutput = (id, patch) => setDraft((item) => ({ ...item,
    outputs: item.outputs.map((output) => output.id === id ? { ...output, ...patch } : output) }));
  const cleanup = (nextDefinitions, nextDevices) => {
    const orphaned = subtractAttachmentRefs(seenRefs.current, collectAttachmentRefs([nextDefinitions, nextDevices]));
    cleanupUnreferencedAttachmentRefs(orphaned, [nextDefinitions, nextDevices, testSetups, configurationTypes])
      .catch((cleanupError) => console.warn('[DeviceDefinitionDialog] unable to clean discarded attachments', cleanupError));
  };
  const close = () => {
    if (loadingCatalogue) return;
    if (draft && hasUnsavedChanges()) { setPending('close'); return; }
    cleanup(definitions, devices); onClose();
  };
  const loadCatalogueEntry = async (id) => {
    const entry = DEVICE_CATALOGUE.find((item) => item.id === id);
    if (!entry || loadingCatalogue) return;
    setLoadingCatalogue(true);
    setError('');
    try {
      const next = await createDefinitionFromCatalogue(entry);
      mergeAttachmentRefs(seenRefs.current, collectAttachmentRefs(next));
      setSelectedId('');
      setSelectedOutputId('');
      setDraft(next);
      setSavedFingerprint('');
      setShowCatalogue(false);
    } catch {
      setError('Could not load this catalogue entry and its datasheet. Please try again.');
    } finally {
      setLoadingCatalogue(false);
    }
  };
  const requestCatalogueEntry = (id) => {
    if (loadingCatalogue) return;
    if (hasUnsavedChanges()) { setNextDefinitionId(`catalogue:${id}`); setPending('switch'); return; }
    loadCatalogueEntry(id);
  };
  const commit = () => {
    const linked = original ? updateLinkedDefinition(draft, original, devices, sensors) : { devices, sensors };
    const nextDefinitions = original ? definitions.map((item) => item.id === draft.id ? draft : item) : [...definitions, draft];
    onSave(nextDefinitions, linked.devices, linked.sensors);
    cleanup(nextDefinitions, linked.devices);
    seenRefs.current = collectAttachmentRefs(nextDefinitions);
    setSelectedId(draft.id);
    setError('');
    setSavedFingerprint(JSON.stringify(draft));
  };
  const save = () => {
    if (!draft.name?.trim()) { setSelectedOutputId(''); setError('Enter a definition name in Device details.'); return; }
    const incomplete = (draft.outputs || []).find((output) => !output.name?.trim() || !output.technologyType?.trim() || !output.measurementType?.trim() || !output.technologyPlatform?.trim());
    if (incomplete) {
      setSelectedOutputId(incomplete.id); setError(`Complete the name, technology type, measured quantity and sensor model for ${incomplete.name || 'this output'}.`); return;
    }
    const unknownQuantity = (draft.outputs || []).find((output) => !isKnownSensorQuantity(output.measurementType, output.quantityKindIdentifier));
    if (unknownQuantity) {
      setSelectedOutputId(unknownQuantity.id); setError(`Select a recognized measured quantity for ${unknownQuantity.name}.`); return;
    }
    const previousOutputs = new Map((original?.outputs || []).map((output) => [output.id, output]));
    const changed = (draft.outputs || []).some((output) => {
      const old = previousOutputs.get(output.id);
      return old && (old.measurementType !== output.measurementType || old.quantityKindIdentifier !== output.quantityKindIdentifier);
    });
    const removed = (original?.outputs || []).some((output) => !draft.outputs.some((item) => item.id === output.id));
    if (affected.length && (changed || removed)) { setPending('save'); return; }
    commit();
  };
  const remove = () => {
    const ids = new Set(affected.map((device) => device.id));
    const nextDefinitions = definitions.filter((item) => item.id !== selectedId);
    const nextDevices = devices.map((device) => ids.has(device.id) ? { ...device, definitionId: '' } : device);
    onSave(nextDefinitions, nextDevices,
      sensors.map((sensor) => ids.has(sensor.physicalDeviceId) && sensor.definitionOutputId
        ? { ...sensor, channelDescription: sensor.channelDescription || original?.outputs?.find((output) => output.id === sensor.definitionOutputId)?.description || '', definitionOutputId: '', sensorTypeId: '' } : sensor));
    cleanup(nextDefinitions, nextDevices);
    onClose();
  };
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Manage device definitions">
    <div className="flex h-[min(80vh,48rem)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
      <h2 className="text-xl font-semibold">Manage device definitions</h2>
      <p className="mt-1 text-sm text-gray-600">Definitions belong to this test setup. Changes affect linked devices unless overridden.</p>
      {error && <p role="alert" className="mt-3 shrink-0 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p>}
      <div className="mt-4 grid min-h-0 flex-1 grid-rows-[minmax(0,auto)_minmax(0,1fr)] gap-5 md:grid-cols-[13rem_minmax(0,1fr)] md:grid-rows-1">
        <div className="min-h-0 min-w-0 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3"><TooltipButton onClick={() => {
          if (loadingCatalogue) return;
          if (draft && hasUnsavedChanges()) { setNextDefinitionId('__new__'); setPending('switch'); return; }
          setSelectedId(''); setSelectedOutputId(''); setDraft({ id: uuid4(), name: '', model: '', datasheet: null, outputs: [] }); setError('');
        }} tooltipText="Create a reusable device definition" className="mb-3 w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"><span>Add device definition</span></TooltipButton>
          <TooltipButton onClick={() => setShowCatalogue((shown) => !shown)} disabled={loadingCatalogue} tooltipText="Choose a built-in device starting point" className="mb-2 w-full justify-center rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-800 hover:bg-gray-300"><span>Use catalogue</span></TooltipButton>
          {showCatalogue && <div className="mb-3 space-y-1 rounded-md border border-gray-200 bg-white p-2"><p className="px-2 pb-1 text-xs text-gray-600">Add an editable copy to this test setup.</p>{DEVICE_CATALOGUE.map((entry) => <button key={entry.id} type="button" disabled={loadingCatalogue} onClick={() => requestCatalogueEntry(entry.id)} className="w-full rounded-md bg-white px-2 py-2 text-left text-sm text-gray-800 hover:bg-blue-50 disabled:opacity-50"><span className="block font-medium">{entry.name}</span><span className="block text-xs text-gray-500">{entry.outputs.length} outputs ? {entry.catalogueDescription}</span></button>)}{loadingCatalogue && <p role="status" className="px-2 text-xs text-gray-600">Loading datasheet?</p>}</div>}
          <p className="px-2 pb-1 text-xs font-semibold uppercase text-gray-500">Device definitions</p>{isNew && <div className="truncate rounded-md bg-blue-100 px-3 py-2 text-sm font-medium text-blue-800">{draft?.name || 'New device definition'}</div>}{definitions.map((item) => <button key={item.id} type="button" onClick={() => switchDefinition(item.id)} className={`w-full rounded-md px-3 py-2 text-left text-sm ${item.id === selectedId ? 'bg-blue-100 text-blue-800' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>{item.name}</button>)}{!definitions.length && !draft && <p className="text-sm text-gray-500">No device definitions yet.</p>}
          {draft && <div role="navigation" aria-label="Device definition sections" className="mt-4 space-y-1 border-t border-gray-200 pt-3">
                <button type="button" onClick={() => setSelectedOutputId('')} aria-current={!selectedOutputId ? 'page' : undefined} className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium ${!selectedOutputId ? 'bg-blue-100 text-blue-800' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>Device details</button>
                <div className="flex items-center justify-between px-3 pt-3"><span className="text-xs font-semibold uppercase text-gray-500">Outputs ({(draft.outputs || []).length})</span></div>
                {(draft.outputs || []).map((output, index) => <button key={output.id} type="button" onClick={() => setSelectedOutputId(output.id)} aria-current={selectedOutputId === output.id ? 'page' : undefined} className={`w-full truncate rounded-md px-3 py-2 text-left text-sm ${selectedOutputId === output.id ? 'bg-blue-100 font-medium text-blue-800' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>{output.name || `Output ${index + 1}`}</button>)}
                <button type="button" onClick={() => { const output = { id: uuid4(), name: '', technologyType: '', measurementType: '', quantityKindIdentifier: '' }; setDraft({ ...draft, outputs: [...(draft.outputs || []), output] }); setSelectedOutputId(output.id); }} className="w-full rounded-md bg-white px-3 py-2 text-left text-sm font-medium text-blue-700 hover:bg-blue-50">+ Add output</button>
              </div>}
        </div>
        {draft && <div aria-busy={loadingCatalogue} className={`min-h-0 min-w-0 space-y-4 overflow-y-auto pr-1 ${loadingCatalogue ? 'pointer-events-none opacity-60' : ''}`}>
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="font-semibold text-gray-800">{draft.name || 'New device definition'}</h3>
              <p className="mt-1 text-sm text-gray-600">Define the device and the outputs it can provide. Select only the outputs you use when adding a device.</p>
            </div>

              <div className="min-w-0 space-y-4 p-4">
                {!selectedOutputId ? <>
                  <h3 className="font-semibold text-gray-800">Device details</h3>
                  <FormField label="Definition name" name="device-definition-name" value={draft.name || ''} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
                  <FormField label="Device model" name="device-definition-model" value={draft.model || ''} onChange={(event) => setDraft({ ...draft, model: event.target.value })} />
                  <DatasheetField label="Device datasheet" value={draft.datasheet} onChange={(datasheet) => setDraft({ ...draft, datasheet })} unavailableLabel="Datasheet unavailable" />
                </> : (() => {
                  const output = (draft.outputs || []).find((item) => item.id === selectedOutputId);
                  if (!output) return null;
                  return <>
                    <h3 className="font-semibold text-gray-800">{output.name || 'New output'}</h3>
                    <p className="text-sm text-gray-600">Describe this output. These details are shared by linked sensors.</p>
                    <FormField label="Output name" name={`definition-output-name-${output.id}`} value={output.name || ''} onChange={(event) => updateOutput(output.id, { name: event.target.value })} required />
                    <FormField label="Channel description" name={`definition-output-description-${output.id}`} type="textarea" rows={2} value={output.description || ''} onChange={(event) => updateOutput(output.id, { description: event.target.value })} placeholder="Describe what this channel measures" />
                    <FormField label="Technology type" name={`definition-output-technology-${output.id}`} value={output.technologyType || ''} onChange={(event) => updateOutput(output.id, { technologyType: event.target.value })} required />
                    <QuantityKindField label="Measured quantity" required value={output.measurementType || ''} identifier={output.quantityKindIdentifier || ''} onChange={({ name, identifier }) => updateOutput(output.id, { measurementType: name, quantityKindIdentifier: identifier })} />
                    <SensorModelField name={`definition-output-model-${output.id}`} value={output.technologyPlatform || ''} onChange={(value) => updateOutput(output.id, { technologyPlatform: value })} />
                    <DatasheetField label="Output datasheet (optional)" value={output.datasheet} onChange={(datasheet) => updateOutput(output.id, { datasheet })} unavailableLabel="Datasheet unavailable" />
                    <TooltipButton onClick={() => { setDraft({ ...draft, outputs: draft.outputs.filter((item) => item.id !== output.id) }); setSelectedOutputId(''); }} tooltipText="Remove this output from the definition" className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"><span>Remove output</span></TooltipButton>
                  </>;
                })()}
              </div>
          </div>
        </div>}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {draft && <TooltipButton onClick={save} disabled={loadingCatalogue} tooltipText="Save definition changes" className="rounded-md bg-blue-600 px-3 py-2 text-white"><span>Save changes</span></TooltipButton>}
          {draft && !isNew && <TooltipButton disabled={loadingCatalogue} onClick={() => setPending('delete')} tooltipText="Delete definition" className="rounded-md bg-rose-600 px-3 py-2 text-white"><span>Delete definition</span></TooltipButton>}
          {draft && savedFingerprint === JSON.stringify(draft) && <span role="status" className="text-sm text-green-700">Saved</span>}
        </div>
        <TooltipButton onClick={close} disabled={loadingCatalogue} tooltipText="Close" className="rounded-md bg-gray-500 px-4 py-2 text-white"><span>Close</span></TooltipButton>
      </div>
    </div>
    <AlertDecisionDialog open={Boolean(pending)} tone="warning" title={pending === 'delete' ? 'Delete device definition?' : ['switch', 'close'].includes(pending) ? 'Discard unsaved changes?' : 'Apply changes to linked outputs?'}
      message={pending === 'delete' ? `The ${affected.length} linked device(s) and their outputs will keep their current details and mappings independently.` : ['switch', 'close'].includes(pending) ? 'Save the current definition first, or discard its unsaved changes.' : `Affected sensors: ${affectedNames.join(', ') || 'none'}. Changed quantities will update linked outputs; removed outputs and existing file mappings will be preserved for review.`}
      confirmLabel={pending === 'delete' ? 'Delete definition' : ['switch', 'close'].includes(pending) ? 'Discard changes' : 'Apply changes'} cancelLabel="Cancel"
      onConfirm={() => { const action = pending; setPending(''); if (action === 'delete') remove(); else if (action === 'close') { cleanup(definitions, devices); onClose(); } else if (action === 'switch') { if (nextDefinitionId.startsWith('catalogue:')) loadCatalogueEntry(nextDefinitionId.slice('catalogue:'.length)); else { const next = nextDefinitionId === '__new__' ? { id: uuid4(), name: '', model: '', datasheet: null, outputs: [] } : definitions.find((item) => item.id === nextDefinitionId); if (next) { setSelectedId(nextDefinitionId === '__new__' ? '' : next.id); setSelectedOutputId(''); setDraft(structuredClone(next)); setError(''); } } } else commit(); }} onCancel={() => setPending('')} />
  </div>, document.body);
}
