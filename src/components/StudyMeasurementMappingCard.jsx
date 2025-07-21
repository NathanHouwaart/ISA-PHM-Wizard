

import { Edit2, PlusCircleIcon, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import FormField from './Form/FormField';
import EditVariableModal from './EditModal';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';


export function StudyMeasurementMappingCard({ item, itemIndex, mappings, onSave, handleInputChange, removeParameter }) {

    const { selectedTestSetupId, testSetups } = useGlobalDataContext();
    
    const selectedTestSetup = testSetups.find(setup => setup.id === selectedTestSetupId);

    return (
        <div className='h-full'>
            {/* Conditional rendering of tab content */}
            {item && selectedTestSetupId ? (
                <div className="w-full bg-white border border-gray-200 rounded-xl p-6 flex flex-col min-h-full">
                    {/* Variable Header, Edit/Remove Buttons */}
                    <div className='mb-4 border-b pb-4'>
                        <div className="flex justify-between items-start ">
                            <h2 className="text-3xl font-bold text-gray-800 flex-grow pr-4">
                                {item.name}
                            </h2>

                        </div>
                        <p className="text-md text-gray-700 mt-2 italic">{item.description || "no description available"}</p>
                    </div>
                    {/* Studies Grid - this is where the dynamic inputs are */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedTestSetup?.sensors.map((sensor, index) => {
                            const existingMapping = mappings.find(
                                (m) => m.studyId === item.id && m.sensorId === sensor.id
                            );

                            // Fallback if no mapping exists yet
                            const mapping = existingMapping || {
                                sensorId: sensor.id,
                                studyId: item.id,
                                value: ''
                            };

                            return (
                                <div
                                    key={index}
                                    className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm"
                                >
                                    <FormField
                                        label={`Sensor S${(index + 1).toString().padStart(2, '0')}`}
                                        name={`Sensor S${(index + 1).toString().padStart(2, '0')}`}
                                        value={mapping.value}
                                        onChange={(e) => handleInputChange(0, mapping, e.target.value)}
                                        placeholder={"Enter filename"}
                                    />

                                </div>
                            );
                        })}
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

export default StudyMeasurementMappingCard;