import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { v4 as uuid4 } from 'uuid';

import FormField from '../Form/FormField';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import TooltipButton from '../Widgets/TooltipButton';
import AlertDecisionDialog from '../Widgets/AlertDecisionDialog';

const createEmptyType = () => ({
    id: uuid4(),
    name: '',
    replaceableCharacteristicId: '',
    characteristics: []
});

const ConfigurationTypeDialog = ({
    open,
    types = [],
    configurations = [],
    replaceableComponents = [],
    onChange,
    onClose
}) => {
    const [selectedId, setSelectedId] = useState(null);
    const [draft, setDraft] = useState(createEmptyType);
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
        setDraft(firstType
            ? { ...firstType, characteristics: [...(firstType.characteristics || [])] }
            : createEmptyType());
        setError('');
    }, [open, types]);

    const selectedType = useMemo(
        () => types.find((type) => type.id === selectedId),
        [selectedId, types]
    );
    const isCreating = selectedId === null;

    if (!open || typeof document === 'undefined') return null;

    const selectType = (type) => {
        setSelectedId(type.id);
        setDraft({ ...type, characteristics: [...(type.characteristics || [])] });
        setError('');
    };

    const startNewType = () => {
        setSelectedId(null);
        setDraft(createEmptyType());
        setError('');
    };

    const updateCharacteristic = (index, field, value) => {
        setDraft((previous) => ({
            ...previous,
            characteristics: previous.characteristics.map((characteristic, characteristicIndex) => (
                characteristicIndex === index
                    ? { ...characteristic, [field]: value }
                    : characteristic
            ))
        }));
    };

    const addCharacteristic = () => {
        setDraft((previous) => ({
            ...previous,
            characteristics: [
                ...previous.characteristics,
                { id: uuid4(), name: '', value: '' }
            ]
        }));
    };

    const removeCharacteristic = (index) => {
        setDraft((previous) => ({
            ...previous,
            characteristics: previous.characteristics.filter((_, characteristicIndex) => (
                characteristicIndex !== index
            ))
        }));
    };

    const saveType = () => {
        const name = draft.name.trim();
        if (!name || !draft.replaceableCharacteristicId) {
            setError('Please enter a type name and select its replaceable component.');
            return;
        }

        const nextType = {
            ...draft,
            name,
            characteristics: draft.characteristics
                .map((characteristic) => ({
                    ...characteristic,
                    name: characteristic.name.trim(),
                    value: characteristic.value?.trim() || ''
                }))
                .filter((characteristic) => characteristic.name)
        };
        const exists = types.some((type) => type.id === nextType.id);

        onChange(exists
            ? types.map((type) => type.id === nextType.id ? nextType : type)
            : [...types, nextType]);
        setSelectedId(nextType.id);
        setDraft(nextType);
        setError('');
    };

    const referencedCount = pendingDelete
        ? configurations.filter((configuration) => configuration.typeAssignments?.some(
            (assignment) => assignment.typeId === pendingDelete.id
        )).length
        : 0;

    const confirmDelete = () => {
        if (!pendingDelete || referencedCount > 0) return;

        const remaining = types.filter((type) => type.id !== pendingDelete.id);
        const nextSelected = remaining[0];

        onChange(remaining);
        setSelectedId(nextSelected?.id || null);
        setDraft(nextSelected
            ? { ...nextSelected, characteristics: [...(nextSelected.characteristics || [])] }
            : createEmptyType());
        setPendingDelete(null);
    };

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Manage configuration types"
        >
            <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-4xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                <aside className="w-64 shrink-0 border-r border-gray-200 bg-gray-50 p-4">
                    <div className="mb-4 flex items-center justify-between">
                        <Heading3 className="text-base">Types</Heading3>
                        <TooltipButton
                            onClick={startNewType}
                            tooltipText="Create type"
                            className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
                        >
                            <Plus className="h-4 w-4" />
                        </TooltipButton>
                    </div>

                    <div className="space-y-1 overflow-y-auto">
                        {isCreating && (
                            <div className="w-full rounded-md bg-blue-100 px-3 py-2 text-left text-sm text-blue-800">
                                <span className="block truncate">{draft.name || 'New type'}</span>
                                <span className="block truncate text-xs text-blue-700">
                                    {replaceableComponents.find(
                                        (component) => component.id === draft.replaceableCharacteristicId
                                    )?.category || 'Choose component'}
                                </span>
                            </div>
                        )}

                        {types.map((type) => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => selectType(type)}
                                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                    selectedId === type.id
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <span className="block truncate">{type.name || 'Unnamed type'}</span>
                                <span className="block truncate text-xs text-gray-500">
                                    {replaceableComponents.find(
                                        (component) => component.id === type.replaceableCharacteristicId
                                    )?.category || 'No component'}
                                </span>
                            </button>
                        ))}

                        {types.length === 0 && !isCreating && (
                            <Paragraph className="px-2 py-4 text-sm text-gray-500">
                                No types yet.
                            </Paragraph>
                        )}
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
                    <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                        <Heading3 className="text-xl">
                            {selectedType ? 'Edit Configuration Type' : 'Create Configuration Type'}
                        </Heading3>
                        <TooltipButton
                            onClick={onClose}
                            tooltipText="Close"
                            className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                        >
                            <X className="h-5 w-5" />
                        </TooltipButton>
                    </div>

                    <div className="space-y-4 p-6">
                        {error && (
                            <Paragraph className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                                {error}
                            </Paragraph>
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                label="Type Name"
                                name="type-name"
                                value={draft.name}
                                onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))}
                                required
                                placeholder="e.g. SKF 6205 Bearing"
                            />
                            <FormField
                                label="Replaceable Component"
                                name="replaceable-component"
                                value={draft.replaceableCharacteristicId}
                                onChange={(event) => setDraft((previous) => ({
                                    ...previous,
                                    replaceableCharacteristicId: event.target.value
                                }))}
                                type="select"
                                required
                                placeholder="Select component"
                                tags={replaceableComponents.map((component) => ({
                                    value: component.id,
                                    label: component.category || component.description || 'Unnamed component'
                                }))}
                            />
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <Heading3 className="text-base">Characteristics</Heading3>
                                    <Paragraph className="text-sm text-gray-600">
                                        Define the characteristic names and values for this type.
                                    </Paragraph>
                                </div>
                                <TooltipButton onClick={addCharacteristic} tooltipText="Add characteristic" className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg">
                                    <Plus className="h-4 w-4" />
                                    <span>Add</span>
                                </TooltipButton>
                            </div>

                            <div className="space-y-2">
                                {draft.characteristics.map((characteristic, index) => (
                                    <div key={characteristic.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                        <input
                                            value={characteristic.name}
                                            onChange={(event) => updateCharacteristic(index, 'name', event.target.value)}
                                            placeholder="Characteristic name"
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                        <input
                                            value={characteristic.value || ''}
                                            onChange={(event) => updateCharacteristic(index, 'value', event.target.value)}
                                            placeholder="Value"
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                        <TooltipButton
                                            onClick={() => removeCharacteristic(index)}
                                            tooltipText="Remove characteristic"
                                            className="p-2 bg-rose-600 text-white hover:bg-rose-700 rounded-md"
                                        >
                                            <X className="h-4 w-4" />
                                        </TooltipButton>
                                    </div>
                                ))}

                                {draft.characteristics.length === 0 && (
                                    <Paragraph className="py-3 text-sm text-gray-500">
                                        No characteristics defined yet.
                                    </Paragraph>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                            {selectedType ? (
                                <TooltipButton
                                    onClick={() => setPendingDelete(selectedType)}
                                    tooltipText="Delete type"
                                    className="px-3 py-2 text-sm bg-rose-600 text-white hover:bg-rose-700 rounded-lg"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Delete</span>
                                </TooltipButton>
                            ) : <span />}
                            <TooltipButton
                                onClick={saveType}
                                tooltipText="Save type"
                                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                            >
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
                title={referencedCount > 0 ? 'Type is in use' : `Delete ${pendingDelete?.name || 'type'}?`}
                message={referencedCount > 0
                    ? `This type is used by ${referencedCount} configuration${referencedCount === 1 ? '' : 's'} and cannot be deleted.`
                    : 'This action cannot be undone.'}
                confirmLabel={referencedCount > 0 ? 'OK' : 'Delete'}
                cancelLabel="Cancel"
                showCancel={referencedCount === 0}
                onConfirm={() => referencedCount > 0 ? setPendingDelete(null) : confirmDelete()}
                onCancel={() => setPendingDelete(null)}
                confirmButtonProps={{
                    className: referencedCount > 0 ? '' : 'bg-rose-600 hover:bg-rose-700'
                }}
            />
        </div>,
        document.body
    );
};

export default ConfigurationTypeDialog;
