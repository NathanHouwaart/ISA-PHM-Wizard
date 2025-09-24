

import React, { useMemo, useState } from 'react'
import { Plus, PlusCircleIcon } from 'lucide-react';
import useMappingsController from '../hooks/useMappingsController';

export function EntityMappingPanel({ name, tileNamePrefix, itemHook, mappings, handleInputChange, disableAdd = false, minHeight }) {


    const { items, updateItem, addItem, removeItem, cardComponent } = itemHook();

    const MappingCardComponent = cardComponent();

    // Provide a stable controller to mapping cards. If the parent passed an explicit
    // handleInputChange or mappings array we prefer that, otherwise use the global controller.
    const controller = useMappingsController();
    const effectiveHandleInputChange = handleInputChange ? handleInputChange : controller.updateMappingValue;

    const [selectedEntityIndex, setSelectedEntityIndex] = useState(0);
    const [openEditOnAdd, setOpenEditOnAdd] = useState(false);
    const selectedEntity = useMemo(() => items[selectedEntityIndex], [items, selectedEntityIndex]);

    return (
        <div className='flex' style={minHeight ? { minHeight } : undefined}>

            {/* Sidebar for Variable Navigation */}
            <div className="w-full overflow-auto md:w-1/4  bg-white border border-gray-200 rounded-xl p-4 flex flex-col flex-shrink-0 mb-6 md:mb-0 md:mr-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">{name}</h3>
                <div className="overflow-y-auto flex-grow">
                    {items.map((item, index) => (
                        <button
                            key={item.id || index}
                            onClick={() => {
                                setSelectedEntityIndex(index);
                            }}
                            className={`w-full cursor-pointer text-left p-3 rounded-lg mb-2 transition-colors duration-200 ${index === selectedEntityIndex
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                                }`}
                        >
                            {tileNamePrefix ? `${tileNamePrefix}${(index + 1).toString().padStart(2, '0')}` : item.name}
                        </button>
                    ))}
                </div>
                {!disableAdd &&
                    <button
                        onClick={() => {
                            addItem();
                            // select the newly added item (it will be appended)
                            setSelectedEntityIndex(items.length);
                            setOpenEditOnAdd(true);
                        }}
                        className="mt-4 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 transition duration-200 ease-in-out flex items-center justify-center text-sm"
                    >
                        <span className='px-2 flex'>
                            <Plus className='w-5 h-5' />
                            Add New
                        </span>
                    </button>
                }
            </div>

            {/* Conditional rendering of tab content */}
            {selectedEntity ? (
                <div className='w-full '>
                    {MappingCardComponent &&
                        <MappingCardComponent
                            item={selectedEntity}
                            itemIndex={selectedEntityIndex}
                            mappings={mappings ?? controller.mappings}
                            onSave={updateItem}
                            handleInputChange={effectiveHandleInputChange}
                            removeParameter={removeItem}
                            openEdit={openEditOnAdd}
                            onOpenHandled={() => setOpenEditOnAdd(false)}
                        />
                    }
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

export default EntityMappingPanel