

import { Edit2, PlusCircleIcon, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import FormField from './Form/FormField';
import EditVariableModal from './EditModal';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';


export function ProcessingProtocolsMappingCard({ item, itemIndex, mappings, onSave, handleInputChange, removeParameter }) {

    const { selectedTestSetupId } = useGlobalDataContext();

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
                        <FormField
                            label="Filter Type Specification"
                            name={`processingProtocolFilterTypeSpecification`}
                            value={item.processingProtocolFilterTypeSpecification || ''}
                            onChange={(e) => handleInputChange(itemIndex, e)}
                            placeholder="Enter filter type"
                        />

                        <FormField
                            label="Filter Type Unit"
                            name={`processingProtocolFilterTypeUnit`}
                            value={item.processingProtocolFilterTypeUnit || ''}
                            onChange={(e) => handleInputChange(itemIndex, e)}
                            placeholder="Enter filter type unit"
                        />

                        <FormField
                            label="Chunk Size Specification"
                            name={`processingProtocolChunkSizeSpecification`}
                            value={item.processingProtocolChunkSizeSpecification || ''}
                            onChange={(e) => handleInputChange(itemIndex, e)}
                            placeholder="Enter chunk size specification"
                        />

                        <FormField
                            label="Chunk Size Unit"
                            name={`processingProtocolChunkSizeUnit`}
                            value={item.processingProtocolChunkSizeUnit || ''}
                            onChange={(e) => handleInputChange(itemIndex, e)}
                            placeholder="Enter chunk size unit"
                        />

                        <FormField
                            label="Scaling Range Specification"
                            name={`processingProtocolScalingRangeSpecification`}
                            value={item.processingProtocolScalingRangeSpecification || ''}
                            onChange={(e) => handleInputChange(itemIndex, e)}
                            placeholder="Enter scaling range specification"
                        />

                        <FormField
                            label="Scaling Range Unit"
                            name={`processingProtocolScalingRangeUnit`}
                            value={item.processingProtocolScalingRangeUnit || ''}
                            onChange={(e) => handleInputChange(itemIndex, e)}
                            placeholder="Enter scaling range unit"
                        />

                        <FormField
                            label="Scaling Resolution Specification"
                            name={`processingProtocolScalingResolutionSpecification`}
                            value={item.processingProtocolScalingResolutionSpecification || ''}
                            onChange={(e) => handleInputChange(itemIndex, e)}
                            placeholder="Enter scaling resolution specification"
                        />

                        <FormField
                            label="Scaling Resolution Unit"
                            name={`processingProtocolScalingResolutionUnit`}
                            value={item.processingProtocolScalingResolutionUnit || ''}
                            onChange={(e) => handleInputChange(itemIndex, e)}
                            placeholder="Enter scaling resolution unit"
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