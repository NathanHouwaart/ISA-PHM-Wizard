

import { Edit2, PlusCircleIcon, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import FormField from './Form/FormField';
import EditEntityModal from './EditEntityModal';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';


export function ProcessingProtocolsMappingCard({ item, itemIndex, mappings, onSave, handleInputChange, removeParameter, openEdit, onOpenHandled }) {

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // If parent requests opening edit modal for newly added item, open and notify parent
    if (openEdit && !isEditModalOpen) {
        setIsEditModalOpen(true);
        onOpenHandled && onOpenHandled();
    }

    const { selectedTestSetupId, testSetups } = useGlobalDataContext();

    const selectedTestSetup = testSetups.find(s => s.id === selectedTestSetupId);
    // Normalize sensors to array form
    const sensors = Array.isArray(selectedTestSetup?.sensors)
        ? selectedTestSetup.sensors
        : (selectedTestSetup?.sensors ? Object.entries(selectedTestSetup.sensors).map(([id, s]) => ({ id, ...s })) : []);

    // For each sensor, find mapping for this protocol and normalize to a consistent shape
    const filteredMappings = sensors.map(sensor => {
        const raw = mappings || [];

        const findMatch = mm => {
            const src = mm?.sourceId ?? mm?.sensorId ?? mm?.source ?? null;
            const tgt = mm?.targetId ?? mm?.target ?? mm?.mappingTargetId ?? mm?.protocolId ?? null;
            return String(src) === String(sensor.id) && String(tgt) === String(item?.id);
        };

        const m = raw.find(findMatch) || null;

        const rawValue = m ? (m.value ?? m.values ?? m.mappingValue ?? null) : null;

        // Normalize rawValue into { specification, unit }
        let specification = '';
        let unit = '';

        if (Array.isArray(rawValue)) {
            const first = rawValue[0];
            if (first && typeof first === 'object') {
                specification = first.specification ?? first.spec ?? '';
                unit = first.unit ?? first.u ?? '';
            } else {
                specification = String(rawValue[0] ?? '');
                unit = String(rawValue[1] ?? '');
            }
        } else if (rawValue && typeof rawValue === 'object') {
            specification = rawValue.specification ?? rawValue.spec ?? '';
            unit = rawValue.unit ?? rawValue.u ?? '';
        } else if (rawValue != null) {
            specification = String(rawValue);
        }

        const value = { specification, unit };
        const mappingObj = m ? ({ sourceId: m.sourceId ?? m.sensorId ?? m.source, targetId: m.targetId ?? m.target ?? m.mappingTargetId ?? m.protocolId, ...m, value }) : { sourceId: sensor.id, targetId: item?.id, value };
        return { sensor, mapping: mappingObj };
    });

    return (
        <div className='h-full'>
            {/* Conditional rendering of tab content */}
            {item && selectedTestSetupId ? (
                <div className="w-full bg-white border border-gray-200 rounded-xl p-6 flex flex-col min-h-full">
                    {/* Protocol Header, Edit/Remove Buttons */}
                    <div className='mb-4 border-b pb-4'>
                        <div className="flex justify-between items-start ">
                            <h2 className="text-3xl font-bold text-gray-800 flex-grow pr-4">
                                {item.name}
                            </h2>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out flex items-center justify-center text-sm"
                                    title="Edit Protocol Details"
                                >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit Details
                                </button>
                                <button
                                    onClick={() => removeParameter(item.id)}
                                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-200 ease-in-out flex items-center justify-center text-sm"
                                    title="Remove Protocol"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remove
                                </button>
                            </div>
                        </div>
                        <p className="text-md text-gray-700 mt-2 italic">{item.description || "no description available"}</p>
                    </div>

                    {/* mappings Grid - specification + unit per sensor */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredMappings.map(({ sensor, mapping }, index) => {
                            const val = mapping.value || {};
                            return (
                                <div
                                    key={sensor.id}
                                    className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm"
                                >
                                    <div className="mb-2 font-semibold text-gray-700">{sensor.alias || sensor.name || `Sensor ${String(index + 1).padStart(2, '0')}`}</div>
                                    <FormField
                                        label="Specification"
                                        name={`specification`}
                                        value={val.specification || ''}
                                        commitOnBlur={true}
                                        onChange={(e) => handleInputChange(itemIndex, { sourceId: sensor.id, targetId: item.id }, { ...(val || {}), specification: e.target.value })}
                                        placeholder="Enter specification"
                                    />

                                    <FormField
                                        label="Unit"
                                        name={`unit`}
                                        value={val.unit || ''}
                                        commitOnBlur={true}
                                        onChange={(e) => handleInputChange(itemIndex, { sourceId: sensor.id, targetId: item.id }, { ...(val || {}), unit: e.target.value })}
                                        placeholder="Enter unit"
                                    />
                                </div>
                            )
                        })}
                    </div>

                    {/* Edit Protocol Details Modal */}
                    <div className={`transition-all duration-200 ${(isEditModalOpen) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                        <EditEntityModal
                            isOpen={isEditModalOpen}
                            onClose={() => setIsEditModalOpen(false)}
                            onSave={onSave}
                            initialData={item}
                            title={`Edit Protocol: ${item.name}`}
                            fields={[
                                { name: 'name', label: 'Protocol Name' },
                                { name: 'description', label: 'Description', type: 'textarea' },
                                { name: 'type', label: 'Type' },
                            ]}
                        />
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center flex-grow text-gray-500 text-lg h-full">
                    <PlusCircleIcon className="w-16 h-16 mb-4 text-gray-500"></PlusCircleIcon>
                    <p>No test setup selected</p>
                    <p>Go to the 'Test-Setup' slide (5) and select a test-setup</p>
                </div>
            )}
        </div>
    )
}

export default ProcessingProtocolsMappingCard;