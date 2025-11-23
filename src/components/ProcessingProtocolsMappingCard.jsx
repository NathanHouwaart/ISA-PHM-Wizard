

import { Edit2, PlusCircleIcon, Trash2, Layers, HelpCircle } from 'lucide-react';
import React, { useState } from 'react';
import FormField from './Form/FormField';
import EditEntityModal from './EditEntityModal';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import Heading2 from './Typography/Heading2';
import Paragraph from './Typography/Paragraph';
import TooltipButton from './Widgets/TooltipButton';
import AnimatedTooltip, { AnimatedTooltipExample, AnimatedTooltipExplanation } from './Tooltip/AnimatedTooltipProvider';

const ProcessingProtocolsMappingCard = ({ item, itemIndex, mappings, onSave, handleInputChange, removeParameter, openEdit, onOpenHandled}) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);

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
                    <div className='mb-3 border-b pb-2'>
                        <div className="flex justify-between items-center">
                            <Heading2 className="text-3xl flex-grow pr-4">
                                {item.name}
                            </Heading2>

                            <div className="flex space-x-3">
                                <TooltipButton
                                    tooltipText="Show field help"
                                    onClick={() => setIsTooltipVisible(prev => !prev)}
                                    className="bg-transparent h-10 w-10 p-0 flex items-center justify-center group hover:bg-gray-200 rounded-full transition-colors duration-200"
                                >
                                    <HelpCircle className="h-5 w-5 text-gray-500 group-hover:text-blue-500 transition-colors duration-200" />
                                </TooltipButton>
                                <TooltipButton
                                    tooltipText="Edit protocol details"
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out flex items-center justify-center text-sm"
                                >
                                    <span className="flex items-center">
                                        <Edit2 className="w-4 h-4 mr-2" />
                                        Edit Details
                                    </span>
                                </TooltipButton>
                                <TooltipButton
                                    tooltipText="Delete protocol"
                                    onClick={() => removeParameter(item.id)}
                                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-200 ease-in-out flex items-center justify-center text-sm"
                                >
                                    <span className="flex items-center">
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Remove
                                    </span>
                                </TooltipButton>
                            </div>
                        </div>
                        <Paragraph className="text-sm text-gray-700 mt-1 italic">{item.description || "no description available"}</Paragraph>
                        
                        <AnimatedTooltip isVisible={isTooltipVisible}>
                            <AnimatedTooltipExplanation>
                                <div className="space-y-2">
                                    <div><strong>Specification:</strong> Specify the data processing detail.</div>
                                    <div><strong>Unit:</strong> Specify the unit of the data processing detail, if applicable.</div>
                                </div>
                            </AnimatedTooltipExplanation>
                            <AnimatedTooltipExample>
                                <div className="space-y-2">
                                    <div><strong>Specification example:</strong> Butterworth bandpass filter, 4th order, 0.5-20Hz</div>
                                    <div><strong>Unit example:</strong> Hz, g, m/s²</div>
                                </div>
                            </AnimatedTooltipExample>
                        </AnimatedTooltip>
                    </div>

                    {/* mappings Grid - specification + unit per sensor */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredMappings.map(({ sensor, mapping }, index) => {
                            const val = mapping.value || {};
                            return (
                                <div
                                    key={sensor.id}
                                    className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm"
                                >
                                    <div className="mb-2 font-semibold text-gray-700">{sensor.alias || sensor.name || `Sensor ${String(index + 1).padStart(2, '0')}`}</div>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <FormField
                                                label="Specification"
                                                name={`specification`}
                                                value={val.specification || ''}
                                                commitOnBlur={true}
                                                onChange={(e) => handleInputChange(itemIndex, { sourceId: sensor.id, targetId: item.id }, { ...(val || {}), specification: e.target.value })}
                                                placeholder="Enter specification"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <FormField
                                                label="Unit"
                                                name={`unit`}
                                                value={val.unit || ''}
                                                commitOnBlur={true}
                                                onChange={(e) => handleInputChange(itemIndex, { sourceId: sensor.id, targetId: item.id }, { ...(val || {}), unit: e.target.value })}
                                                placeholder="Enter unit"
                                            />
                                        </div>
                                    </div>
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
                                { 
                                    name: 'name', 
                                    label: 'Protocol Name',
                                    explanation: "Specify data processing details for each sensor. Each sensor specified in the test set-up is added automatically. As many data processing details can be added/removed as required to describe the data processing. If a detail is only relevant for part of the sensors, please leave cells empty for the sensors where they are not applicable.",
                                    example: "Filter, scaling range or other"
                                },
                                { 
                                    name: 'description', 
                                    label: 'Description', 
                                    type: 'textarea',
                                    explanation : "",
                                    example: ""
                                },
                            ]}
                        />
                    </div>
                </div>
            ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-gray-500 text-lg">
                    <Layers className="w-16 h-16 mb-4 text-gray-500" />
                    <Paragraph className="text-xl font-semibold">No test setup selected</Paragraph>
                    <Paragraph>Go to the project settings (icon with three layers) and select a test setup for your project</Paragraph>
                </div>
            )}
        </div>
    );
};

export default ProcessingProtocolsMappingCard;