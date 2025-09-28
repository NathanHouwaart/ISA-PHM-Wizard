import React, { useRef, useCallback } from 'react';
import applyFilesToRange from './dataGridUtils';
import { captureGridSelection } from './dataGridHelpers';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

/**
 * FilePickerPlugin
 * Props:
 * - gridRef: ref to the revo-grid element
 * - getFlatColumns: () => flattened columns array
 * - hookRowData: current rows from the hook
 * - fields: field mapping object from useDataGrid
 * - updateMappingsBatch: function to apply mapping updates
 * - showDebug: boolean to emit debug logs
 */
export default function FilePickerPlugin({ api = {} }) {
  // accept a single `api` object to keep the plugin surface small and
  // future-proof: api = { gridRef, getFlatColumns, hookRowData, fields, updateMappingsBatch, showDebug }
  const { gridRef, getFlatColumns, hookRowData = [], fields = {}, updateMappingsBatch, showDebug } = api;

  const fileInputRef = useRef(null);
  const selectionSnapshotRef = useRef(null);
  const filesRef = useRef(null);
  const { openExplorer } = useGlobalDataContext();

  const snapshotSelectionBeforePicker = useCallback(async () => {
    try {
      const r = await captureGridSelection(gridRef?.current);
      return r;
    } catch (err) {
      if (showDebug) console.debug('[FilePickerPlugin] snapshot error', err);
      return null;
    }
  }, [gridRef, showDebug]);

  const handleFilesPicked = useCallback((fileList) => {
    filesRef.current = fileList;

    const snap = selectionSnapshotRef.current?.range;
    if (!snap) {
      if (showDebug) console.debug('[FilePickerPlugin] no selection snapshot — aborting file assignment');
      return;
    }

    const flatCols = getFlatColumns();
    const rowsForUtil = (hookRowData || []).map((r, i) => ({ ...r, id: r[fields.rowId] ?? i }));

    const updates = applyFilesToRange(snap, rowsForUtil, flatCols, fileList);
    if (!updates || updates.length === 0) {
      selectionSnapshotRef.current = null;
      filesRef.current = null;
      return;
    }

    if (showDebug) console.debug('[FilePickerPlugin] updateMappingsBatch updates=', updates.slice(0, 200));
    updateMappingsBatch(updates);

    // cleanup
    selectionSnapshotRef.current = null;
    filesRef.current = null;
  }, [getFlatColumns, hookRowData, fields, updateMappingsBatch, showDebug]);

  // When using the in-app explorer we receive an array-like of file-like objects
  // so we don't need the native input change handler anymore.

  return (
    <div className="file-assign-plugin inline-flex items-center">
      <button
        type="button"
        onMouseDown={async (e) => {
          e.preventDefault();
          try {
            const snap = await snapshotSelectionBeforePicker();
            if (snap) selectionSnapshotRef.current = { range: snap };
          } catch (err) {
            // ignore
          }

          // Open the in-app explorer and wait for selection
          try {
            if (!openExplorer) {
              if (showDebug) console.debug('[FilePickerPlugin] openExplorer not available');
              return;
            }
            const selection = await openExplorer();
            // selection is expected to be an array-like of objects having at least
            // { name, webkitRelativePath }
            if (!selection || (Array.isArray(selection) && selection.length === 0)) {
              // user cancelled or no files selected
              selectionSnapshotRef.current = null;
              return;
            }

            // Pass the selection to the existing handler which expects an array-like
            handleFilesPicked(selection);
          } catch (err) {
            if (showDebug) console.debug('[FilePickerPlugin] error opening in-app explorer', err);
            selectionSnapshotRef.current = null;
          }
        }}
        className={`px-3 py-1 text-sm rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100`}
        title="Assign files to current selection"
      >
        📁 Assign files
      </button>
    </div>
  );
}
