import React, { forwardRef, useState, isValidElement } from 'react';

import useResizeObserver from '../hooks/useResizeObserver';
import useCombinedRefs from '../hooks/useCombinedRefs';

import { Book, Plus, Wrench } from 'lucide-react';
import Paragraph from './Typography/Paragraph';

// --- Sub-components for Collection ---
// These are "dummy" components that serve as markers for where
// the content should be rendered within the Collection component.
export const CollectionTitle = ({ children }) => <>{children}</>;
export const CollectionUndertitle = ({ children }) => <>{children}</>;
export const CollectionAddButtonText = ({ children }) => <>{children}</>;
export const CollectionEmptyStateTitle = ({ children }) => <>{children}</>;
export const CollectionEmptyStateUndertitle = ({ children }) => <>{children}</>;
export const CollectionEmptyStateAddButtonText = ({ children }) => <>{children}</>;


// --- Main Collection Component ---
const Collection = forwardRef(({ onHeightChange, initialItems, itemHook, children }, ref) => {
    const [items, setItems] = useState(initialItems || []);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const { getCard, getForm, getView } = itemHook();

    // Get the component references
    const CardComponent = getCard();
    const FormComponent = getForm();
    const ViewComponent = getView();

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
        console.log("Start edit modeeee")
        setEditingItem(item);
        setShowAddForm(false); // Close add form if open
    };

    // Extract children components
    let title = 'Collection'; // Default title
    let undertitle = 'Manage your collection items here.'; // Default undertitle
    let addButtonText = 'Add Item';
    let emptyStateTitle = 'No Items Yet';
    let emptyStateUndertitle = 'Get started by adding your first item.';
    let emptyStateAddButtonText = 'Add First Item';

    children.forEach(child => {
        if (isValidElement(child)) {
            switch (child.type) {
                case CollectionTitle:
                    title = child.props.children;
                    break;
                case CollectionUndertitle:
                    undertitle = child.props.children;
                    break;
                case CollectionAddButtonText:
                    addButtonText = child.props.children;
                    break;
                case CollectionEmptyStateTitle:
                    emptyStateTitle = child.props.children;
                    break;
                case CollectionEmptyStateUndertitle:
                    emptyStateUndertitle = child.props.children;
                    break;
                case CollectionEmptyStateAddButtonText:
                    emptyStateAddButtonText = child.props.children;
                    break;
                default:
                    break;
            }
        }
    });

    return (
        <div ref={combinedRef} className="rounded-md bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                        <Paragraph className="text-gray-600 mt-2">{undertitle}</Paragraph>
                    </div>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                        <Plus className="w-5 h-5" />
                        <span>{addButtonText}</span>
                    </button>
                </div>

                {/* Add/Edit Form */}
                {(showAddForm || editingItem) && 
                    (
                    <div className="mb-8">
                        <FormComponent
                            item={editingItem}
                            onCancel={() => { setShowAddForm(false); setEditingItem(null); }} // Added cancel functionality
                            onSave={(updatedItem) => { // Assuming form returns updated item on save
                                if (editingItem) {
                                    setItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
                                } else {
                                    setItems(prevItems => [...prevItems, updatedItem]);
                                }
                                setShowAddForm(false);
                                setEditingItem(null);
                            }}
                        />
                    </div>
                )}

                {/* Publications Grid */}
                <div className="w-full space-y-5">
                    {items.map(item => (
                        <div key={item.id}>
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
                        <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
                        <h3 className="text-xl font-medium text-gray-900 mb-2">{emptyStateTitle}</h3>
                        <p className="text-gray-500 mb-6">{emptyStateUndertitle}</p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            {emptyStateAddButtonText}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

export default Collection;