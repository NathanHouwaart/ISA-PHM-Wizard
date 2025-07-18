
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