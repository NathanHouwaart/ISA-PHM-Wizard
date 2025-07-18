

import React, { useMemo, useState } from 'react'
import EditVariableModal from './EditModal';
import { Edit, Edit2, Plus, PlusCircle, Trash2 } from 'lucide-react';
import FormField from './Form/FormField';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';


export function EntityMappingPanel({ name, tileNamePrefix, itemHook, mappings, handleInputChange, disableAdd = false }) {

    const { items, updateItem, addItem, removeItem, cardComponent } = itemHook();

    const MappingCardComponent = cardComponent();

    const [selectedEntityIndex, setSelectedEntityIndex] = useState(0);
    const selectedEntity = useMemo(() => items[selectedEntityIndex], [items, selectedEntityIndex]);

    return (
        <div className='flex'>

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
                            { tileNamePrefix ? `${tileNamePrefix}${(index + 1).toString().padStart(2, '0')}` : item.name }
                        </button>
                    ))}
                </div>
                {!disableAdd &&
                    <button
                        onClick={addItem}
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
                            mappings={mappings}
                            onSave={updateItem}
                            handleInputChange={handleInputChange}
                            removeParameter={removeItem}
                        />
                    }
                </div>
            ) : (
                <div className='mx-auto'>
                    <div className="flex flex-col items-center justify-center flex-grow text-gray-500 text-lg h-full">
                        <PlusCircle className="w-16 h-16 mb-4 text-gray-300" />
                        <p>No item selected or available.</p>
                        <p>Click 'Add New' to get started!</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default EntityMappingPanel