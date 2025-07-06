import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { RevoGrid, Template } from '@revolist/react-datagrid';
import { Bold, Minus, Plus } from "lucide-react"; // Only need Minus and Plus, Bold isn't used as an icon
import PageWrapper from "../../layout/PageWrapper";
import "./GridTable.css";
import useResizeObserver from '../../hooks/useResizeObserver';
import useCombinedRefs from '../../hooks/useCombinedRefs';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import Paragraph from '../Typography/Paragraph';
import { v4 as uuidv4 } from 'uuid';

export const BoldCell = ({ value }) => {
    return (
        <div className="flex items-center justify-center">
            <strong className=''>{value}</strong>
        </div>
    );
};

export const GridTable = forwardRef(({ onHeightChange, items, setItems, columns, plugins }, ref) => {

    const history = useRef([]);
    const future = useRef([]);

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


    const handleEdit = (e) => {
        
        e.preventDefault();
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

            if (e.ctrlKey && (e.key === 'z' || e.key === 'y')) {
                // Only prevent default if we're actually handling the undo/redo
                if (!isEditing) { // Prevent default only if not in an input/textarea
                    e.preventDefault();
                    e.stopPropagation();
                }

                if (e.key === 'z') {
                    undo();
                } else if (e.key === 'y') {
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
        pushToHistory(items);

        const newRow = columns.reduce((acc, col) => {
            acc[col.prop] = '';
            return acc;
        }, {});

        newRow.id = uuidv4(); // Ensure each new row has a unique ID
        console.log("Adding new row:", newRow);

        setItems((prev) => [...prev, newRow]);
    };

    const removeRow = () => {
        if (items.length === 0) return; // Prevent removing from an empty grid

        // Before changing the state, push the current state to history
        pushToHistory(items);
        setItems((prev) => prev.slice(0, -1));
    };

    return (
        <div ref={combinedRef} className='p-6'>
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Item Grid</h1>
                <p className="text-gray-600 mt-2 text-left mb-4">Add all your items in a grid like way</p>
            </div>
            <div className="mb-2 space-x-2 flex">
                <button
                    onClick={addRow}
                    className="px-3 py-[2px] bg-blue-600 text-left rounded hover:bg-blue-700 transition flex items-center gap-1"
                >
                    <span>Add study</span> <Plus className="h-4 w-4" />
                </button>
                <button
                    onClick={removeRow}
                    className="px-3 py-[2px] bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center gap-1"
                >
                    <span>Remove study</span> <Minus className="h-4 w-4" />
                </button>
                <button
                    onClick={undo}
                    className="px-3 py-[2px] bg-gray-600 text-white rounded hover:bg-gray-700 transition flex items-center gap-1"
                >
                    <span>Undo (Ctrl+Z)</span>
                </button>
                <button
                    onClick={redo}
                    className="px-3 py-[2px] bg-gray-600 text-white rounded hover:bg-gray-700 transition flex items-center gap-1"
                >
                    <span>Redo (Ctrl+Y)</span>
                </button>
            </div>
            <div className="relative rounded-lg border-gray-300 shadow border-1 h-[400px]">
                <RevoGrid
                    rowSize={50}
                    columns={columns}
                    source={items}
                    columnTypes={plugins}
                    editable
                    // theme=''
                    resize={true}
                    range={{ y: items.length, x: items.length }}
                    style={{ width: '100%', height: '100%' }}
                    onBeforeedit={handleEdit}
                    onBeforeautofill={handleRangeEdit}
                />
            </div>
        </div>
    );
})