import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import { Layers, Plus, Settings2, Trash2 } from 'lucide-react';
import { v4 as uuid4 } from 'uuid';

import { useProjectActions, useProjectData } from '../../contexts/GlobalDataContext';
import { isReplaceableCharacteristic } from '../../utils/testSetupCharacteristics';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import useResizeObserver from '../../hooks/useResizeObserver';
import FormField from '../Form/FormField';
import Heading3 from '../Typography/Heading3';
import { SlidePageTitle } from '../Typography/Heading2';
import { SlidePageSubtitle, default as Paragraph } from '../Typography/Paragraph';
import AlertDecisionDialog from '../Widgets/AlertDecisionDialog';
import TooltipButton from '../Widgets/TooltipButton';
import ConfigurationTypeDialog from '../Configuration/ConfigurationTypeDialog';

export const ConfigurationSlide = forwardRef(({ onHeightChange }, ref) => {
    const resizeElementRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeElementRef);
    const {
        configurations,
        configurationTypes,
        testSetups,
        selectedTestSetupId
    } = useProjectData();
    const { setConfigurations, setConfigurationTypes } = useProjectActions();
    const [selectedId, setSelectedId] = useState(null);
    const [typeDialogOpen, setTypeDialogOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);

    const selectedSetup = testSetups.find((setup) => setup.id === selectedTestSetupId);
    const replaceableComponents = useMemo(
        () => (selectedSetup?.characteristics || []).filter((characteristic) => (
            isReplaceableCharacteristic(characteristic.isReplaceable)
        )),
        [selectedSetup]
    );
    const scopedConfigurations = useMemo(
        () => configurations.filter((configuration) => configuration.testSetupId === selectedTestSetupId),
        [configurations, selectedTestSetupId]
    );
    const scopedTypes = useMemo(
        () => configurationTypes.filter((type) => replaceableComponents.some(
            (component) => component.id === type.replaceableCharacteristicId
        )),
        [configurationTypes, replaceableComponents]
    );
    const selectedConfiguration = useMemo(
        () => scopedConfigurations.find((configuration) => configuration.id === selectedId) || null,
        [scopedConfigurations, selectedId]
    );

    useEffect(() => {
        if (selectedId && scopedConfigurations.some((configuration) => configuration.id === selectedId)) {
            return;
        }

        setSelectedId(scopedConfigurations[0]?.id || null);
    }, [scopedConfigurations, selectedId]);

    const updateConfiguration = (updates) => {
        if (!selectedConfiguration) return;

        setConfigurations((previous) => previous.map((configuration) => (
            configuration.id === selectedConfiguration.id
                ? { ...configuration, ...updates }
                : configuration
        )));
    };

    const addConfiguration = () => {
        if (!selectedSetup || replaceableComponents.length === 0) return;

        const configuration = {
            id: uuid4(),
            name: `New Configuration ${scopedConfigurations.length + 1}`,
            testSetupId: selectedSetup.id,
            comment: '',
            typeAssignments: replaceableComponents.map((component) => ({
                replaceableCharacteristicId: component.id,
                typeId: ''
            }))
        };

        setConfigurations((previous) => [...previous, configuration]);
        setSelectedId(configuration.id);
    };

    const updateAssignment = (componentId, typeId) => {
        updateConfiguration({
            typeAssignments: replaceableComponents.map((component) => {
                const assignment = selectedConfiguration?.typeAssignments?.find(
                    (entry) => entry.replaceableCharacteristicId === component.id
                );

                return {
                    replaceableCharacteristicId: component.id,
                    typeId: component.id === componentId ? typeId : assignment?.typeId || ''
                };
            })
        });
    };

    const removeConfiguration = () => {
        if (!pendingDelete) return;

        setConfigurations((previous) => previous.filter(
            (configuration) => configuration.id !== pendingDelete.id
        ));
        setPendingDelete(null);
    };

    const updateScopedTypes = (nextScopedTypes) => {
        setConfigurationTypes((previous) => [
            ...previous.filter((type) => !replaceableComponents.some(
                (component) => component.id === type.replaceableCharacteristicId
            )),
            ...nextScopedTypes
        ]);
    };

    const noReplaceableComponents = !selectedSetup || replaceableComponents.length === 0;

    return (
        <div ref={combinedRef} className="mx-auto max-w-5xl">
            <SlidePageTitle>Configurations</SlidePageTitle>
            <SlidePageSubtitle>
                For each configuration, select a type for every replaceable component in the active test setup.
            </SlidePageSubtitle>

            <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 pb-2">
                <div className="overflow-hidden rounded-lg border border-gray-300 bg-gray-50">
                    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                        <Heading3 className="text-base">Project Configurations</Heading3>
                        <TooltipButton
                            onClick={() => setTypeDialogOpen(true)}
                            tooltipText="Manage configuration types"
                            className="px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                        >
                            <Settings2 className="h-4 w-4" />
                            <span>Manage Types</span>
                        </TooltipButton>
                    </div>

                    <div className="flex min-h-[28rem] flex-col md:flex-row">
                        <aside className="w-full shrink-0 border-b border-gray-200 bg-white md:w-72 md:border-b-0 md:border-r">
                            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                                <Heading3 className="text-base">
                                    Configurations ({scopedConfigurations.length})
                                </Heading3>
                                <TooltipButton
                                    onClick={addConfiguration}
                                    tooltipText={noReplaceableComponents
                                        ? 'Add replaceable components first'
                                        : 'Create configuration'}
                                    disabled={noReplaceableComponents}
                                    className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md disabled:bg-gray-300"
                                >
                                    <Plus className="h-4 w-4" />
                                </TooltipButton>
                            </div>

                            <div className="max-h-56 space-y-1 overflow-y-auto p-2 md:max-h-[32rem]">
                                {scopedConfigurations.map((configuration) => (
                                    <button
                                        key={configuration.id}
                                        type="button"
                                        onClick={() => setSelectedId(configuration.id)}
                                        className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                                            configuration.id === selectedId
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span className="block truncate font-medium">
                                            {configuration.name || 'Unnamed configuration'}
                                        </span>
                                        <span className="block truncate text-xs text-gray-500">
                                            {configuration.typeAssignments?.filter((assignment) => assignment.typeId).length || 0}
                                            {' of '}
                                            {replaceableComponents.length} components selected
                                        </span>
                                    </button>
                                ))}

                                {scopedConfigurations.length === 0 && (
                                    <Paragraph className="px-2 py-5 text-sm text-gray-500">
                                        No configurations yet.
                                    </Paragraph>
                                )}
                            </div>
                        </aside>

                        <main className="min-w-0 flex-1 p-5">
                            {noReplaceableComponents ? (
                                <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
                                    <Layers className="mb-4 h-14 w-14 text-gray-300" />
                                    <Heading3>No replaceable components</Heading3>
                                    <Paragraph className="mt-1 text-sm text-gray-600">
                                        Select a test setup with replaceable characteristics before creating configurations.
                                    </Paragraph>
                                </div>
                            ) : !selectedConfiguration ? (
                                <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
                                    <Layers className="mb-4 h-14 w-14 text-gray-300" />
                                    <Heading3>No configuration selected</Heading3>
                                    <Paragraph className="mt-1 text-sm text-gray-600">
                                        Create a configuration to choose types for the replaceable components.
                                    </Paragraph>
                                    <TooltipButton
                                        onClick={addConfiguration}
                                        tooltipText="Create configuration"
                                        className="mt-4 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span>Create Configuration</span>
                                    </TooltipButton>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                                        <Heading3 className="text-xl">Edit Configuration</Heading3>
                                        <TooltipButton
                                            onClick={() => setPendingDelete(selectedConfiguration)}
                                            tooltipText="Delete configuration"
                                            className="p-2 bg-rose-600 text-white hover:bg-rose-700 rounded-md"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </TooltipButton>
                                    </div>

                                    <FormField
                                        label="Configuration Name"
                                        name="configuration-name"
                                        value={selectedConfiguration.name}
                                        onChange={(event) => updateConfiguration({ name: event.target.value })}
                                        required
                                        placeholder="Enter configuration name"
                                    />

                                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                                        <Heading3 className="text-base">Replaceable Components</Heading3>
                                        <Paragraph className="mb-4 text-sm text-gray-600">
                                            Select the matching type for each component.
                                        </Paragraph>

                                        <div className="space-y-4">
                                            {replaceableComponents.map((component) => {
                                                const assignment = selectedConfiguration.typeAssignments?.find(
                                                    (entry) => entry.replaceableCharacteristicId === component.id
                                                );
                                                const availableTypes = scopedTypes.filter(
                                                    (type) => type.replaceableCharacteristicId === component.id
                                                );

                                                return (
                                                    <div
                                                        key={component.id}
                                                        className="grid gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 md:grid-cols-[1fr_1fr]"
                                                    >
                                                        <div>
                                                            <Paragraph className="font-medium text-gray-900">
                                                                {component.category || 'Unnamed component'}
                                                            </Paragraph>
                                                            {component.description && (
                                                                <Paragraph className="text-sm text-gray-600">
                                                                    {component.description}
                                                                </Paragraph>
                                                            )}
                                                        </div>
                                                        <FormField
                                                            label="Type"
                                                            name={`component-type-${component.id}`}
                                                            value={assignment?.typeId || ''}
                                                            onChange={(event) => updateAssignment(component.id, event.target.value)}
                                                            type="select"
                                                            placeholder={availableTypes.length ? 'Select type' : 'No types available'}
                                                            tags={availableTypes.map((type) => ({
                                                                value: type.id,
                                                                label: type.name
                                                            }))}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <FormField
                                        label="Comment"
                                        name="configuration-comment"
                                        value={selectedConfiguration.comment || ''}
                                        onChange={(event) => updateConfiguration({ comment: event.target.value })}
                                        type="textarea"
                                        placeholder="Add an optional comment"
                                    />
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </div>

            <ConfigurationTypeDialog
                open={typeDialogOpen}
                types={scopedTypes}
                configurations={scopedConfigurations}
                replaceableComponents={replaceableComponents}
                onChange={updateScopedTypes}
                onClose={() => setTypeDialogOpen(false)}
            />
            <AlertDecisionDialog
                open={Boolean(pendingDelete)}
                tone="danger"
                title={`Delete ${pendingDelete?.name || 'configuration'}?`}
                message="Experiments using this configuration will keep their current reference, but it will no longer resolve to a configuration."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={removeConfiguration}
                onCancel={() => setPendingDelete(null)}
                confirmButtonProps={{ className: 'bg-rose-600 hover:bg-rose-700' }}
            />
        </div>
    );
});

ConfigurationSlide.displayName = 'Configurations';

export default ConfigurationSlide;
