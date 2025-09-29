import { Edit2, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import FormField from './Form/FormField';
import EditEntityModal from './EditEntityModal';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import { VARIABLE_TYPE_OPTIONS } from '../constants/variableTypes';

export function StudyVariableMappingCard({ item, itemIndex, mappings, onSave, handleInputChange, removeParameter, openEdit, onOpenHandled }) {

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Open modal when parent signals an add-created item
    if (openEdit && !isEditModalOpen) {
        setIsEditModalOpen(true);
        onOpenHandled && onOpenHandled();
    }

    const { studies } = useGlobalDataContext();

    const filteredMappings = studies.map(s =>
        mappings.find(m => m.studyVariableId === item.id && m.studyId === s.id) || {
            studyVariableId: item.id,
            studyId: s.id,
            value: ''
        }
    );

    return (
        <div className="w-full bg-white border border-gray-200 rounded-xl p-6 flex flex-col min-h-full">
            {/* Variable Header, Edit/Remove Buttons */}
            <div className="flex justify-between items-start mb-4 border-b pb-4">
                <h2 className="text-3xl font-bold text-gray-800 flex-grow pr-4">
                    {item.name}
                </h2>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out flex items-center justify-center text-sm transform hover:scale-105"
                        title="Edit Variable Details"
                    >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Details
                    </button>
                    <button
                        onClick={() => removeParameter(item.id)}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-200 ease-in-out flex items-center justify-center text-sm transform hover:scale-105"
                        title="Remove Parameter"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                    </button>
                </div>
            </div>
            <p className="text-md text-gray-700 mb-4">{item.description}</p>
            <div className="flex justify-between items-center text-sm font-medium text-gray-600 bg-gray-50 px-4 py-2 rounded-md mb-6 border border-gray-200">
                <span>Type: <span className="font-semibold text-gray-800">{item.type}</span></span>
                {item.unit && <span>Unit: <span className="font-semibold text-gray-800">{item.unit}</span></span>}
            </div>

            {/* mappings Grid - this is where the dynamic inputs are */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredMappings.map((item, index) => {
                    return (
                        <div
                            key={index}
                            className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm"
                        >
                            <FormField
                                label={`Study S${(index + 1).toString().padStart(2, '0')}`}
                                name={`Study S${(index + 1).toString().padStart(2, '0')}`}
                                value={item ? item.value : ''} // Ensure value is not undefined
                                commitOnBlur={true}
                                onChange={(e) => handleInputChange(itemIndex, { studyVariableId: item.studyVariableId, studyId: item.studyId }, e.target.value)}
                                placeholder={"Enter value"}
                            />
                        </div>
                    )
                })}
            </div>

            {/* Edit Variable Details Modal */}
            <div className={`transition-all duration-200 ${(isEditModalOpen) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <EditEntityModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={onSave}
                    initialData={item}
                    title={`Edit Variable: ${item.name}`}
                    fields={[
                        { 
                            name: 'name', 
                            label: 'Variable Name', 
                            explanation: "Define all variables that can be varied in the experiments. As many variables can be added/removed as required to describe the experiment.",
                            example: ": Fault type, fault severity or motor speed or other."
                        
                        },
                        { 
                            name: 'type', 
                            label: 'Variable Type', 
                            type: 'select', 
                            options: VARIABLE_TYPE_OPTIONS,
                            explanation: "Describe the type of the variable (e.g. operating condition/fault specification).",
                            example: "Quantitative fault specification, qualitative fault specification, operational condition, environmental condition or other."
                        },
                        { 
                            name: 'unit', 
                            label: 'Unit',  
                            explanation: "Unit corresponding with the variable. Please leave empty if none.",
                            example: "Hz, RPM, m/s."
                        },
                        { 
                            name: 'description', 
                            label: 'Description', 
                            type: 'textarea',
                            explanation: "Description of the variable.",
                            example: "Measures the impact or intensity of the fault."
                        }
                    ]}
                />
            </div>
        </div >
    )
}

export default StudyVariableMappingCard