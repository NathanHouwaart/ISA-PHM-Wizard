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

const createEmptySensorType = () => ({
  id: uuid4(),
  name: '',
  technologyPlatform: '',
  technologyType: '',
  measurementType: ''
});

const SensorTypeDialog = ({ open, types = [], sensors = [], onChange, onClose }) => {
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(createEmptySensorType);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    const firstType = types[0];
    setSelectedId(firstType?.id || null);
    setDraft(firstType ? { ...firstType } : createEmptySensorType());
    setError('');
  }, [open, types]);

  const selectedType = useMemo(
    () => types.find((type) => type.id === selectedId) || null,
    [types, selectedId]
  );
  const isCreating = selectedId === null;
  const referencedCount = pendingDelete
    ? sensors.filter((sensor) => sensor.sensorTypeId === pendingDelete.id).length
    : 0;

  if (!open || typeof document === 'undefined') return null;

  const selectType = (type) => {
    setSelectedId(type.id);
    setDraft({ ...type });
    setError('');
  };

  const startNewType = () => {
    setSelectedId(null);
    setDraft(createEmptySensorType());
    setError('');
  };

  const saveType = () => {
    const name = draft.name.trim();
    if (!name) {
      setError('Please enter a sensor type name.');
      return;
    }

    const nextType = {
      ...draft,
      name,
      technologyPlatform: draft.technologyPlatform.trim(),
      technologyType: draft.technologyType.trim(),
      measurementType: draft.measurementType.trim()
    };
    const exists = types.some((type) => type.id === nextType.id);
    onChange(exists
      ? types.map((type) => type.id === nextType.id ? nextType : type)
      : [...types, nextType]);
    setSelectedId(nextType.id);
    setDraft(nextType);
    setError('');
  };

  const confirmDelete = () => {
    if (!pendingDelete || referencedCount > 0) return;
    const remaining = types.filter((type) => type.id !== pendingDelete.id);
    const nextSelected = remaining[0] || null;
    onChange(remaining);
    setSelectedId(nextSelected?.id || null);
    setDraft(nextSelected ? { ...nextSelected } : createEmptySensorType());
    setPendingDelete(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Manage sensor types">
      <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-4xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
        <aside className="w-64 shrink-0 border-r border-gray-200 bg-gray-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <Heading3 className="text-base">Sensor Types</Heading3>
            <TooltipButton onClick={startNewType} tooltipText="Create sensor type" className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md">
              <Plus className="h-4 w-4" />
            </TooltipButton>
          </div>
          <div className="space-y-1 overflow-y-auto">
            {isCreating && (
              <div className="rounded-md bg-blue-100 px-3 py-2 text-sm text-blue-800">
                {draft.name || 'New sensor type'}
              </div>
            )}
            {types.map((type) => (
              <button key={type.id} type="button" onClick={() => selectType(type)} className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${selectedId === type.id ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'}`}>
                <span className="block truncate font-medium">{type.name || 'Unnamed type'}</span>
                <span className="block truncate text-xs text-gray-500">{type.measurementType || type.technologyType || 'No specification'}</span>
              </button>
            ))}
            {types.length === 0 && !isCreating && <Paragraph className="px-2 py-4 text-sm text-gray-500">No sensor types yet.</Paragraph>}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
            <Heading3 className="text-xl">{selectedType ? 'Edit Sensor Type' : 'Create Sensor Type'}</Heading3>
            <TooltipButton onClick={onClose} tooltipText="Close" className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg">
              <X className="h-5 w-5" />
            </TooltipButton>
          </div>
          <div className="space-y-4 p-6">
            {error && <Paragraph className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</Paragraph>}
            <FormField label="Sensor Type Name" name="sensor-type-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} required placeholder="e.g. Wilcoxon 786B-10 vibration channel" />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Sensor Model" name="sensor-type-model" value={draft.technologyPlatform} onChange={(event) => setDraft((current) => ({ ...current, technologyPlatform: event.target.value }))} placeholder="e.g. Wilcoxon 786B-10" />
              <FormField label="Technology Type" name="sensor-type-technology" value={draft.technologyType} onChange={(event) => setDraft((current) => ({ ...current, technologyType: event.target.value }))} placeholder="e.g. Accelerometer" />
              <FormField label="Measurement Type" name="sensor-type-measurement" value={draft.measurementType} onChange={(event) => setDraft((current) => ({ ...current, measurementType: event.target.value }))} placeholder="e.g. Vibration" />
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
              <TooltipButton onClick={saveType} tooltipText="Save sensor type" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg">
                <Save className="h-4 w-4" />
                <span>Save Type</span>
              </TooltipButton>
            </div>
          </div>
        </div>
      </div>
      <AlertDecisionDialog
        open={Boolean(pendingDelete)}
        tone={referencedCount > 0 ? 'warning' : 'danger'}
        title={referencedCount > 0 ? 'Sensor type is in use' : `Delete ${pendingDelete?.name || 'sensor type'}?`}
        message={referencedCount > 0 ? `This sensor type is used by ${referencedCount} sensor${referencedCount === 1 ? '' : 's'} and cannot be deleted.` : 'This action cannot be undone.'}
        confirmLabel={referencedCount > 0 ? 'OK' : 'Delete'}
        cancelLabel="Cancel"
        showCancel={referencedCount === 0}
        onConfirm={() => referencedCount > 0 ? setPendingDelete(null) : confirmDelete()}
        onCancel={() => setPendingDelete(null)}
        confirmButtonProps={{ className: referencedCount > 0 ? '' : 'bg-rose-600 hover:bg-rose-700' }}
      />
    </div>,
    document.body
  );
};

export default SensorTypeDialog;
