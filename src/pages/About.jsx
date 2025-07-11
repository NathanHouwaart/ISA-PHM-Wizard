import React, { useEffect, useRef, useState } from 'react';
import { RevoGrid, Template } from '@revolist/react-datagrid';
import { Minus, Plus } from "lucide-react"; // Only need Minus and Plus, Bold isn't used as an icon
import PageWrapper from "../layout/PageWrapper";
import "./About.css";

const BoldCell = ({ value }) => {
  return (
    <div className="flex items-center justify-center">
      <strong className=''>{value}</strong>
    </div>
  );
};

const columns = [
  { prop: 'id', name: 'Identifier', size: 90, readonly: true, cellTemplate: Template(BoldCell) },
  { prop: 'title', name: 'Title', size: 200 },
  { prop: 'description', name: 'Description', size: 374 },
  { prop: 'submissionDate', name: 'Submission Date', size: 150 },
  { prop: 'publicationDate', name: 'Publication Date', size: 140 }
];

export const About = () => {
  const [rows, setRows] = useState([
    { id: 'S01', title: '', description: '', submissionDate: '', publicationDate: '' },
    { id: 'S02', title: '', description: '', submissionDate: '', publicationDate: '' }
  ]);

  const history = useRef([]);
  const future = useRef([]);

  // This useEffect will re-run on every render if `history`, `future`, or `rows` change.
  // This is fine for debugging, but typically you might not need to log on every render.
  useEffect(() => {
    // console.log("Undo buffer: ", history.current);
    // console.log("Redo buffer: ", future.current);
    // console.log("rows changed", rows);
  }, [history, future, rows]); // Added history and future to dependencies, although their .current values won't trigger re-renders.

  const pushToHistory = (prevData) => {
    history.current.push(JSON.stringify(prevData));
    if (history.current.length > 100) history.current.shift(); // limit stack size
    future.current = []; // clear redo stack on new action
  };

  // Note: onBeforeautofill passes e.detail.changes which is an array of objects
  // { type: 'change', row: number, col: number, prop: string, val: any }
  const handleRangeEdit = (e) => {
    const { detail: changes } = e;
    if (changes && changes.length > 0) {
      const prevData = [...rows]; // Capture current state before applying range changes
      pushToHistory(prevData);

      const newData = [...rows];
      changes.forEach(change => {
        const { row, prop, val } = change;
        if (newData[row]) {
          newData[row] = { ...newData[row], [prop]: val };
        }
      });
      setRows(newData);
    }
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
      const prevData = [...rows]; // Capture the state *before* this edit
      pushToHistory(prevData);

      const newData = [...rows];
      newData[rowIndex] = { ...newData[rowIndex], [prop]: newValue };
      setRows(newData);
    }
  };

  const undo = () => {
    if (history.current.length === 0) return;

    // The state we are moving *from* (current `rows`) goes to `future`
    future.current.push(JSON.stringify(rows));

    // The state we are moving *to* (previous state from `history`)
    const prevState = JSON.parse(history.current.pop());
    setRows(prevState);
  };

  const redo = () => {
    if (future.current.length === 0) return;

    // The state we are moving *from* (current `rows`) goes to `history`
    history.current.push(JSON.stringify(rows));

    // The state we are moving *to* (next state from `future`)
    const nextState = JSON.parse(future.current.pop());
    setRows(nextState);
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
  }, [rows]); // Add `rows` to dependency array to ensure `undo` and `redo` always capture the latest `rows` value when called.
              // Although useRef values are stable, the `rows` state itself changes.

  const addRow = () => {
    // Before changing the state, push the current state to history
    pushToHistory(rows);

    const rowIndex = rows.length + 1;
    const newRow = columns.reduce((acc, col) => {
      if (col.prop === 'identifier') {
        acc[col.prop] = `S${rowIndex.toString().padStart(2, '0')}`;
      } else {
        acc[col.prop] = '';
      }
      return acc;
    }, {});

    setRows((prev) => [...prev, newRow]);
  };

  const removeRow = () => {
    if (rows.length === 0) return; // Prevent removing from an empty grid

    // Before changing the state, push the current state to history
    pushToHistory(rows);
    setRows((prev) => prev.slice(0, -1));
  };

  return (
    <PageWrapper >
      <h2 className="text-2xl font-bold mb-4">Dynamic RevoGrid with Tailwind CSS</h2>
      <div className="mb-2 space-x-2">
        <button
          onClick={addRow}
          className="px-3 py-[2px] bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-1"
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
      <div className="relative rounded-lg overflow-hidden border-purple-500 shadow-md border-2 h-[400px]">
        <RevoGrid
          rowSize={50}
          columns={columns}
          source={rows}
          editable
          resize={true}
          range={{ y: rows.length, x: columns.length }}
          style={{ width: '100%', height: '100%' }}
          onBeforeedit={handleEdit}
          onBeforeautofill={handleRangeEdit}
        />
      </div>
    </PageWrapper>
  );
}