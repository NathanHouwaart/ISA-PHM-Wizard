import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import { Minus, Plus, Redo, Undo } from "lucide-react"; // Only need Minus and Plus, Bold isn't used as an icon
import "./GridTable.css";
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { v4 as uuidv4 } from 'uuid';
import TooltipButton from '../Widgets/TooltipButton';

export const GridTable = forwardRef(({ onHeightChange, items, setItems, itemHook, columns, disableAdd = false, plugins }, ref) => {

    const {addItem, removeItem } = itemHook ? itemHook() : { addItem: null, removeItem: null };

    const gridRef = useRef(null);
    const cursorPosition = useRef(null);
    const future = useRef([]);
    const history = useRef([]);

    const elementToObserveRef = useResizeObserver(onHeightChange);
    const combinedRef = useCombinedRefs(ref, elementToObserveRef);

    const pushToHistory = (prevData) => {
        history.current.push(JSON.stringify(prevData));
        if (history.current.length > 100) history.current.shift(); // limit stack size
        future.current = []; // clear redo stack on new action
    };

    const handleRangeEdit = (e) => {
        e.preventDefault();
        const { detail } = e;

        if (!detail || !detail.newData) return;

        const prevData = [...items]; // Save for undo
        pushToHistory(prevData);

        const updatedData = [...items];

        // Iterate through each row index in newData
        for (const rowIndex in detail.newData) {
            const rowUpdates = detail.newData[rowIndex];
            const rowIdx = parseInt(rowIndex, 10);

            if (!updatedData[rowIdx]) continue;

            updatedData[rowIdx] = {
                ...updatedData[rowIdx],
                ...rowUpdates
            };
        }

        setItems(updatedData);
    };

    useEffect(() => {
        const currentpos = cursorPosition
        const grid = gridRef.current;
        if (!grid) return;

        const handleBeforePasteApply = (e) => {
            const { parsed } = e.detail;

            // Find the active/selected cell (fallback to 0,0)

            const colOffset = columns.filter(col => col?.pin === 'colPinStart').length;

            var startRow = cursorPosition.current.rowIndex ?? 0;
            var startCol = 0;

            if (currentpos.current.type === 'colPinStart') {
                startCol = cursorPosition.current.colIndex ?? 0;
            } else {
                startCol = cursorPosition.current.colIndex + colOffset;
            }

            // Save for undo
            pushToHistory(items);

            // Apply pasted data manually
            const newData = [...items];

            parsed.forEach((rowValues, rowOffset) => {
                const rowIdx = startRow + rowOffset;
                if (!newData[rowIdx]) return;

                rowValues.forEach((cellValue, colOffset) => {
                    const colIdx = startCol + colOffset;
                    const col = columns[colIdx];
                    if (col?.prop) {
                        newData[rowIdx] = {
                            ...newData[rowIdx],
                            [col.prop]: cellValue
                        };
                    }
                });
            });

            setItems(newData);

            // Override RevoGrid's default paste
            e.preventDefault();
        };

        if (grid) {
            grid.addEventListener('beforepasteapply', handleBeforePasteApply);
        }

        return () => {
            if (grid) {
                grid.removeEventListener('beforepasteapply', handleBeforePasteApply);
            }
        };
    }, [items, columns]);


    const handleEdit = (e) => {

        e.preventDefault();

        // console.log("Handling edit:", e);
        const { detail } = e;
        const newValue = detail.val;
        const oldValue = detail.value; // Get the old value to check if it actually changed
        const rowIndex = detail.rowIndex;
        const prop = detail.prop;

        // Only store if changed
        if (newValue !== oldValue) {
            const prevData = [...items]; // Capture the state *before* this edit
            pushToHistory(prevData);

            const newData = [...items];
            newData[rowIndex] = { ...newData[rowIndex], [prop]: newValue };
            setItems(newData);
        }
    };

    const undo = () => {
        if (history.current.length === 0) return;

        // The state we are moving *from* (current `rows`) goes to `future`
        future.current.push(JSON.stringify(items));

        // The state we are moving *to* (previous state from `history`)
        const prevState = JSON.parse(history.current.pop());
        setItems(prevState);

    };

    const redo = () => {
        if (future.current.length === 0) return;

        // The state we are moving *from* (current `rows`) goes to `history`
        history.current.push(JSON.stringify(items));

        // The state we are moving *to* (next state from `future`)
        const nextState = JSON.parse(future.current.pop());
        setItems(nextState);

    };

    // Add keyboard listeners for undo/redo
    useEffect(() => {
        const keyHandler = (e) => {
            // Make sure no cell editor is actively focused to prevent conflict with input operations
            const activeTag = document.activeElement?.tagName?.toLowerCase();
            const isEditing = activeTag === 'input' || activeTag === 'textarea';

            const key = (e.key).toLowerCase();

            if (e.ctrlKey && (key === 'z' || key === 'y')) {
                // Only prevent default if we're actually handling the undo/redo
                if (!isEditing) { // Prevent default only if not in an input/textarea
                    e.preventDefault();
                    e.stopPropagation();
                }

                if (key === 'z') {
                    undo();
                } else if (key === 'y') {
                    redo();
                }
            }
        };

        window.addEventListener('keydown', keyHandler, true); // capture phase
        return () => window.removeEventListener('keydown', keyHandler, true);
    }, [items]); // Add `rows` to dependency array to ensure `undo` and `redo` always capture the latest `rows` value when called.
    // Although useRef values are stable, the `rows` state itself changes.

    const addRow = () => {
        // Before changing the state, push the current state to history
        console.log("Adding row");
        console.log("Current items:", items[0]);
        pushToHistory(items);

        const newRow = columns.reduce((acc, col) => {
            acc[col.prop] = '';
            return acc;
        }, {});

        console.log("New Row before ID:", newRow);
        
        newRow.id = uuidv4(); // Ensure each new row has a unique ID

        console.log("New Row after ID:", newRow);

        setItems((prev) => {
            console.log("Previous items in setItems:", [...prev, newRow]);
            return ( [...prev, newRow] )
        });
    };

    useEffect(() => {
        console.log("Items updated:", items);
    }, [items]);

    const removeRow = () => {
        if (items.length === 0) return; // Prevent removing from an empty grid

        // Before changing the state, push the current state to history
        pushToHistory(items);
        setItems((prev) => prev.slice(0, -1));
    };

    return (
        <div ref={combinedRef} className='p-6'>
            {/* <div>
                <h1 className="text-3xl font-bold text-gray-900">Item Grid</h1>
                <p className="text-gray-600 mt-2 text-left mb-4">Add all your items in a grid like way</p>
            </div> */}

            <div className="mb-2 space-x-2 flex">
                {!disableAdd &&
                    <>
                        <TooltipButton
                            tooltipText="Add a new row to the grid"
                            onClick={addRow}
                            className="px-3 py-[2px] bg-blue-600 text-left hover:bg-blue-700 transition flex items-center gap-1"
                        >
                            <span>Add Row</span> <Plus className="h-4 w-4" />
                        </TooltipButton>
                        <TooltipButton
                            tooltipText="Remove the last row from the grid"
                            onClick={removeRow}
                            className="px-3 py-[2px] bg-red-600 text-left hover:bg-red-700 transition flex items-center gap-1"
                        >
                            <span>Remove Row</span> <Minus className="h-4 w-4" />
                        </TooltipButton>
                    </>}

                <TooltipButton
                    tooltipText="Undo the last change (Ctrl+Z)"
                    onClick={undo}
                    className={`px-3 py-[2px] ${history.current.length === 0
                        ? 'pointer-events-none from-gray-600 to-gray-600 opacity-75'
                        : 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'}`}
                >
                    <span>Undo (Ctrl+Z)</span>
                    <Undo className="h-4 w-4" />
                </TooltipButton>
                <TooltipButton
                    tooltipText="Redo the last undone change (Ctrl+Y)"
                    onClick={redo}
                    className={`px-3 py-[2px] ${future.current.length === 0
                        ? 'pointer-events-none from-gray-600 to-gray-600 opacity-75'
                        : 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'}`}
                >
                    <span>Redo (Ctrl+Y)</span>
                    <Redo className="h-4 w-4 transform" />
                </TooltipButton>

            </div>
            <div className="relative rounded-lg border-gray-300 shadow border-1 h-[400px]">
                <RevoGrid
                    ref={gridRef}
                    rowSize={50}
                    columns={columns}
                    source={items}
                    columnTypes={plugins}
                    editable
                    resize={true}
                    range={{ y: items.length, x: items.length }}
                    style={{ width: '100%', height: '100%' }}
                    onBeforeedit={handleEdit}
                    onBeforeautofill={handleRangeEdit}
                    onBeforecellfocus={(e) => {
                        cursorPosition.current = e.detail;
                    }}
                />
            </div>
        </div>
    );
})