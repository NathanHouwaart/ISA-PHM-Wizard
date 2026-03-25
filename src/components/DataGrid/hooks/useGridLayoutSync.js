import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function updateColumnSize(columns, targetProp, nextSize) {
    return (columns || []).map((column) => {
        if (column.prop === targetProp) {
            return { ...column, size: nextSize };
        }

        if (column.children && Array.isArray(column.children)) {
            const children = column.children.map((child) => (
                child.prop === targetProp ? { ...child, size: nextSize } : child
            ));
            return { ...column, children };
        }

        return column;
    });
}

function areColumnsEquivalent(nextColumn, previousColumn) {
    if (!nextColumn || !previousColumn) {
        return false;
    }

    const comparableKeys = [
        'prop',
        'size',
        'name',
        'pin',
        'readonly',
        'columnType',
        'labelKey',
        'valueKey',
        'editor'
    ];

    const hasScalarDifference = comparableKeys.some((key) => (
        nextColumn[key] !== previousColumn[key]
    ));

    if (hasScalarDifference) {
        return false;
    }

    // Include function/reference fields so dynamic styling callbacks
    // (e.g. duplicate-cell highlighting) can update without requiring
    // a full page refresh.
    if (nextColumn.cellProperties !== previousColumn.cellProperties) return false;
    if (nextColumn.cellTemplate !== previousColumn.cellTemplate) return false;
    if (nextColumn.source !== previousColumn.source) return false;

    const nextChildren = Array.isArray(nextColumn.children) ? nextColumn.children : [];
    const previousChildren = Array.isArray(previousColumn.children) ? previousColumn.children : [];

    if (nextChildren.length !== previousChildren.length) {
        return false;
    }

    for (let index = 0; index < nextChildren.length; index++) {
        if (!areColumnsEquivalent(nextChildren[index], previousChildren[index])) {
            return false;
        }
    }

    return true;
}

