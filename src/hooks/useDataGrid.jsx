import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

const asArray = (value) => (Array.isArray(value) ? value : []);

export const useDataGrid = ({
  rowData = [],
  columnData = [],
  mappings = [],
  fieldMappings = {},
  staticColumns = [],
  mappingCellProperties,
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

  const isStandaloneGrid = columnData.length === 0;

  const pruneMappings = useCallback((rows, columns, rawMappings) => {
    const allowedRowIds = new Set((rows || []).map((row) => row?.[fields.rowId]));
    const allowedColumnIds = new Set((columns || []).map((column) => column?.[fields.columnId]));

    const list = rawMappings || [];
    let pruned = false;
    const filtered = list.filter((mapping) => {
      const rowOk = allowedRowIds.has(mapping?.[fields.mappingRowId]);
      if (!rowOk) { pruned = true; return false; }
      if (isStandaloneGrid) return true;
      const colOk = allowedColumnIds.has(mapping?.[fields.mappingColumnId]);
      if (!colOk) pruned = true;
      return colOk;
    });
    // Return original reference when nothing was removed to preserve reference equality.
    return pruned ? filtered : list;
  }, [
    fields.rowId,
    fields.columnId,
    fields.mappingRowId,
    fields.mappingColumnId,
    isStandaloneGrid
  ]);

  const makeSnapshot = useCallback((rows, rawMappings, reason = 'edit', options = {}) => {
    const { prune = false } = options;
    const cleanedRows = asArray(rows);
    const normalizedMappings = asArray(rawMappings);
    const cleanedMappings = prune
      ? pruneMappings(cleanedRows, columnData, normalizedMappings)
      : normalizedMappings;
    return {
      rowData: cleanedRows,
      mappings: cleanedMappings,
      reason,
      ts: Date.now()
    };
  }, [pruneMappings, columnData]);

  const [currentRowData, setCurrentRowData] = useState(() => asArray(rowData));
  const [currentMappings, setCurrentMappings] = useState(() => pruneMappings(asArray(rowData), columnData, asArray(mappings)));
  const [history, setHistory] = useState(() => [makeSnapshot(rowData, mappings, 'init', { prune: true })]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentRowDataRef = useRef(currentRowData);
  const currentMappingsRef = useRef(currentMappings);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  const isInternalRowEmitRef = useRef(false);
  const isInternalMappingsEmitRef = useRef(false);
  const scopeKeyRef = useRef(historyScopeKey);
  const lastIncomingRowsRef = useRef(asArray(rowData));
  const lastIncomingMappingsRef = useRef(asArray(mappings));
  const lastIncomingColumnDataRef = useRef(columnData);

  useEffect(() => { currentRowDataRef.current = currentRowData; }, [currentRowData]);
  useEffect(() => { currentMappingsRef.current = currentMappings; }, [currentMappings]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);

  const resetFromProps = useCallback((reason = 'scope-change') => {
    const snapshot = makeSnapshot(rowData, mappings, reason, { prune: true });
    currentRowDataRef.current = snapshot.rowData;
    currentMappingsRef.current = snapshot.mappings;
    lastIncomingRowsRef.current = asArray(rowData);
    lastIncomingMappingsRef.current = asArray(mappings);
    lastIncomingColumnDataRef.current = columnData;
    historyRef.current = [snapshot];
    historyIndexRef.current = 0;

    setCurrentRowData(snapshot.rowData);
    setCurrentMappings(snapshot.mappings);
    setHistory([snapshot]);
    setHistoryIndex(0);
  }, [makeSnapshot, rowData, mappings, columnData]);

  useEffect(() => {
    if (scopeKeyRef.current === historyScopeKey) return;
    scopeKeyRef.current = historyScopeKey;
    resetFromProps('scope-change');
  }, [historyScopeKey, resetFromProps]);

  useEffect(() => {
    const incomingRows = asArray(rowData);
    const incomingMappingsRaw = asArray(mappings);
    const rowsChangedFromLast = incomingRows !== lastIncomingRowsRef.current;
    const mappingsChangedFromLast = incomingMappingsRaw !== lastIncomingMappingsRef.current;
    const columnsChangedFromLast = columnData !== lastIncomingColumnDataRef.current;

    if (!rowsChangedFromLast && !mappingsChangedFromLast && !columnsChangedFromLast) {
      return;
    }

    const shouldPruneMappings = rowsChangedFromLast || columnsChangedFromLast;
    const incomingMappings = shouldPruneMappings
      ? pruneMappings(incomingRows, columnData, incomingMappingsRaw)
      : incomingMappingsRaw;

    lastIncomingRowsRef.current = incomingRows;
    lastIncomingMappingsRef.current = incomingMappingsRaw;
    lastIncomingColumnDataRef.current = columnData;

    if (isInternalRowEmitRef.current) {
      isInternalRowEmitRef.current = false;
      // Skip if parent echoed exactly what we emitted.
      if (incomingRows === currentRowDataRef.current && incomingMappings === currentMappingsRef.current) {
        return;
      }
    }

    // When the grid emits onDataChange, the parent typically produces a new
    // array ref (e.g., via mergeScopedMappings) that is semantically identical
    // to what we just committed.  Guard against this echo creating a spurious
    // second history entry so that a single user edit requires exactly one undo.
    if (isInternalMappingsEmitRef.current && !rowsChangedFromLast && !columnsChangedFromLast) {
      isInternalMappingsEmitRef.current = false;
      // Accept the parent's canonical ref as the new baseline without pushing
      // to history.  The grid keeps displaying M1 (already committed); the parent
      // holds M2, semantically equal.  Future external changes will be compared
      // against M2 (via lastIncomingMappingsRef which we already updated above).
      return;
    }
    isInternalMappingsEmitRef.current = false;

    const rowsChanged = incomingRows !== currentRowDataRef.current;
    const mappingsChanged = incomingMappings !== currentMappingsRef.current;
    if (!rowsChanged && !mappingsChanged) return;

    const snapshot = makeSnapshot(incomingRows, incomingMappings, 'external-sync');
    const currentSnapshot = historyRef.current[historyIndexRef.current]
      || makeSnapshot(currentRowDataRef.current, currentMappingsRef.current, 'current');
    const snapshotRowsChanged = currentSnapshot.rowData !== snapshot.rowData;
    // Compare mappings using only the tracked fields (mappingRowId, mappingColumnId,
    // mappingValue) so that extra parent-side fields like protocolId are ignored
    // and do not create spurious history entries.
    const snapshotMappingsChanged = currentSnapshot.mappings !== snapshot.mappings && (() => {
      const a = currentSnapshot.mappings;
      const b = snapshot.mappings;
      if (a.length !== b.length) return true;
      return a.some((aMapping, i) => {
        const bMapping = b[i];
        return (
          aMapping[fields.mappingRowId] !== bMapping[fields.mappingRowId] ||
          aMapping[fields.mappingColumnId] !== bMapping[fields.mappingColumnId] ||
          JSON.stringify(aMapping[fields.mappingValue]) !== JSON.stringify(bMapping[fields.mappingValue])
        );
      });
    })();

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
    makeSnapshot,
    maxHistorySize,
    fields.mappingRowId,
    fields.mappingColumnId,
    fields.mappingValue
  ]);

  const commitSnapshot = useCallback(({
    nextRowData,
    nextMappings,
    reason = 'edit',
    notifyRowData = true
  } = {}) => {
    const resolvedNextRows = nextRowData ?? currentRowDataRef.current;
    const resolvedNextMappings = nextMappings ?? currentMappingsRef.current;
    const rowChanged = resolvedNextRows !== currentRowDataRef.current
      && JSON.stringify(resolvedNextRows) !== JSON.stringify(currentRowDataRef.current);
    const mappingsChanged = resolvedNextMappings !== currentMappingsRef.current
      && JSON.stringify(resolvedNextMappings) !== JSON.stringify(currentMappingsRef.current);
    if (!rowChanged && !mappingsChanged) return false;

    const snapshot = makeSnapshot(
      resolvedNextRows,
      resolvedNextMappings,
      reason
    );

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

    if (notifyRowData && onRowDataChange && previousRows !== snapshot.rowData) {
      isInternalRowEmitRef.current = true;
      onRowDataChange(snapshot.rowData);
    }

    return rowChanged || mappingsChanged;
  }, [makeSnapshot, maxHistorySize, onRowDataChange]);

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

    if (onRowDataChange && previousRows !== snapshot.rowData) {
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
              const baseStyle = {};

              if (model?.isLastRunInStudy) {
                baseStyle['border-bottom'] = '3px solid black';
              }

              if (typeof mappingCellProperties !== 'function') {
                return Object.keys(baseStyle).length > 0 ? { style: baseStyle } : {};
              }

              const customCellProps = mappingCellProperties({
                ...props,
                row: model,
                column,
                columnId: column?.[fields.columnId],
                columnName: column?.[fields.columnName],
              }) || {};

              const customStyle = customCellProps?.style || {};

              return {
                ...customCellProps,
                style: {
                  ...baseStyle,
                  ...customStyle,
                }
              };
            }
          });
        }
      });
    }

    return columns;
  }, [columnData, staticColumns, fields, mappingCellProperties]);

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

  // Stable setter - wraps the mutable ref in a useCallback so the returned
  // reference never changes across renders.  DataGrid.jsx puts this in a
  // useCallback dep array; an inline arrow in the return literal would create
  // a new reference every render and cause onDataChangeTracked (and therefore
  // useGridMappingsEmitter's effect) to re-register on every render.
  const setInternalMappingsEmitted = useCallback((val) => {
    isInternalMappingsEmitRef.current = val;
  }, []); // ref never changes -> no deps needed

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
    sanitizeValue,
    setInternalMappingsEmitted
  };
};
