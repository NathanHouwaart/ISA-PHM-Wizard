import React, { forwardRef, useMemo, useState, isValidElement } from 'react';

import useResizeObserver from '../hooks/useResizeObserver';
import useCombinedRefs from '../hooks/useCombinedRefs';

import { Plus, Wrench } from 'lucide-react';
import Paragraph from './Typography/Paragraph';
import Heading1 from './Typography/Heading1';

import TooltipButton from './Widgets/TooltipButton';
import AlertDecisionDialog from './Widgets/AlertDecisionDialog';
import Heading3 from './Typography/Heading3';

// --- Sub-components for Collection ---
export const CollectionTitle = ({ children }) => <>{children}</>;
export const CollectionSubtitle = ({ children }) => <>{children}</>;
export const CollectionAddButtonText = ({ children }) => <>{children}</>;
export const CollectionEmptyStateTitle = ({ children }) => <>{children}</>;
export const CollectionEmptyStateSubtitle = ({ children }) => <>{children}</>;
export const CollectionEmptyStateAddButtonText = ({ children }) => <>{children}</>;

const deriveItemLabel = (item) => {
    if (!item) {
        return 'this item';
    }

    const stringCandidates = [
        item.cardLabel,
        item.displayName,
        item.name,
        item.title,
        item.label,
    ];

    for (const candidate of stringCandidates) {
        if (typeof candidate === 'string') {
            const trimmed = candidate.trim();
            if (trimmed) {
                return trimmed;
            }
        }
    }

    if (item.firstName || item.midInitials || item.lastName) {
        const fullName = [item.firstName, item.midInitials, item.lastName]
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (fullName) {
            return fullName;
        }
    }

    return 'this item';
};


// --- Main Collection Component ---
const Collection = forwardRef(({ onHeightChange, grid, itemHook, children }, ref) => {

    const [showAddForm, setShowAddForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [viewingItem, setViewingItem] = useState(null);
    const [pendingDeleteItem, setPendingDeleteItem] = useState(null);

    const { items, setItems, getCard, getForm, getView } = itemHook();

    // Get the component references
    const CardComponent = getCard();
    const FormComponent = getForm();
    const ViewComponent = getView();
    

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const handleRemove = (itemId) => {
        const itemToRemove = items.find(item => item.id === itemId);
        if (itemToRemove) {
            setPendingDeleteItem(itemToRemove);
        }
    };

    const handleConfirmRemove = () => {
        if (!pendingDeleteItem) {
            return;
        }

        const idToRemove = pendingDeleteItem.id;
        setItems(prevItems => prevItems.filter(item => item.id !== idToRemove));
        setViewingItem(prev => (prev?.id === idToRemove ? null : prev));
        setEditingItem(prev => (prev?.id === idToRemove ? null : prev));
        setPendingDeleteItem(null);
    };

    const handleCancelRemove = () => {
        setPendingDeleteItem(null);
    };

    const pendingDeleteLabel = useMemo(
        () => deriveItemLabel(pendingDeleteItem),
        [pendingDeleteItem]
    );


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
    let _emptyStateAddButtonText = 'Add First Item';

    React.Children.forEach(children, (child) => {
        if (!isValidElement(child)) {
            return;
        }
        switch (child.type) {
            case CollectionTitle:
                title = child.props.children;
                break;
            case CollectionSubtitle:
                subtitle = child.props.children;
                break;
            case CollectionAddButtonText:
                addButtonText = child.props.children;
                addButtonTooltip = `${child.props.children} to the collection`;
                break;
            case CollectionEmptyStateTitle:
                emptyStateTitle = child.props.children;
                break;
            case CollectionEmptyStateSubtitle:
                emptyStateSubtitle = child.props.children;
                break;
            case CollectionEmptyStateAddButtonText:
                _emptyStateAddButtonText = child.props.children;
                break;
            default:
                break;
        }
    });

    return (
        <div ref={combinedRef} className="rounded-md bg-gray-50 p-6">
            <div className="mx-auto">
                {/* Header */}
                <div className="pl-3 flex items-center justify-between mb-8">
                    <div>
                        <Heading1 className="mb-0 border-b-0 text-left px-0 py-0">{title}</Heading1>
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

                {/* Contact Detail View */}
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
                {!showAddForm && !editingItem &&
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
}


                {items.length === 0 && !showAddForm && !editingItem && (
                    <div className="text-center py-12">
                        <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <Heading3>{emptyStateTitle}</Heading3>
                        <Paragraph>{emptyStateSubtitle}</Paragraph>
                    </div>
                )}
            </div>
            <AlertDecisionDialog
                open={Boolean(pendingDeleteItem)}
                tone="warning"
                title={`Remove ${pendingDeleteLabel}?`}
                message={`Are you sure you want to remove ${pendingDeleteLabel}? This action cannot be undone.`}
                confirmLabel="Remove"
                cancelLabel="Cancel"
                confirmTooltip={`Remove ${pendingDeleteLabel}`}
                cancelTooltip={`Keep ${pendingDeleteLabel}`}
                onConfirm={handleConfirmRemove}
                onCancel={handleCancelRemove}
                confirmButtonProps={{
                    className: 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700',
                }}
            />
        </div>
    );
});

export default Collection;
