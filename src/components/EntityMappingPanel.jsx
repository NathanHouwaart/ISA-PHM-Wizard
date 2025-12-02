

import React, { useMemo, useState } from 'react'
import { Plus } from 'lucide-react';
import useMappingsController from '../hooks/useMappingsController';
import Paragraph from './Typography/Paragraph';
import Heading3 from './Typography/Heading3';
import TooltipButton from './Widgets/TooltipButton';

const EntityMappingPanel = ({ name, tileNamePrefix, itemHook, mappings, handleInputChange, disableAdd = false, minHeight }) => {


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
        <div className='flex flex-col md:flex-row gap-6 h-full' style={minHeight ? { minHeight } : undefined}>

            {/* Sidebar for Variable Navigation */}
            <div className="w-full md:w-1/6 bg-white border border-gray-300 rounded-2xl p-4 flex flex-col flex-shrink-0 shadow-md max-h-full">
                <Heading3 className="text-lg text-gray-900">
                    {name}
                </Heading3>
                <Paragraph className="text-xs text-gray-500 mb-2">Select an item.</Paragraph>
                <div className="overflow-y-auto flex-1 space-y-2">
                    {items.map((item, index) => {
                        const key = item?.id ?? item?.uuid ?? `${name || 'mapping'}-${item?.name || index}`;
                        return (
                        <TooltipButton
                            key={key}
                            tooltipText={item.name}
                            onClick={() => setSelectedEntityIndex(index)}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${index === selectedEntityIndex
                                ? 'bg-blue-600 text-white shadow'
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50'
                                }`}
                        >
                            {tileNamePrefix ? `${tileNamePrefix}${(index + 1).toString().padStart(2, '0')}` : item.name}
                        </TooltipButton>
                        );
                    })}
                </div>
                {!disableAdd &&
                    <TooltipButton
                        tooltipText="Add a new item"
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
                    </TooltipButton>
                }
            </div>

            {/* Conditional rendering of tab content */}
            {selectedEntity ? (
                <div className='flex-1 max-h-full overflow-y-auto'>
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
                <div className="flex-1 min-w-0 flex items-center justify-center bg-white border border-gray-300 rounded-2xl shadow-sm min-h-[220px]">
                    <Paragraph className="text-gray-500 text-sm">Select an item from the list</Paragraph>
                </div>
            )}
        </div>
    );
};

export default EntityMappingPanel
