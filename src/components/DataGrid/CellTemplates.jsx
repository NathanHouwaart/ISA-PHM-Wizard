
import React from 'react';
import IconToolTipButton from '../Widgets/IconTooltipButton';
import { Trash } from 'lucide-react';

// Cell template for bold text
export const BoldCell = ({ value }) => {
    return (
        <div className="flex items-center justify-center">
            <strong className=''>{value}</strong>
        </div>
    );
};

// Cell template for gray background
export const GrayCell = () => {
    return {
        style: {
            "background-color": '#e7e8e9',
        }
    }
}

// Cell template for generating a pattern based on row index
export const PatternCellTemplate = ({ prefix, rowIndex }) => {
    const value = `${prefix}${(rowIndex + 1).toString().padStart(2, '0')}`;
    return <BoldCell value={value} />;
}

// Bold cell template that uses the pattern cell template
export const BoldPatternCellTemplate = ({ prefix, rowIndex }) => {
    return <BoldCell value={PatternCellTemplate({ prefix, rowIndex })} />;
}

// Cell template that renders a delete icon button and dispatches a custom event
// The DataGrid component listens for the 'deleteRow' event and will remove the row
export const DeleteRowCellTemplate = ({ model, rowIndex }) => {
    const handleDelete = (e) => {
        // Try to find the enclosing revo-grid element to dispatch the event on
        const gridElement = e.target.closest && e.target.closest('revo-grid');
        const detail = { rowIndex, rowId: model?.id };

        const deleteEvent = new CustomEvent('deleteRow', {
            detail,
            bubbles: true
        });

        if (gridElement) {
            gridElement.dispatchEvent(deleteEvent);
        } else if (typeof window !== 'undefined') {
            // Fallback: dispatch on document so DataGrid can still pick it up
            document.dispatchEvent(deleteEvent);
        }
    };

    return (
        <div className="flex items-center justify-center">
            <IconToolTipButton
                icon={Trash}
                onClick={handleDelete}
                tooltipText={`Delete row ${rowIndex + 1}`}
                className="h-10 w-10 text-red-500"
            />
        </div>
    );
};

export const HTML5DateCellTemplate = ({ model, prop, rowIndex }) => {
    const currentValue = model?.[prop] || '';
    
    return (
        <input
            type="date"
            value={currentValue}
            onChange={(e) => {
                const newValue = e.target.value;
                
                // Create a proper edit event that matches RevoGrid's expected format
                const editEvent = new CustomEvent('beforeedit', {
                    detail: { 
                        rowIndex, 
                        prop, 
                        val: newValue,
                        value: currentValue, // old value
                        model: model,
                        rgRow: rowIndex
                    },
                    bubbles: true
                });
                
                // Dispatch on the grid element
                const gridElement = e.target.closest('revo-grid');
                if (gridElement) {
                    gridElement.dispatchEvent(editEvent);
                    
                    // Also trigger afteredit to complete the edit cycle
                    setTimeout(() => {
                        const afterEditEvent = new CustomEvent('afteredit', {
                            detail: { 
                                rowIndex, 
                                prop, 
                                val: newValue,
                                value: currentValue,
                                model: model,
                                rgRow: rowIndex
                            },
                            bubbles: true
                        });
                        gridElement.dispatchEvent(afterEditEvent);
                    }, 0);
                }
            }}
            // onBlur={(e) => {
            //     // Ensure the value is committed when losing focus
            //     const newValue = e.target.value;
            //     if (newValue !== currentValue) {
            //         const afterEditEvent = new CustomEvent('afteredit', {
            //             detail: { 
            //                 rowIndex, 
            //                 prop, 
            //                 val: newValue,
            //                 value: currentValue,
            //                 model: model,
            //                 rgRow: rowIndex
            //             },
            //             bubbles: true
            //         });
                    
            //         const gridElement = e.target.closest('revo-grid');
            //         if (gridElement) {
            //             gridElement.dispatchEvent(afterEditEvent);
            //         }
            //     }
            // }}
        />
    );
};