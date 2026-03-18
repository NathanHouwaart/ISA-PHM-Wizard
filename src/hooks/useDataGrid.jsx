import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

const deepClone = (value) => JSON.parse(JSON.stringify(value ?? []));
const deepEqual = (left, right) => JSON.stringify(left ?? []) === JSON.stringify(right ?? []);

export const useDataGrid = ({
  rowData = [],
  columnData = [],
  mappings = [],
  fieldMappings = {},
  staticColumns = [],
  maxHistorySize = 50,
  onRowDataChange,
  historyScopeKey
}) => {
  const scrubControlChars = useCallback((input) => {
    let hadControlChars = false;
    let output = '';
    let previousWasSpace = false;

    for (const ch of input) {
      const code = ch.charCodeAt(0);
      const isControl = code <= 31 || code === 127;
      if (isControl) {
        hadControlChars = true;
        if (!previousWasSpace) {
          output += ' ';
          previousWasSpace = true;
        }
        continue;
      }

      output += ch;
      previousWasSpace = false;
    }

    return hadControlChars ? output.replace(/\s+/g, ' ').trim() : input;
  }, []);

  const sanitizeValue = useCallback((value) => {
    if (value === undefined || value === null) return '';
    const stringValue = String(value);
    return scrubControlChars(stringValue);
  }, [scrubControlChars]);

  const fields = useMemo(() => ({
    rowId: 'id',
    rowName: 'name',
    columnId: 'id',
    columnName: 'name',
    columnUnit: 'unit',
    mappingRowId: 'studyId',
    mappingColumnId: 'studyVariableId',
    mappingValue: 'value',
    ...fieldMappings
  }), [fieldMappings]);

  const normalizeMappingsForComparison = useCallback((list = []) => {
    return (list || [])
      .map((mapping) => ({
        row: String(mapping?.[fields.mappingRowId] ?? ''),
        col: String(mapping?.[fields.mappingColumnId] ?? ''),
        value: JSON.stringify(mapping?.[fields.mappingValue] ?? '')
      }))
      .sort((a, b) => {
        if (a.row !== b.row) return a.row.localeCompare(b.row);
        if (a.col !== b.col) return a.col.localeCompare(b.col);
        return a.value.localeCompare(b.value);
      });
  }, [fields.mappingRowId, fields.mappingColumnId, fields.mappingValue]);

  const mappingsSemanticEqual = useCallback((left, right) => {
    return deepEqual(
      normalizeMappingsForComparison(left),
      normalizeMappingsForComparison(right)
    );
  }, [normalizeMappingsForComparison]);

  const isStandaloneGrid = columnData.length === 0;

  const pruneMappings = useCallback((rows, columns, rawMappings) => {
    const allowedRowIds = new Set((rows || []).map((row) => row?.[fields.rowId]));
    const allowedColumnIds = new Set((columns || []).map((column) => column?.[fields.columnId]));

    return (rawMappings || []).filter((mapping) => {
      const rowOk = allowedRowIds.has(mapping?.[fields.mappingRowId]);
      if (!rowOk) return false;
      if (isStandaloneGrid) return true;
      return allowedColumnIds.has(mapping?.[fields.mappingColumnId]);
    });
  }, [
    fields.rowId,
    fields.columnId,
    fields.mappingRowId,
    fields.mappingColumnId,
    isStandaloneGrid
  ]);

  const makeSnapshot = useCallback((rows, rawMappings, reason = 'edit') => {
    const cleanedRows = deepClone(rows);
    const cleanedMappings = deepClone(pruneMappings(cleanedRows, columnData, rawMappings));
    return {
      rowData: cleanedRows,
      mappings: cleanedMappings,
      reason,
      ts: Date.now()
    };
  }, [pruneMappings, columnData]);

  const [currentRowData, setCurrentRowData] = useState(() => deepClone(rowData));
  const [currentMappings, setCurrentMappings] = useState(() => deepClone(pruneMappings(rowData, columnData, mappings)));
  const [history, setHistory] = useState(() => [makeSnapshot(rowData, mappings, 'init')]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentRowDataRef = useRef(currentRowData);
  const currentMappingsRef = useRef(currentMappings);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  const isInternalRowEmitRef = useRef(false);
  const scopeKeyRef = useRef(historyScopeKey);
  const lastIncomingRowsRef = useRef(deepClone(rowData));
  const lastIncomingMappingsRef = useRef(deepClone(pruneMappings(rowData, columnData, mappings)));

  useEffect(() => { currentRowDataRef.current = currentRowData; }, [currentRowData]);
  useEffect(() => { currentMappingsRef.current = currentMappings; }, [currentMappings]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);

  const resetFromProps = useCallback((reason = 'scope-change') => {
    const snapshot = makeSnapshot(rowData, mappings, reason);
    currentRowDataRef.current = snapshot.rowData;
    currentMappingsRef.current = snapshot.mappings;
    lastIncomingRowsRef.current = snapshot.rowData;
    lastIncomingMappingsRef.current = snapshot.mappings;
    historyRef.current = [snapshot];
    historyIndexRef.current = 0;

    setCurrentRowData(snapshot.rowData);
    setCurrentMappings(snapshot.mappings);
    setHistory([snapshot]);
    setHistoryIndex(0);
  }, [makeSnapshot, rowData, mappings]);

  useEffect(() => {
    if (scopeKeyRef.current === historyScopeKey) return;
    scopeKeyRef.current = historyScopeKey;
    resetFromProps('scope-change');
  }, [historyScopeKey, resetFromProps]);

  useEffect(() => {
    const incomingRows = deepClone(rowData);
    const incomingMappings = deepClone(pruneMappings(incomingRows, columnData, mappings));
    const incomingRowsChangedFromLast = !deepEqual(incomingRows, lastIncomingRowsRef.current);
    const incomingMappingsChangedFromLast = !mappingsSemanticEqual(incomingMappings, lastIncomingMappingsRef.current);

    if (isInternalRowEmitRef.current) {
      isInternalRowEmitRef.current = false;
      lastIncomingRowsRef.current = incomingRows;
      lastIncomingMappingsRef.current = incomingMappings;
      // Only skip if the parent echoed back exactly what we emitted (echo-loop prevention).
      // If the parent transformed the data further (e.g. propagating a value to more rows),
      // allow the sync to proceed so the grid reflects those additional changes.
      if (deepEqual(incomingRows, currentRowDataRef.current)) return;
    }

    if (!incomingRowsChangedFromLast && !incomingMappingsChangedFromLast) {
      return;
    }

    lastIncomingRowsRef.current = incomingRows;
    lastIncomingMappingsRef.current = incomingMappings;

    const rowsChanged = !deepEqual(incomingRows, currentRowDataRef.current);
    const mappingsChanged = !mappingsSemanticEqual(incomingMappings, currentMappingsRef.current);
    if (!rowsChanged && !mappingsChanged) return;

    const snapshot = makeSnapshot(incomingRows, incomingMappings, 'external-sync');
    const currentSnapshot = historyRef.current[historyIndexRef.current]
      || makeSnapshot(currentRowDataRef.current, currentMappingsRef.current, 'current');
    const snapshotRowsChanged = !deepEqual(currentSnapshot.rowData, snapshot.rowData);
    const snapshotMappingsChanged = !mappingsSemanticEqual(currentSnapshot.mappings, snapshot.mappings);

    currentRowDataRef.current = snapshot.rowData;
    setCurrentRowData(snapshot.rowData);
    currentMappingsRef.current = snapshot.mappings;
    setCurrentMappings(snapshot.mappings);

    if (!snapshotRowsChanged && !snapshotMappingsChanged) return;

    let nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(snapshot);

    if (nextHistory.length > maxHistorySize) {
      nextHistory = nextHistory.slice(nextHistory.length - maxHistorySize);
    }

    const nextIndex = nextHistory.length - 1;
    historyRef.current = nextHistory;
    historyIndexRef.current = nextIndex;
    setHistory(nextHistory);
    setHistoryIndex(nextIndex);
  }, [
    rowData,
    mappings,
    columnData,
    pruneMappings,
    mappingsSemanticEqual,
    makeSnapshot,
    maxHistorySize
  ]);

  const commitSnapshot = useCallback(({
    nextRowData,
    nextMappings,
    reason = 'edit',
    notifyRowData = true
  } = {}) => {
    const snapshot = makeSnapshot(
      nextRowData ?? currentRowDataRef.current,
      nextMappings ?? currentMappingsRef.current,
      reason
    );

    const currentSnapshot = historyRef.current[historyIndexRef.current]
      || makeSnapshot(currentRowDataRef.current, currentMappingsRef.current, 'current');

    const rowChanged = !deepEqual(currentSnapshot.rowData, snapshot.rowData);
    const mappingsChanged = !mappingsSemanticEqual(currentSnapshot.mappings, snapshot.mappings);

    const previousRows = currentRowDataRef.current;
    currentRowDataRef.current = snapshot.rowData;
    currentMappingsRef.current = snapshot.mappings;
    setCurrentRowData(snapshot.rowData);
    setCurrentMappings(snapshot.mappings);

    if (rowChanged || mappingsChanged) {
      let nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      nextHistory.push(snapshot);

      if (nextHistory.length > maxHistorySize) {
        nextHistory = nextHistory.slice(nextHistory.length - maxHistorySize);
      }

      const nextIndex = nextHistory.length - 1;
      historyRef.current = nextHistory;
      historyIndexRef.current = nextIndex;
      setHistory(nextHistory);
      setHistoryIndex(nextIndex);
    }

    if (notifyRowData && onRowDataChange && !deepEqual(previousRows, snapshot.rowData)) {
      isInternalRowEmitRef.current = true;
      onRowDataChange(snapshot.rowData);
    }

    return rowChanged || mappingsChanged;
  }, [makeSnapshot, mappingsSemanticEqual, maxHistorySize, onRowDataChange]);

  const applyHistorySnapshot = useCallback((nextIndex) => {
    const snapshot = historyRef.current[nextIndex];
    if (!snapshot) return;

    const previousRows = currentRowDataRef.current;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);

    currentRowDataRef.current = snapshot.rowData;
    setCurrentRowData(snapshot.rowData);
    currentMappingsRef.current = snapshot.mappings;
    setCurrentMappings(snapshot.mappings);

    if (onRowDataChange && !deepEqual(previousRows, snapshot.rowData)) {
      isInternalRowEmitRef.current = true;
      onRowDataChange(snapshot.rowData);
    }
  }, [onRowDataChange]);

  const undo = useCallback(() => {
    const index = historyIndexRef.current;
    if (index <= 0) return;
    applyHistorySnapshot(index - 1);
  }, [applyHistorySnapshot]);

  const redo = useCallback(() => {
    const index = historyIndexRef.current;
    const maxIndex = historyRef.current.length - 1;
    if (index >= maxIndex) return;
    applyHistorySnapshot(index + 1);
  }, [applyHistorySnapshot]);

  const applyTransaction = useCallback((transaction = {}) => {
    return commitSnapshot(transaction);
  }, [commitSnapshot]);

  const clearAllMappings = useCallback(() => {
    if (!currentMappingsRef.current.length) return;
    const clearedMappings = currentMappingsRef.current.map((mapping) => ({
      ...mapping,
      [fields.mappingValue]: ''
    }));
    applyTransaction({
      nextRowData: currentRowDataRef.current,
      nextMappings: clearedMappings,
      reason: 'clear-all-mappings',
      notifyRowData: false
    });
  }, [applyTransaction, fields.mappingValue]);

  const mappingLookup = useMemo(() => {
    const lookup = new Map();
    currentMappings.forEach((mapping) => {
      const key = `${mapping[fields.mappingRowId]}-${mapping[fields.mappingColumnId]}`;
      lookup.set(key, mapping);
    });
    return lookup;
  }, [currentMappings, fields.mappingRowId, fields.mappingColumnId]);

  const activeRowData = currentRowData;

  const columnDefs = useMemo(() => {
    const columns = [...staticColumns];

    if (columnData.length > 0) {
      columnData.forEach((column) => {
        if (fields.hasChildColumns) {
          columns.push({
            prop: column[fields.columnId],
            name: column[fields.columnName],
            size: 200,
            children: [
              {
                prop: `${column[fields.columnId]}_spec`,
                name: 'Specification',
                size: 120,
                readonly: false,
                editor: 'input'
              },
              {
                prop: `${column[fields.columnId]}_unit`,
                name: 'Unit',
                size: 80,
                readonly: false,
                editor: 'input',
                cellProperties: () => ({
                  style: { 'border-right': '3px solid black' }
                })
              }
            ]
          });
        } else {
          columns.push({
            prop: column[fields.columnId],
            name: `${column[fields.columnName]}${column[fields.columnUnit] ? ` (${column[fields.columnUnit]})` : ''}`,
            size: 150,
            readonly: false,
            cellProperties: (props) => {
              const model = props?.model;
              if (model?.isLastRunInStudy) {
                return { style: { 'border-bottom': '3px solid black' } };
              }
              return {};
            }
          });
        }
      });
    }

    return columns;
  }, [columnData, staticColumns, fields]);

  const gridData = useMemo(() => {
    return activeRowData.map((row) => {
      const gridRow = { ...row };

      if (columnData.length > 0) {
        columnData.forEach((column) => {
          const mappingKey = `${row[fields.rowId]}-${column[fields.columnId]}`;
          const mapping = mappingLookup.get(mappingKey);

          if (fields.hasChildColumns) {
            let specValue = '';
            let unitValue = '';

            const rawValue = mapping?.[fields.mappingValue];
            if (Array.isArray(rawValue)) {
              specValue = rawValue[0] || '';
              unitValue = rawValue[1] || '';
            } else if (typeof rawValue === 'string') {
              const parts = rawValue.split(';');
              specValue = parts[0] || '';
              unitValue = parts[1] || '';
            } else if (rawValue && typeof rawValue === 'object') {
              specValue = rawValue.specification || '';
              unitValue = rawValue.unit || '';
            }

            gridRow[`${column[fields.columnId]}_spec`] = specValue;
            gridRow[`${column[fields.columnId]}_unit`] = unitValue;
          } else {
            gridRow[column[fields.columnId]] = mapping ? mapping[fields.mappingValue] : '';
          }
        });
      }

      return gridRow;
    });
  }, [activeRowData, columnData, mappingLookup, fields]);

  const isEditableColumn = useCallback((columnProp) => {
    if (columnProp.includes('_spec') || columnProp.includes('_unit')) {
      const parentColumnId = columnProp.replace(/_spec$|_unit$/, '');
      return columnData.some((column) => column[fields.columnId] === parentColumnId);
    }
    return columnData.some((column) => column[fields.columnId] === columnProp);
  }, [columnData, fields.columnId]);

  const getRowByIndex = useCallback((index) => {
    return activeRowData[index];
  }, [activeRowData]);

  const getColumnByProp = useCallback((prop) => {
    return columnData.find((column) => column[fields.columnId] === prop);
  }, [columnData, fields.columnId]);

  const hasFilledValue = useCallback((value) => {
    if (Array.isArray(value)) {
      return value.some((entry) => String(entry ?? '').trim() !== '');
    }
    if (value && typeof value === 'object') {
      return Object.values(value).some((entry) => String(entry ?? '').trim() !== '');
    }
    return String(value ?? '').trim() !== '';
  }, []);

  const stats = useMemo(() => {
    if (isStandaloneGrid) {
      return {
        totalRows: activeRowData.length,
        totalColumns: staticColumns.length,
        totalMappings: 0,
        filledMappings: 0,
        coverage: 0
      };
    }

    const totalPossibleMappings = activeRowData.length * columnData.length;
    const filledMappings = currentMappings.filter((mapping) =>
      hasFilledValue(mapping?.[fields.mappingValue])
    ).length;

    return {
      totalRows: activeRowData.length,
      totalColumns: columnData.length,
      totalMappings: currentMappings.length,
      filledMappings,
      coverage: totalPossibleMappings > 0 ? Math.round((filledMappings / totalPossibleMappings) * 100) : 0
    };
  }, [
    isStandaloneGrid,
    activeRowData.length,
    staticColumns.length,
    columnData.length,
    currentMappings,
    fields.mappingValue,
    hasFilledValue
  ]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    rowData: activeRowData,
    columnData,
    mappings: currentMappings,
    gridData,
    columnDefs,

    canUndo,
    canRedo,
    historyIndex,
    history,
    isStandaloneGrid,

    undo,
    redo,
    applyTransaction,
    clearAllMappings,

    isEditableColumn,
    getRowByIndex,
    getColumnByProp,
    stats,

    fields,
    mappingLookup,
    sanitizeValue
  };
};
