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

const componentLabel = (component, index) => component?.category || component?.description || `Replaceable component ${index + 1}`;

export const ConfigurationSlide = forwardRef(({ onHeightChange }, ref) => {
    const resizeElementRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, resizeElementRef);
    const { configurations, configurationTypes, testSetups, selectedTestSetupId } = useProjectData();
    const { setConfigurations, setConfigurationTypes } = useProjectActions();
    const [selectedComponentId, setSelectedComponentId] = useState(null);
    const [typeDialogOpen, setTypeDialogOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);

    const selectedSetup = testSetups.find((setup) => setup.id === selectedTestSetupId);
    const replaceableComponents = useMemo(
        () => (selectedSetup?.characteristics || []).filter((characteristic) => isReplaceableCharacteristic(characteristic.isReplaceable)),
        [selectedSetup]
    );
    const selectedComponent = replaceableComponents.find((component) => component.id === selectedComponentId) || null;
    const selectedComponentIndex = replaceableComponents.findIndex((component) => component.id === selectedComponentId);
    const componentInstances = useMemo(
        () => configurations.filter((configuration) => (
            configuration.testSetupId === selectedTestSetupId
            && configuration.replaceableCharacteristicId === selectedComponentId
        )),
        [configurations, selectedTestSetupId, selectedComponentId]
    );
    const scopedTypes = useMemo(
        () => configurationTypes.filter((type) => replaceableComponents.some((component) => component.id === type.replaceableCharacteristicId)),
        [configurationTypes, replaceableComponents]
    );

    useEffect(() => {
        if (selectedComponentId && replaceableComponents.some((component) => component.id === selectedComponentId)) return;
        setSelectedComponentId(replaceableComponents[0]?.id || null);
    }, [replaceableComponents, selectedComponentId]);

    const addComponentInstance = () => {
        if (!selectedSetup || !selectedComponent || selectedComponentIndex < 0) return;
        const prefix = selectedComponentIndex + 1;
        const instanceNumbers = componentInstances
            .map((instance) => Number(String(instance.componentId || '').split('.')[1]))
            .filter(Number.isFinite);
        const nextNumber = Math.max(0, ...instanceNumbers) + 1;
        setConfigurations((previous) => [...previous, {
            id: uuid4(),
            testSetupId: selectedSetup.id,
            replaceableCharacteristicId: selectedComponent.id,
            componentId: `${prefix}.${nextNumber}`,
            typeId: ''
        }]);
    };

    const updateComponentInstance = (instanceId, updates) => {
        setConfigurations((previous) => previous.map((instance) => (
            instance.id === instanceId ? { ...instance, ...updates } : instance
        )));
    };

    const updateScopedTypes = (nextScopedTypes) => {
        setConfigurationTypes((previous) => [
            ...previous.filter((type) => !replaceableComponents.some((component) => component.id === type.replaceableCharacteristicId)),
            ...nextScopedTypes
        ]);
    };

    const typesForSelectedComponent = scopedTypes.filter(
        (type) => type.replaceableCharacteristicId === selectedComponentId
    );
    const untypedComponentInstances = componentInstances.filter((instance) => !instance.typeId);
    const noReplaceableComponents = !selectedSetup || replaceableComponents.length === 0;

    return (
        <div ref={combinedRef} className="mx-auto max-w-5xl">
            <SlidePageTitle>Replaceable Component Definition</SlidePageTitle>
            <SlidePageSubtitle>
                Define the physical replaceable units available in the active test setup and identify their type.
            </SlidePageSubtitle>

            <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 pb-2">
                <div className="overflow-hidden rounded-lg border border-gray-300 bg-gray-50">
                    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                        <Heading3 className="text-base">Replaceable Component Definition</Heading3>
                        <TooltipButton onClick={() => setTypeDialogOpen(true)} tooltipText="Manage component types" className="px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg">
                            <Settings2 className="h-4 w-4" />
                            <span>Component Types</span>
                        </TooltipButton>
                    </div>

                    <div className="flex min-h-[28rem] flex-col md:flex-row">
                        <aside className="w-full shrink-0 border-b border-gray-200 bg-white md:w-72 md:border-b-0 md:border-r">
                            <div className="border-b border-gray-200 px-4 py-3">
                                <Heading3 className="text-base">Replaceable Components ({replaceableComponents.length})</Heading3>
                            </div>
                            <div className="max-h-56 space-y-1 overflow-y-auto p-2 md:max-h-[32rem]">
                                {replaceableComponents.map((component, index) => {
                                    const count = configurations.filter((instance) => instance.testSetupId === selectedTestSetupId && instance.replaceableCharacteristicId === component.id).length;
                                    return <button key={component.id} type="button" onClick={() => setSelectedComponentId(component.id)} className={`w-full rounded-md px-3 py-2 text-left text-sm ${component.id === selectedComponentId ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'}`}>
                                        <span className="block truncate font-medium">{componentLabel(component, index)}</span>
                                        <span className="block truncate text-xs text-gray-500">{count} physical ID{count === 1 ? '' : 's'}</span>
                                    </button>;
                                })}
                                {replaceableComponents.length === 0 && <Paragraph className="px-2 py-5 text-sm text-gray-500">No replaceable components in this test setup.</Paragraph>}
                            </div>
                        </aside>

                        <main className="min-w-0 flex-1 p-5">
                            {noReplaceableComponents ? <div className="flex h-full min-h-64 flex-col items-center justify-center text-center"><Layers className="mb-4 h-14 w-14 text-gray-300" /><Heading3>No replaceable components</Heading3><Paragraph className="mt-1 text-sm text-gray-600">Mark one or more components as replaceable in the selected test setup.</Paragraph></div>
                                : !selectedComponent ? null
                                    : <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-gray-200 pb-3"><div><Heading3 className="text-xl">Component Specifications / IDs</Heading3><Paragraph className="mt-1 text-sm text-gray-600">{componentLabel(selectedComponent, selectedComponentIndex)} — add each physical unit that can be selected in an experiment.</Paragraph></div><TooltipButton onClick={addComponentInstance} tooltipText={typesForSelectedComponent.length ? 'Add physical component ID' : 'Create a managed type before adding an ID'} disabled={!typesForSelectedComponent.length} className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md disabled:bg-gray-300"><Plus className="h-4 w-4" /></TooltipButton></div>
                                        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                                            <table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="px-4 py-3 font-medium">ID</th><th className="px-4 py-3 font-medium">Type</th><th className="w-12 px-2 py-3" /></tr></thead><tbody>
                                                {componentInstances.map((instance) => <tr key={instance.id} className={`border-t border-gray-200 ${!instance.typeId ? 'bg-amber-50' : ''}`}><td className="px-4 py-2"><FormField name={`component-id-${instance.id}`} value={instance.componentId || ''} onChange={(event) => updateComponentInstance(instance.id, { componentId: event.target.value })} aria-label="Physical component ID" placeholder="Physical component ID" required /></td><td className="px-4 py-2"><FormField name={`component-type-${instance.id}`} value={instance.typeId || ''} onChange={(event) => updateComponentInstance(instance.id, { typeId: event.target.value })} type="select" required placeholder="Select type" tags={typesForSelectedComponent.map((type) => ({ value: type.id, label: type.name }))} /></td><td className="px-2 py-2"><TooltipButton onClick={() => setPendingDelete(instance)} tooltipText="Remove physical component ID" className="p-2 text-rose-600 hover:bg-rose-50 rounded-md"><Trash2 className="h-4 w-4" /></TooltipButton></td></tr>)}
                                                {componentInstances.length === 0 && <tr><td colSpan="3" className="px-4 py-8 text-center text-gray-500">No physical IDs defined yet. Add one to make it available in experiments.</td></tr>}
                                            </tbody></table>
                                        </div>
                                        {untypedComponentInstances.length > 0 && <Paragraph className="text-sm text-amber-700">Choose a type for every physical ID. Untyped IDs cannot be assigned to experiments or exported.</Paragraph>}
                                    </div>}
                        </main>
                    </div>
                </div>
            </div>
            <ConfigurationTypeDialog open={typeDialogOpen} types={scopedTypes} configurations={configurations.filter((instance) => instance.testSetupId === selectedTestSetupId)} replaceableComponents={replaceableComponents} onChange={updateScopedTypes} onClose={() => setTypeDialogOpen(false)} />
            <AlertDecisionDialog open={Boolean(pendingDelete)} tone="danger" title={`Remove physical ID ${pendingDelete?.componentId || ''}?`} message="Experiments using this ID will need another selection before they can be exported." confirmLabel="Remove" cancelLabel="Cancel" onConfirm={() => { setConfigurations((previous) => previous.filter((instance) => instance.id !== pendingDelete?.id)); setPendingDelete(null); }} onCancel={() => setPendingDelete(null)} confirmButtonProps={{ className: 'bg-rose-600 hover:bg-rose-700' }} />
        </div>
    );
});

ConfigurationSlide.displayName = 'ConfigurationSlide';
export default ConfigurationSlide;
