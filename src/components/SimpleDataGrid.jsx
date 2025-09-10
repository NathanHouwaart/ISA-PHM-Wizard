import React, { useState, useRef, useCallback } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import { HTML5DateCellTemplate, PatternCellTemplate } from './GridTable/CellTemplates';
import { Template } from '@revolist/react-datagrid';

/**
 * Simple DataGrid wrapper that preserves column resizing
 * This bypasses the complex DataGrid logic and uses RevoGrid directly
 */
const SimpleDataGrid = ({ 
  rowData, 
  staticColumns, 
  onRowDataChange, 
  height = '500px',
  title,
  showControls = false,
  showDebug = false 
}) => {
  const [data, setData] = useState(rowData);
  const gridRef = useRef();
  const dataRef = useRef(data); // Keep a ref to avoid stale closures

  // Update ref when data changes
  React.useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const handleAfterEdit = useCallback((event) => {
    const { detail } = event;
    
    // Update the data in-place without causing a re-render
    const currentData = dataRef.current;
    const rowIndex = detail.row;
    const columnProp = detail.column.prop;
    const newValue = detail.val;
    
    if (currentData[rowIndex]) {
      // Create new data array
      const newData = [...currentData];
      newData[rowIndex] = { ...newData[rowIndex], [columnProp]: newValue };
      
      // Update both state and ref
      setData(newData);
      dataRef.current = newData;
      
      // Notify parent component
      if (onRowDataChange) {
        onRowDataChange(newData);
      }
    }
  }, [onRowDataChange]);

  // Only update internal data when rowData prop actually changes (not on every render)
  const prevRowDataRef = useRef();
  React.useEffect(() => {
    if (prevRowDataRef.current !== rowData) {
      setData(rowData);
      prevRowDataRef.current = rowData;
    }
  }, [rowData]);

  console.log('🟢 SimpleDataGrid render, data length:', data.length);

  return (
    <div>
      {title && <h3>{title}</h3>}
      <RevoGrid
        ref={gridRef}
        source={data}
        columns={staticColumns}
        height={height}
        rowSize={50}
        theme="default"
        onAfteredit={handleAfterEdit}
        readonly={false}
        resize={true}
        canResize={true}
      />
    </div>
  );
};

export default SimpleDataGrid;
