import React, { forwardRef, useState, isValidElement } from 'react';

import useResizeObserver from '../hooks/useResizeObserver';
import useCombinedRefs from '../hooks/useCombinedRefs';

import { Book, Plus, Wrench } from 'lucide-react';
import Paragraph from './Typography/Paragraph';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import classNames from 'classnames';
import TooltipButton from './Widgets/TooltipButton';

// --- Sub-components for Collection ---
export const CollectionTitle = ({ children }) => <>{children}</>;
export const CollectionSubtitle = ({ children }) => <>{children}</>;
export const CollectionAddButtonText = ({ children }) => <>{children}</>;
export const CollectionEmptyStateTitle = ({ children }) => <>{children}</>;
export const CollectionEmptyStateSubtitle = ({ children }) => <>{children}</>;
export const CollectionEmptyStateAddButtonText = ({ children }) => <>{children}</>;


// --- Main Collection Component ---
const Collection = forwardRef(({ onHeightChange, grid, itemHook, children }, ref) => {

    const [showAddForm, setShowAddForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [viewingItem, setViewingItem] = useState(null);

    const { items, setItems, getCard, getForm, getView } = itemHook();

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
            setItems(prevItems => {
                // 1. Filter out the study to remove
                const filtered = prevItems.filter(item => item.id !== itemId);
                return filtered;
            });
            setViewingItem(null);
        }
    };


    const startEditMode = (item) => {
        setViewingItem(null);
        setEditingItem(item);
        setShowAddForm(false); // Close add form if open
    };

    // Extract children components
    let title = 'Collection'; // Default title
    let subtitle = 'Manage your collection items here.'; // Default subtitle
    let addButtonText = 'Add Item';
    let addButtonTooltip = 'Add a new item to the collection';
    let emptyStateTitle = 'No Items Yet';
    let emptyStateSubtitle = 'Get started by adding your first item.';
    let emptyStateAddButtonText = 'Add First Item';

    children.forEach(child => {
        if (isValidElement(child)) {
            switch (child.type) {
                case CollectionTitle:
                    title = child.props.children;
                    break;
                case CollectionSubtitle:
                    subtitle = child.props.children;
                    break;
                case CollectionAddButtonText:
                    addButtonText = child.props.children;
                    addButtonTooltip = child.props.children + ' to the collection';
                    break;
                case CollectionEmptyStateTitle:
                    emptyStateTitle = child.props.children;
                    break;
                case CollectionEmptyStateSubtitle:
                    emptyStateSubtitle = child.props.children;
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
            <div className="mx-auto">
                {/* Header */}
                <div className="pl-3 flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                        <Paragraph className="text-gray-600 mt-2">{subtitle}</Paragraph>
                    </div>
                    <TooltipButton
                        onClick={() => setShowAddForm(true)}
                        tooltipText={addButtonTooltip}
                    >
                        <Plus className="w-5 h-5" />
                        <span>{addButtonText}</span>
                    </TooltipButton>

                    
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
                                    setViewingItem(null)
                                }}
                                isEditing={editingItem ? true : false}
                            />
                        </div>
                    )}

                {/* Author Detail View */}
                {viewingItem && ViewComponent && (
                    <div className="mb-8">
                        <ViewComponent
                            item={viewingItem}
                            onSave={startEditMode}
                            onCancel={() => setViewingItem(null)}
                        />
                    </div>
                )}

                {/* Items Grid */}
                <div className={`${grid ? "grid grid-cols-1 lg:grid-cols-2 gap-2" : "w-full space-y-2"}`}>
                    {items.map(item => (
                        (viewingItem?.id !== item.id && editingItem?.id !== item.id) && (
                            <div key={item.id} className={ViewComponent ? "cursor-pointer" : ''} onClick={() => { ViewComponent && setViewingItem(item) }}>
                                <CardComponent
                                    item={item}
                                    onEdit={startEditMode}
                                    onRemove={handleRemove}
                                />
                            </div>
                        )
                    ))}
                </div>


                {items.length === 0 && !showAddForm && !editingItem && (
                    <div className="text-center py-12">
                        <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-gray-900 mb-2">{emptyStateTitle}</h3>
                        <p className="text-gray-500 mb-6">{emptyStateSubtitle}</p>
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