export default function useGridLayoutSync({
    columnDefs = [],
    hookRowData = [],
    updateRowDataBatch,
    showDebug = false
}) {
    const DBG = !!showDebug;
    const [columnSizes, setColumnSizes] = useState(() => new Map());
    const columnSizesRef = useRef(columnSizes);
    const gridRef = useRef();
    const [gridKey] = useState(0);

    const enhancedColumnDefs = useMemo(() => {
        const sizesMap = columnSizesRef.current || columnSizes;
        return columnDefs.map((column) => {
            const savedSize = sizesMap.get(column.prop);
            const finalSize = savedSize || column.size || 150;

            if (column.children && Array.isArray(column.children)) {
                const children = column.children.map((child) => {
                    const childSaved = sizesMap.get(child.prop);
                    const childSize = childSaved || child.size || 100;
                    return { ...child, size: childSize };
                });
                return { ...column, size: finalSize, children };
            }

            return { ...column, size: finalSize };
        });
    }, [columnDefs, columnSizes]);

    const [appliedColumns, setAppliedColumns] = useState(enhancedColumnDefs);
    const stableColumnDefs = useRef(enhancedColumnDefs);
    const lastEnhancedColumnsRef = useRef(enhancedColumnDefs);

    const setGridRef = useCallback((node) => {
        if (!node) {
            gridRef.current = null;
            return;
        }

        if (node instanceof HTMLElement && node.tagName?.toLowerCase() === 'revo-grid') {
            gridRef.current = node;
        } else if (node && node.element instanceof HTMLElement) {
            gridRef.current = node.element;
        } else if (node && node.el instanceof HTMLElement) {
            gridRef.current = node.el;
        } else {
            gridRef.current = node;
        }
    }, []);

    useEffect(() => {
        const gridElement = gridRef.current;
        if (!gridElement) {
            return undefined;
        }

        const handleResize = (event) => {
            const detail = event.detail || {};
            const columnKeys = Object.keys(detail);
            if (columnKeys.length === 0) {
                return;
            }

            const column = detail[columnKeys[0]];
            if (!(column && column.prop && column.size)) {
                return;
            }

            setColumnSizes((prev) => {
                const newSizes = new Map(prev);
                newSizes.set(column.prop, column.size);
                columnSizesRef.current = newSizes;
                return newSizes;
            });

            setAppliedColumns((prevColumns) => {
                const updated = updateColumnSize(prevColumns, column.prop, column.size);
                stableColumnDefs.current = updated;
                lastEnhancedColumnsRef.current = updated;
                return updated;
            });
        };

        const eventNames = ['aftercolumnresize', 'columnresize', 'aftercolumnsresize'];
        eventNames.forEach((eventName) => {
            gridElement.addEventListener(eventName, handleResize);
        });

        return () => {
            eventNames.forEach((eventName) => {
                gridElement.removeEventListener(eventName, handleResize);
            });
        };
    }, []);

    useEffect(() => {
        const gridElement = gridRef.current;

        const handleDeleteRequest = (event) => {
            try {
                const { rowIndex, rowId } = event.detail || {};

                const hasRowId = rowId !== undefined && rowId !== null;
                const hasRowIndex = Number.isInteger(rowIndex)
                    && rowIndex >= 0
                    && rowIndex < hookRowData.length;

                if (!hasRowId && !hasRowIndex) {
                    return;
                }

                let newData = hookRowData;
                if (hasRowId) {
                    newData = hookRowData.filter((row) => row.id !== rowId);
                } else if (hasRowIndex) {
                    newData = hookRowData.filter((_, index) => index !== rowIndex);
                }

                if (newData.length !== hookRowData.length) {
                    updateRowDataBatch(newData);
                }
            } catch (error) {
                console.error('Error handling deleteRow event', error);
            }
        };

        if (gridElement) {
            gridElement.addEventListener('deleteRow', handleDeleteRequest);
        }
        document.addEventListener('deleteRow', handleDeleteRequest);

        return () => {
            if (gridElement) {
                gridElement.removeEventListener('deleteRow', handleDeleteRequest);
            }
            document.removeEventListener('deleteRow', handleDeleteRequest);
        };
    }, [hookRowData, updateRowDataBatch]);

    useEffect(() => {
        const gridElement = gridRef.current;
        if (!gridElement) {
            return undefined;
        }

        let boundaryReachedTime = 0;
        const BOUNDARY_DELAY = 200;

        const handleCellWheel = (event) => {
            const cell = event.target.closest('.rgCell');
            if (!cell) return;

            const isScrollable = cell.scrollHeight > cell.clientHeight;
            if (!isScrollable) return;

            const { scrollTop, scrollHeight, clientHeight } = cell;
            const atTop = scrollTop <= 0;
            const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
            const scrollingDown = event.deltaY > 0;
            const scrollingUp = event.deltaY < 0;
            const atBoundary = (scrollingDown && atBottom) || (scrollingUp && atTop);

            if (atBoundary) {
                const now = Date.now();
                if (boundaryReachedTime === 0) {
                    boundaryReachedTime = now;
                }

                const timeSinceBoundary = now - boundaryReachedTime;
                if (timeSinceBoundary < BOUNDARY_DELAY) {
                    event.stopPropagation();
                }
            } else {
                event.stopPropagation();
                boundaryReachedTime = 0;
            }
        };

        gridElement.addEventListener('wheel', handleCellWheel, { capture: true, passive: false });

        return () => {
            gridElement.removeEventListener('wheel', handleCellWheel, { capture: true });
        };
    }, []);

    useEffect(() => {
        const columnsChanged = enhancedColumnDefs.length !== lastEnhancedColumnsRef.current.length
            || enhancedColumnDefs.some((column, index) => {
                const lastColumn = lastEnhancedColumnsRef.current[index];
                return !areColumnsEquivalent(column, lastColumn);
            });

        if (!columnsChanged) {
            return;
        }

        const sizesMap = columnSizesRef.current || new Map();
        const merged = enhancedColumnDefs.map((column) => {
            const saved = sizesMap.get(column.prop);
            if (saved && saved !== column.size) {
                return { ...column, size: saved };
            }
            return column;
        });

        setAppliedColumns(merged);
        stableColumnDefs.current = merged;
        lastEnhancedColumnsRef.current = merged;
    }, [enhancedColumnDefs]);

    const getFlatColumns = useCallback(() => {
        const colPinStart = [];
        const rgCol = [];
        const colPinEnd = [];

        (stableColumnDefs.current || []).forEach((column) => {
            if (column && column.children) {
                column.children.forEach((child) => {
                    if (child.pin === 'colPinStart') {
                        colPinStart.push(child);
                    } else if (child.pin === 'colPinEnd') {
                        colPinEnd.push(child);
                    } else {
                        rgCol.push(child);
                    }
                });
            } else if (column) {
                if (column.pin === 'colPinStart') {
                    colPinStart.push(column);
                } else if (column.pin === 'colPinEnd') {
                    colPinEnd.push(column);
                } else {
                    rgCol.push(column);
                }
            }
        });

        return [...colPinStart, ...rgCol, ...colPinEnd];
    }, []);

    const translateRangeCoordinates = useCallback((range) => {
        if (DBG) console.log('[DataGrid] translateRangeCoordinates input:', range);

        if (!range || !range.colType || (range.x === undefined && range.y === undefined)) {
            if (DBG) console.log('[DataGrid] No colType or coordinates, returning range as-is');
            return range;
        }

        const flatCols = getFlatColumns();
        if (DBG) console.log('[DataGrid] flatCols:', flatCols.map((col) => ({ prop: col.prop, pin: col.pin })));

        let offset = 0;
        const colTypeOrder = ['colPinStart', 'rgCol', 'colPinEnd'];
        const currentTypeIndex = colTypeOrder.indexOf(range.colType);
        if (DBG) console.log('[DataGrid] colType:', range.colType, 'currentTypeIndex:', currentTypeIndex);

        if (currentTypeIndex < 0) {
            if (DBG) console.log('[DataGrid] colType not in standard order, returning as-is');
            return range;
        }

        for (let index = 0; index < currentTypeIndex; index++) {
            const colType = colTypeOrder[index];
            const colsOfType = flatCols.filter((col) => (
                colType === 'rgCol' ? !col.pin : col.pin === colType
            ));
            if (DBG) console.log('[DataGrid] colType', colType, 'has', colsOfType.length, 'columns');
            offset += colsOfType.length;
        }

        const translated = {
            ...range,
            x: range.x + offset,
            x1: range.x1 + offset
        };

        if (DBG) {
            console.log('[DataGrid] Translated coordinates:', {
                original: { x: range.x, x1: range.x1 },
                offset,
                translated: { x: translated.x, x1: translated.x1 }
            });
        }

        return translated;
    }, [getFlatColumns, DBG]);

    return {
        gridRef,
        setGridRef,
        gridKey,
        appliedColumns,
        stableColumnDefs,
        getFlatColumns,
        translateRangeCoordinates
    };
}
