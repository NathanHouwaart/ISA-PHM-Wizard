import React, { useRef, useCallback } from 'react';
import applyFilesToRange from './dataGridUtils';
import { captureGridSelection } from './dataGridHelpers';

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

  const onFilesChange = useCallback((ev) => {
    const files = ev.target.files;
    handleFilesPicked(files);
  }, [handleFilesPicked]);

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
          if (fileInputRef.current) {
            fileInputRef.current.value = null;
            fileInputRef.current.click();
          }
        }}
        className={`px-3 py-1 text-sm rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100`}
        title="Assign files to current selection"
      >
        📁 Assign files
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={onFilesChange}
        style={{ display: 'none' }}
        aria-hidden
      />
    </div>
  );
}
