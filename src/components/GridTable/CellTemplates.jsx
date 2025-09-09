
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
    return <>{value}</>;
}

// Bold cell template that uses the pattern cell template
export const BoldPatternCellTemplate = ({ prefix, rowIndex }) => {
    return <BoldCell value={PatternCellTemplate({ prefix, rowIndex })} />;
}

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
            onBlur={(e) => {
                // Ensure the value is committed when losing focus
                const newValue = e.target.value;
                if (newValue !== currentValue) {
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
                    
                    const gridElement = e.target.closest('revo-grid');
                    if (gridElement) {
                        gridElement.dispatchEvent(afterEditEvent);
                    }
                }
            }}
        />
    );
};