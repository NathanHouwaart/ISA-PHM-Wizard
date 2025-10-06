import React, { useState, useEffect, useRef, useContext, createContext, useReducer, useCallback, useMemo, memo } from 'react';

// Step 1: Design System Components
const Typography = ({ variant = 'body', children, className = '' }) => {
    const variants = {
        h1: 'text-3xl font-bold',
        h2: 'text-2xl font-semibold',
        body: 'text-base',
        caption: 'text-sm text-gray-600'
    };
    return <div className={`${variants[variant]} ${className}`}>{children}</div>;
};

const Button = ({ variant = 'primary', children, onClick, className = '' }) => {
    const variants = {
        primary: 'bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded',
        secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded',
        icon: 'p-1 hover:bg-gray-200 rounded'
    };
    return (
        <button 
            className={`${variants[variant]} transition-colors ${className}`}
            onClick={onClick}
        >
            {children}
        </button>
    );
};

const Input = ({ value, onChange, onBlur, onKeyDown, autoFocus, className = '', type = 'text' }) => {
    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            autoFocus={autoFocus}
            className={`w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        />
    );
};

const Select = ({ value, onChange, options, onBlur, autoFocus }) => {
    return (
        <select
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            autoFocus={autoFocus}
            className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    );
};

// Step 3: State Management
const GridContext = createContext();

const gridReducer = (state, action) => {
    switch (action.type) {
        case 'SET_DATA':
            return { ...state, data: action.payload };
        case 'SET_COLUMNS':
            return { ...state, columns: action.payload };
        case 'EDIT_CELL': {
            const newData = [...state.data];
            const rowIndex = action.payload.row;
            const colKey = action.payload.column;
            newData[rowIndex] = {
                ...newData[rowIndex],
                [colKey]: action.payload.value
            };
            return { ...state, data: newData };
        }
        case 'SET_EDITING':
            return { ...state, editing: action.payload };
        case 'SET_SELECTION':
            return { ...state, selection: action.payload };
        case 'RESIZE_COLUMN':
            return {
                ...state,
                ui: {
                    ...state.ui,
                    columnWidths: {
                        ...state.ui.columnWidths,
                        [action.payload.column]: action.payload.width
                    }
                }
            };
        default:
            return state;
    }
};

const useGrid = () => useContext(GridContext);

// Plugin System
class PluginManager {
    constructor() {
        this.plugins = {};
    }

    register(plugin) {
        this.plugins[plugin.id] = plugin;
        if (plugin.onInit) {
            plugin.onInit();
        }
    }

    getRenderer(column) {
        for (let id in this.plugins) {
            const plugin = this.plugins[id];
            if (plugin.column === column && plugin.renderer) {
                return plugin.renderer;
            }
        }
        return null;
    }

    getEditor(column) {
        for (let id in this.plugins) {
            const plugin = this.plugins[id];
            if (plugin.column === column && plugin.editor) {
                return plugin.editor;
            }
        }
        return null;
    }
}

// Plugin Helpers
const Plugin = {
    Dropdown: ({ column, options }) => ({
        id: `dropdown-${column}`,
        column,
        editor: (props) => (
            <Select
                value={props.value}
                onChange={(e) => props.onChange(e.target.value)}
                onBlur={props.onBlur}
                options={options}
                autoFocus
            />
        ),
        renderer: (props) => (
            <div className="px-2 py-1">{props.value || '-'}</div>
        )
    }),
    Button: ({ column, label, onClick }) => ({
        id: `button-${column}`,
        column,
        renderer: (props) => (
            <div className="px-2 py-1">
                <button
                    className="px-2 py-0.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    onClick={() => onClick(props.rowData)}
                >
                    {label}
                </button>
            </div>
        )
    })
};

// Step 6 & 7: GridCell with editing
const GridCell = memo(({ rowIndex, columnKey, column, value, rowData }) => {
    const { state, dispatch, pluginManager } = useGrid();
    const [editValue, setEditValue] = useState(value);
    const isEditing = state.editing?.row === rowIndex && state.editing?.column === columnKey;
    const isSelected = state.selection?.row === rowIndex && state.selection?.column === columnKey;

    useEffect(() => {
        setEditValue(value);
    }, [value]);

    const handleDoubleClick = () => {
        if (column.editable) {
            dispatch({ type: 'SET_EDITING', payload: { row: rowIndex, column: columnKey } });
        }
    };

    const handleClick = () => {
        dispatch({ type: 'SET_SELECTION', payload: { row: rowIndex, column: columnKey } });
    };

    const handleSave = (newValue) => {
        dispatch({ type: 'EDIT_CELL', payload: { row: rowIndex, column: columnKey, value: newValue } });
        dispatch({ type: 'SET_EDITING', payload: null });
    };

    const handleCancel = () => {
        setEditValue(value);
        dispatch({ type: 'SET_EDITING', payload: null });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSave(editValue);
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    // Get custom renderer or editor from plugins
    const customRenderer = pluginManager.getRenderer(columnKey);
    const customEditor = pluginManager.getEditor(columnKey);

    const cellClasses = `
        border-r border-b border-gray-200 overflow-hidden cursor-pointer
        ${isSelected ? 'ring-2 ring-blue-500 ring-inset z-10' : ''}
        ${column.pinned === 'left' ? 'bg-gray-50 sticky left-0 z-20' : ''}
    `;

    const width = state.ui.columnWidths[columnKey] || column.width || 100;

    if (isEditing) {
        if (customEditor) {
            return (
                <div className={cellClasses} style={{ width, minWidth: width }}>
                    {customEditor({
                        value: editValue,
                        onChange: (v) => setEditValue(v),
                        onBlur: () => handleSave(editValue),
                        rowData
                    })}
                </div>
            );
        }
        return (
            <div className={cellClasses} style={{ width, minWidth: width }}>
                <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSave(editValue)}
                    onKeyDown={handleKeyDown}
                    type={column.type === 'number' ? 'number' : 'text'}
                    autoFocus
                />
            </div>
        );
    }

    return (
        <div 
            className={cellClasses} 
            style={{ width, minWidth: width }}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
        >
            {customRenderer ? 
                customRenderer({ value, rowIndex, columnKey, rowData }) :
                <div className="px-2 py-1 truncate">{value !== undefined && value !== null ? value : ''}</div>
            }
        </div>
    );
});

// Step 5: GridRow
const GridRow = memo(({ rowIndex, rowData, columns }) => {
    const { state } = useGrid();
    const rowHeight = state.ui.rowHeights?.[rowIndex] || 32;

    return (
        <div className="flex" style={{ height: rowHeight, minHeight: rowHeight }}>
            {columns.map(col => (
                <GridCell
                    key={col.key}
                    rowIndex={rowIndex}
                    columnKey={col.key}
                    column={col}
                    value={rowData[col.key]}
                    rowData={rowData}
                />
            ))}
        </div>
    );
});

// Step 4: GridHeader
const GridHeaderCell = ({ column }) => {
    const { state } = useGrid();
    const width = state.ui.columnWidths[column.key] || column.width || 100;
    
    const cellClasses = `
        border-r border-b border-gray-300 bg-gray-100 font-semibold
        flex items-center justify-between px-2 h-8
        ${column.pinned === 'left' ? 'bg-gray-200 sticky left-0 z-30' : ''}
    `;

    return (
        <div 
            className={cellClasses}
            style={{ width, minWidth: width }}
        >
            <span className="truncate">{column.title}</span>
        </div>
    );
};

const GridHeader = ({ columns }) => {
    // For nested headers, we need to handle column groups
    const renderHeaders = (cols, level = 0) => {
        const groups = [];
        const standalone = [];
        
        cols.forEach(col => {
            if (col.children && col.children.length > 0) {
                groups.push(col);
            } else {
                standalone.push(col);
            }
        });

        if (groups.length > 0) {
            return (
                <>
                    <div className="flex">
                        {groups.map(group => (
                            <div key={group.key}>
                                <div className="border-r border-b border-gray-300 bg-gray-100 font-semibold px-2 h-8 flex items-center">
                                    {group.title}
                                </div>
                                <div className="flex">
                                    {renderHeaders(group.children, level + 1)}
                                </div>
                            </div>
                        ))}
                        {standalone.map(col => (
                            <GridHeaderCell key={col.key} column={col} />
                        ))}
                    </div>
                </>
            );
        }

        return (
            <>
                {cols.map(col => (
                    <GridHeaderCell key={col.key} column={col} />
                ))}
            </>
        );
    };

    // For simplicity, flatten all columns for now
    const flattenColumns = (cols) => {
        let flat = [];
        cols.forEach(col => {
            if (col.children) {
                flat = flat.concat(flattenColumns(col.children));
            } else {
                flat.push(col);
            }
        });
        return flat;
    };

    const flatColumns = flattenColumns(columns);

    return (
        <div className="flex border-t border-l border-gray-300 sticky top-0 z-40 bg-white">
            {flatColumns.map(col => (
                <GridHeaderCell key={col.key} column={col} />
            ))}
        </div>
    );
};

// Step 5: GridBody with virtualization
const GridBody = ({ data, columns }) => {
    const containerRef = useRef(null);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
    const { state } = useGrid();
    const rowHeight = 32;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
            const end = Math.min(
                Math.ceil((scrollTop + containerHeight) / rowHeight) + 5,
                data.length
            );
            setVisibleRange({ start, end });
        };

        container.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => container.removeEventListener('scroll', handleScroll);
    }, [data.length, rowHeight]);

    const visibleRows = data.slice(visibleRange.start, visibleRange.end);
    const topPadding = visibleRange.start * rowHeight;
    const bottomPadding = Math.max(0, (data.length - visibleRange.end) * rowHeight);

    return (
        <div 
            ref={containerRef}
            className="flex-1 overflow-auto border-l border-gray-300"
            style={{ position: 'relative' }}
        >
            <div style={{ paddingTop: topPadding, paddingBottom: bottomPadding }}>
                {visibleRows.map((row, index) => (
                    <GridRow
                        key={visibleRange.start + index}
                        rowIndex={visibleRange.start + index}
                        rowData={row}
                        columns={columns}
                    />
                ))}
            </div>
        </div>
    );
};

// Step 2: Main Grid Component
const Grid = ({ data, columns, rowHeight = 32, plugins = [], onChange }) => {
    const flattenColumns = (cols) => {
        let flat = [];
        cols.forEach(col => {
            if (col.children) {
                flat = flat.concat(flattenColumns(col.children));
            } else {
                flat.push(col);
            }
        });
        return flat;
    };

    const [state, dispatch] = useReducer(gridReducer, {
        data,
        columns,
        selection: null,
        editing: null,
        clipboard: null,
        ui: {
            columnWidths: {},
            rowHeights: {},
            scrollLeft: 0,
            scrollTop: 0
        }
    });

    const pluginManager = useMemo(() => new PluginManager(), []);
    
    useEffect(() => {
        plugins.forEach(plugin => pluginManager.register(plugin));
    }, [plugins, pluginManager]);

    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: data });
    }, [data]);

    useEffect(() => {
        dispatch({ type: 'SET_COLUMNS', payload: columns });
    }, [columns]);

    useEffect(() => {
        if (onChange && state.data !== data) {
            onChange(state.data);
        }
    }, [state.data, onChange, data]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!state.selection) return;
            
            const { row, column } = state.selection;
            const flatCols = flattenColumns(columns);
            const colIndex = flatCols.findIndex(c => c.key === column);
            
            let newRow = row;
            let newColIndex = colIndex;
            
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    newRow = Math.max(0, row - 1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    newRow = Math.min(state.data.length - 1, row + 1);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    newColIndex = Math.max(0, colIndex - 1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    newColIndex = Math.min(flatCols.length - 1, colIndex + 1);
                    break;
                case 'Enter':
                    if (!state.editing && flatCols[colIndex].editable) {
                        e.preventDefault();
                        dispatch({ type: 'SET_EDITING', payload: { row, column } });
                    }
                    break;
                case 'Escape':
                    if (state.editing) {
                        e.preventDefault();
                        dispatch({ type: 'SET_EDITING', payload: null });
                    }
                    break;
                default:
                    return;
            }
            
            if (e.key.startsWith('Arrow')) {
                dispatch({ 
                    type: 'SET_SELECTION', 
                    payload: { row: newRow, column: flatCols[newColIndex].key }
                });
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.selection, state.editing, columns, state.data.length]);

    const flatColumns = flattenColumns(columns);

    return (
        <GridContext.Provider value={{ state, dispatch, pluginManager }}>
            <div className="h-full flex flex-col bg-white">
                <GridHeader columns={columns} />
                <GridBody data={state.data} columns={flatColumns} />
            </div>
        </GridContext.Provider>
    );
};

// Demo Application
export const App = () => {
    const [data, setData] = useState(() => {
        const initialData = [
            { id: 1, name: 'Alice Johnson', age: 28, role: 'Developer', department: 'Engineering', status: 'Active' },
            { id: 2, name: 'Bob Smith', age: 35, role: 'Designer', department: 'Design', status: 'Active' },
            { id: 3, name: 'Charlie Brown', age: 42, role: 'Manager', department: 'Management', status: 'On Leave' },
            { id: 4, name: 'Diana Prince', age: 31, role: 'Developer', department: 'Engineering', status: 'Active' },
            { id: 5, name: 'Edward Norton', age: 29, role: 'Designer', department: 'Design', status: 'Active' },
        ];
        
        // Add 10000 more rows for virtualization testing
        for (let i = 6; i <= 10000; i++) {
            initialData.push({
                id: i,
                name: `Employee ${i}`,
                age: 25 + (i % 30),
                role: ['Developer', 'Designer', 'Manager', 'Analyst'][i % 4],
                department: ['Engineering', 'Design', 'Management', 'Analytics'][i % 4],
                status: ['Active', 'On Leave', 'Remote'][i % 3]
            });
        }
        
        return initialData;
    });

    const columns = [
        { key: 'id', title: 'ID', width: 60, pinned: 'left' },
        { key: 'name', title: 'Name', width: 150, editable: true },
        { key: 'age', title: 'Age', width: 80, editable: true, type: 'number' },
        { key: 'role', title: 'Role', width: 120, editable: true },
        { key: 'department', title: 'Department', width: 120, editable: true },
        { key: 'status', title: 'Status', width: 100, editable: true },
        { key: 'actions', title: 'Actions', width: 100 }
    ];

    const plugins = [
        Plugin.Dropdown({ 
            column: 'role', 
            options: ['Developer', 'Designer', 'Manager', 'Analyst', 'QA', 'DevOps']
        }),
        Plugin.Dropdown({ 
            column: 'status', 
            options: ['Active', 'On Leave', 'Remote', 'Inactive']
        }),
        Plugin.Button({ 
            column: 'actions', 
            label: 'View',
            onClick: (row) => alert(`Viewing: ${row.name} (ID: ${row.id})`)
        })
    ];

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            <div className="p-4 bg-white shadow-md">
                <Typography variant="h1" className="mb-2">React Grid Library Demo</Typography>
                <Typography variant="caption">
                    Steps 0-7 implemented • 10,000 rows with virtualization • Double-click to edit • Arrow keys to navigate
                </Typography>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
                <div className="h-full bg-white shadow-lg rounded overflow-hidden">
                    <Grid 
                        data={data}
                        columns={columns}
                        rowHeight={32}
                        plugins={plugins}
                        onChange={(updatedData) => {
                            console.log('Data changed:', updatedData.slice(0, 5));
                            setData(updatedData);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default App;