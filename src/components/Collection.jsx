import React, { forwardRef, useState, useCallback } from 'react';

import useResizeObserver from '../hooks/useResizeObserver';
import useCombinedRefs from '../hooks/useCombinedRefs';

import { Book, Plus } from 'lucide-react';

// --- Main Publications Page Component ---
const Collection = forwardRef(({ onHeightChange, initialItems, itemHook }, ref) => {
    const [items, setItems] = useState(initialItems || []);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const { getCard, getForm, getView } = itemHook();

    // Get the component references
    const CardComponent = getCard();
    const FormComponent = getForm();
    const ViewComponent = getView(); // This will be null in your example

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const handleAdd = (itemData) => {
        setItems(prevItems => [...prevItems, itemData]);
        setShowAddForm(false);
    };

      const handleRemove = (itemId) => {
        if (window.confirm('Are you sure you want to remove this item?')) {
          setItems(prevItems => prevItems.filter(item => item.id !== itemId));
        }
      };

      const startEditMode = (item) => {
        setEditingItem(item);
        setShowAddForm(false); // Close add form if open
      };

    return (
        <div ref={combinedRef} className="rounded-md bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Publications</h1>
                        <p className="text-gray-600 mt-2">Here you can provide publications related to your experiment.</p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Publication</span>
                    </button>
                </div>

                {/* Add/Edit Form */}
                {(showAddForm || editingItem) && (
                    <div className="mb-8">
                        {
                            <FormComponent 
                                item={editingItem}
                            />
                        }
                    </div>
                )}

                {/* Publications Grid */}
                <div className="w-full space-y-5">
                    {items.map(item => (
                        <div key={item.id}>
                            {/* Only render PublicationCard if not in edit mode for this specific publication */}
                            <CardComponent 
                                item={item}
                                onEdit={startEditMode}
                                onRemove={handleRemove}
                            />
                        </div>
                    ))}
                </div>

                {items.length === 0 && !showAddForm && !editingItem && (
                    <div className="text-center py-12">
                        <Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-gray-900 mb-2">No Publications Yet</h3>
                        <p className="text-gray-500 mb-6">Get started by adding your first Publication.</p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Add First Publication
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

export default Collection;