import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '../styles.css';
const MIN_COLUMN_WIDTH = 80;
const MAX_COLUMN_WIDTH = 1000;
function formatCellValue(value) {
    if (value === null || value === undefined)
        return '';
    if (typeof value === 'object') {
        if (Array.isArray(value)) {
            if (value.length > 0 && typeof value[0] === 'number') {
                return `[Vector dim=${value.length}]`;
            }
            return `[Array(${value.length})]`;
        }
        return JSON.stringify(value);
    }
    return String(value);
}
function handleCellCopy(e, value) {
    const selection = window.getSelection()?.toString();
    if (!selection)
        return;
    const strValue = formatCellValue(value);
    if (!strValue.includes('\n'))
        return;
    const selectionNoSpace = selection.replace(/\s+/g, '');
    const valueNoSpace = strValue.replace(/\s+/g, '');
    if (selectionNoSpace === valueNoSpace) {
        e.clipboardData.setData('text/plain', strValue);
        e.preventDefault();
        return;
    }
    const startIdx = valueNoSpace.indexOf(selectionNoSpace);
    if (startIdx !== -1) {
        const map = [];
        for (let i = 0; i < strValue.length; i++) {
            if (!/\s/.test(strValue[i])) {
                map.push(i);
            }
        }
        const originalStartIdx = map[startIdx];
        const originalEndIdx = map[startIdx + selectionNoSpace.length - 1];
        if (originalStartIdx !== undefined && originalEndIdx !== undefined) {
            const originalSubstring = strValue.substring(originalStartIdx, originalEndIdx + 1);
            e.clipboardData.setData('text/plain', originalSubstring);
            e.preventDefault();
        }
    }
}
function formatTooltipValue(value) {
    if (value === null || value === undefined)
        return '';
    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
    }
    return String(value);
}
function toFilterText(value) {
    if (value === null || value === undefined)
        return '';
    if (typeof value === 'string')
        return value.trim().toLowerCase();
    if (typeof value === 'object')
        return JSON.stringify(value).toLowerCase();
    return String(value).toLowerCase();
}
function toSortText(value) {
    if (value === null || value === undefined)
        return '';
    if (typeof value === 'string')
        return value;
    if (typeof value === 'object')
        return JSON.stringify(value);
    return String(value);
}
function compareValues(a, b) {
    const aIsNil = a === null || a === undefined;
    const bIsNil = b === null || b === undefined;
    if (aIsNil && bIsNil)
        return 0;
    if (aIsNil)
        return 1;
    if (bIsNil)
        return -1;
    if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
    }
    return toSortText(a).localeCompare(toSortText(b), undefined, {
        numeric: true,
        sensitivity: 'base'
    });
}
function formatDetailValue(value) {
    if (value === null || value === undefined)
        return '';
    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
    }
    return String(value);
}
export function DataTable({ data, loading, dbPath, tableName, pageSize, currentPage, onPageChange, onPageSizeChange }) {
    const [viewMode, setViewMode] = useState('row');
    const [density, setDensity] = useState('standard');
    const [columnWidths, setColumnWidths] = useState({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState({});
    const [sortBy, setSortBy] = useState(null);
    const [selectedRowOriginalIndex, setSelectedRowOriginalIndex] = useState(null);
    const [showColumnFilters, setShowColumnFilters] = useState(false);
    const [columnOrder, setColumnOrder] = useState([]);
    const [dropIndicatorIndex, setDropIndicatorIndex] = useState(null);
    const [draggingColumn, setDraggingColumn] = useState(null);
    const resizeRef = useRef(null);
    const colDragRef = useRef(null);
    const theadRef = useRef(null);
    // Always-current ref for orderedColumns — avoids stale closures in native event listeners
    const orderedColumnsRef = useRef([]);
    const handleResizeMouseMove = useCallback((event) => {
        const resizeState = resizeRef.current;
        if (!resizeState)
            return;
        const nextWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, resizeState.startWidth + event.clientX - resizeState.startX));
        setColumnWidths(prev => {
            if (prev[resizeState.column] === nextWidth)
                return prev;
            return { ...prev, [resizeState.column]: nextWidth };
        });
    }, []);
    const stopResize = useCallback(() => {
        resizeRef.current = null;
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', stopResize);
    }, [handleResizeMouseMove]);
    const startResize = useCallback((column, event) => {
        event.preventDefault();
        event.stopPropagation();
        const th = event.currentTarget.parentElement;
        if (!th)
            return;
        const startWidth = columnWidths[column] ?? th.getBoundingClientRect().width;
        resizeRef.current = { column, startX: event.clientX, startWidth };
        document.addEventListener('mousemove', handleResizeMouseMove);
        document.addEventListener('mouseup', stopResize);
    }, [columnWidths, handleResizeMouseMove, stopResize]);
    const resetColumnWidth = useCallback((column, event) => {
        event.preventDefault();
        event.stopPropagation();
        setColumnWidths(prev => {
            if (!(column in prev))
                return prev;
            const next = { ...prev };
            delete next[column];
            return next;
        });
    }, []);
    const setColumnFilter = useCallback((column, value) => {
        setColumnFilters(prev => ({ ...prev, [column]: value }));
    }, []);
    const clearFiltersAndSort = useCallback(() => {
        setGlobalFilter('');
        setColumnFilters({});
        setSortBy(null);
    }, []);
    const toggleSort = useCallback((column) => {
        setSortBy(prev => {
            if (!prev || prev.column !== column) {
                return { column, direction: 'asc' };
            }
            if (prev.direction === 'asc') {
                return { column, direction: 'desc' };
            }
            return null;
        });
    }, []);
    // Load preferences
    useEffect(() => {
        if (!dbPath || !tableName)
            return;
        const key = `ldb-view-${dbPath}::${tableName}`;
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.viewMode)
                    setViewMode(parsed.viewMode);
                if (parsed.density)
                    setDensity(parsed.density);
                if (parsed.columnWidths && typeof parsed.columnWidths === 'object') {
                    const validWidths = Object.entries(parsed.columnWidths).reduce((acc, [col, width]) => {
                        if (typeof width === 'number' && Number.isFinite(width)) {
                            acc[col] = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width));
                        }
                        return acc;
                    }, {});
                    setColumnWidths(validWidths);
                }
                else {
                    setColumnWidths({});
                }
            }
            else {
                // Reset to defaults if no preference found (e.g. new table)
                setViewMode('row');
                setDensity('standard');
                setColumnWidths({});
                setColumnOrder([]);
            }
        }
        catch (e) {
            console.warn('Failed to load view preferences', e);
        }
        // Reset data interaction states per table to avoid stale context.
        setGlobalFilter('');
        setColumnFilters({});
        setSortBy(null);
        setSelectedRowOriginalIndex(null);
        setShowColumnFilters(false);
    }, [dbPath, tableName]);
    // Save preferences
    useEffect(() => {
        if (!dbPath || !tableName)
            return;
        const key = `ldb-view-${dbPath}::${tableName}`;
        try {
            localStorage.setItem(key, JSON.stringify({ viewMode, density, columnWidths, columnOrder }));
        }
        catch (e) {
            console.warn('Failed to save view preferences', e);
        }
    }, [viewMode, density, columnWidths, columnOrder, dbPath, tableName]);
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleResizeMouseMove);
            document.removeEventListener('mouseup', stopResize);
        };
    }, [handleResizeMouseMove, stopResize]);
    useEffect(() => {
        if (selectedRowOriginalIndex === null)
            return;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setSelectedRowOriginalIndex(null);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedRowOriginalIndex]);
    const orderedColumns = useMemo(() => {
        if (!data)
            return [];
        const baseColumns = data.columns;
        if (!columnOrder || columnOrder.length === 0)
            return baseColumns;
        // Preserve only the saved columns that still exist in the data
        const validOrder = columnOrder.filter(c => baseColumns.includes(c));
        // Find any new columns that aren't in the saved order
        const newColumns = baseColumns.filter(c => !validOrder.includes(c));
        return [...validOrder, ...newColumns];
    }, [data, columnOrder]);
    // Keep orderedColumnsRef in sync so native event listeners always see latest columns
    useEffect(() => {
        orderedColumnsRef.current = orderedColumns;
    }, [orderedColumns]);
    const wrappedRows = useMemo(() => {
        if (!data)
            return [];
        return data.rows.map((row, index) => ({ row, originalIndex: index }));
    }, [data]);
    const normalizedGlobalFilter = globalFilter.trim().toLowerCase();
    const activeColumnFilters = useMemo(() => {
        return Object.entries(columnFilters)
            .map(([column, value]) => [column, value.trim().toLowerCase()])
            .filter(([, value]) => value.length > 0);
    }, [columnFilters]);
    const filteredRows = useMemo(() => {
        if (!data)
            return [];
        return wrappedRows.filter(({ row }) => {
            if (normalizedGlobalFilter) {
                const matchesGlobal = orderedColumns.some(column => {
                    return toFilterText(row[column]).includes(normalizedGlobalFilter);
                });
                if (!matchesGlobal)
                    return false;
            }
            if (activeColumnFilters.length > 0) {
                for (const [column, filterText] of activeColumnFilters) {
                    if (!toFilterText(row[column]).includes(filterText)) {
                        return false;
                    }
                }
            }
            return true;
        });
    }, [data, wrappedRows, normalizedGlobalFilter, activeColumnFilters]);
    const sortedRows = useMemo(() => {
        if (!sortBy)
            return filteredRows;
        const direction = sortBy.direction === 'asc' ? 1 : -1;
        const nextRows = [...filteredRows];
        nextRows.sort((a, b) => direction * compareValues(a.row[sortBy.column], b.row[sortBy.column]));
        return nextRows;
    }, [filteredRows, sortBy]);
    const selectedRow = useMemo(() => {
        if (!data || selectedRowOriginalIndex === null)
            return null;
        return data.rows[selectedRowOriginalIndex] ?? null;
    }, [data, selectedRowOriginalIndex]);
    // ---- Mouse-event based column drag ----
    // All handlers defined inline inside startColDrag to share a single closure
    // and avoid the stale-closure bug of useCallback with state deps.
    const getDropIndexFromX = useCallback((clientX) => {
        if (!theadRef.current)
            return -1;
        const ths = Array.from(theadRef.current.querySelectorAll('th.resizable-th'));
        for (let i = 0; i < ths.length; i++) {
            const rect = ths[i].getBoundingClientRect();
            const mid = rect.left + rect.width / 2;
            if (clientX < mid)
                return i;
        }
        return ths.length;
    }, []);
    const startColDrag = useCallback((column, e) => {
        e.preventDefault();
        e.stopPropagation();
        colDragRef.current = { column, startX: e.clientX, dragging: false, dropIdx: -1 };
        const onMouseMove = (ev) => {
            const state = colDragRef.current;
            if (!state)
                return;
            if (!state.dragging && Math.abs(ev.clientX - state.startX) > 5) {
                state.dragging = true;
                setDraggingColumn(state.column);
            }
            if (state.dragging) {
                const idx = getDropIndexFromX(ev.clientX);
                state.dropIdx = idx; // write to ref directly — no stale closure
                setDropIndicatorIndex(idx);
            }
        };
        const onMouseUp = (_ev) => {
            const state = colDragRef.current;
            if (state?.dragging && state.dropIdx >= 0) {
                // Read orderedColumnsRef for always-current column list
                const cols = orderedColumnsRef.current;
                const fromIdx = cols.indexOf(state.column);
                const rawTo = state.dropIdx;
                const toIdx = rawTo > fromIdx ? rawTo - 1 : rawTo;
                if (fromIdx !== -1 && toIdx !== fromIdx) {
                    const newOrder = [...cols];
                    newOrder.splice(fromIdx, 1);
                    newOrder.splice(toIdx, 0, state.column);
                    setColumnOrder(newOrder);
                }
            }
            colDragRef.current = null;
            setDropIndicatorIndex(null);
            setDraggingColumn(null);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [getDropIndexFromX]);
    const handleResetColumnOrder = useCallback(() => {
        setColumnOrder([]);
    }, []);
    // Derive active drag column for styling from state (not ref, so re-renders correctly)
    const activeDragColumn = draggingColumn;
    const hasActiveColumnFilters = activeColumnFilters.length > 0;
    const hasActiveFilterOrSort = normalizedGlobalFilter.length > 0 || hasActiveColumnFilters || sortBy !== null;
    if (loading) {
        return _jsx("div", { children: "Loading data..." });
    }
    if (!data) {
        return _jsx("div", { style: { padding: 20, opacity: 0.6 }, children: "No data loaded." });
    }
    const isCompact = density === 'compact';
    const displayedRowCount = viewMode === 'row' ? sortedRows.length : data.rows.length;
    return (_jsxs("div", { className: `data-table-wrapper ${isCompact ? 'compact' : ''}`, children: [_jsxs("div", { className: "data-toolbar", children: [_jsxs("div", { className: "toolbar-group", children: [_jsx("span", { className: "toolbar-label", children: "View:" }), _jsx("button", { className: `icon-btn ${viewMode === 'row' ? 'active' : ''}`, onClick: () => setViewMode('row'), title: "Row View", children: "Row" }), _jsx("button", { className: `icon-btn ${viewMode === 'column' ? 'active' : ''}`, onClick: () => setViewMode('column'), title: "Column View", children: "Column" })] }), _jsxs("div", { className: "toolbar-group", children: [_jsx("span", { className: "toolbar-label", children: "Density:" }), _jsx("button", { className: `icon-btn ${density === 'standard' ? 'active' : ''}`, onClick: () => setDensity('standard'), title: "Standard Density", children: "Standard" }), _jsx("button", { className: `icon-btn ${density === 'compact' ? 'active' : ''}`, onClick: () => setDensity('compact'), title: "Compact Density", children: "Compact" })] }), _jsxs("div", { className: "toolbar-group", children: [_jsx("span", { className: "toolbar-label", children: "Rows/page:" }), _jsxs("select", { className: "page-size-select", value: pageSize, onChange: (e) => onPageSizeChange(Number(e.target.value)), "aria-label": "Rows per page", children: [_jsx("option", { value: 100, children: "100" }), _jsx("option", { value: 500, children: "500" }), _jsx("option", { value: 1000, children: "1000" })] })] }), viewMode === 'row' && (_jsxs("div", { className: "toolbar-group toolbar-group-grow", children: [_jsx("input", { className: "global-filter-input", type: "text", value: globalFilter, onChange: (event) => setGlobalFilter(event.target.value), placeholder: "Search all columns...", "aria-label": "Global row filter" }), _jsx("button", { className: `icon-btn ${showColumnFilters ? 'active' : ''}`, onClick: () => setShowColumnFilters(prev => !prev), title: "Toggle column filters", children: "Filters" }), _jsx("button", { className: "icon-btn", onClick: clearFiltersAndSort, disabled: !hasActiveFilterOrSort, title: "Clear all filters and sorting", children: "Clear" }), _jsx("button", { className: "icon-btn", onClick: handleResetColumnOrder, disabled: columnOrder.length === 0, title: "Reset column order to default", children: "Reset Order" }), _jsxs("div", { className: "filter-match-count", children: [sortedRows.length, "/", data.rows.length] })] }))] }), viewMode === 'row' && showColumnFilters && (_jsx("div", { className: "column-filter-panel", children: _jsx("div", { className: "column-filter-grid", children: orderedColumns.map((column) => (_jsxs("label", { className: "column-filter-item", children: [_jsx("span", { title: column, children: column }), _jsx("input", { type: "text", value: columnFilters[column] ?? '', onChange: (event) => setColumnFilter(column, event.target.value), placeholder: `Filter ${column}`, "aria-label": `Filter column ${column}` })] }, column))) }) })), _jsx("div", { className: "data-table-container", children: viewMode === 'row' ? (_jsxs("table", { children: [_jsx("thead", { ref: theadRef, children: _jsxs("tr", { style: { position: 'relative' }, children: [orderedColumns.map((col, colIdx) => {
                                        const width = columnWidths[col];
                                        const style = width
                                            ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }
                                            : undefined;
                                        const isSorted = sortBy?.column === col;
                                        const ariaSort = isSorted ? (sortBy?.direction === 'asc' ? 'ascending' : 'descending') : 'none';
                                        const isBeingDragged = activeDragColumn === col;
                                        return (_jsxs("th", { className: `resizable-th${isBeingDragged ? ' col-dragging' : ''}`, style: style, "aria-sort": ariaSort, children: [dropIndicatorIndex === colIdx && (_jsx("span", { className: "col-drop-indicator" })), _jsxs("div", { className: "th-inner", children: [_jsx("span", { className: "col-drag-handle", onMouseDown: (e) => startColDrag(col, e), title: "Drag to reorder column", children: "\u283F" }), _jsxs("div", { role: "button", tabIndex: 0, className: `th-sort-button ${isSorted ? 'active' : ''}`, onClick: () => toggleSort(col), onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ')
                                                                toggleSort(col); }, title: "Click to sort", children: [_jsx("span", { className: "th-label", title: col, children: col }), _jsx("span", { className: "sort-indicator", "aria-hidden": "true", children: isSorted ? (sortBy?.direction === 'asc' ? 'ASC' : 'DESC') : '--' })] }), _jsx("div", { className: "column-resize-handle", onMouseDown: (event) => startResize(col, event), onDoubleClick: (event) => resetColumnWidth(col, event), title: "Drag to resize, double-click to reset" })] })] }, col));
                                    }), dropIndicatorIndex === orderedColumns.length && (_jsx("th", { style: { position: 'relative', width: 0, padding: 0, border: 'none' }, children: _jsx("span", { className: "col-drop-indicator" }) })), _jsx("th", { className: "row-action-header", children: "Actions" })] }) }), _jsxs("tbody", { children: [sortedRows.map(({ row, originalIndex }) => (_jsxs("tr", { children: [orderedColumns.map(col => {
                                            const width = columnWidths[col];
                                            const style = width
                                                ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }
                                                : undefined;
                                            return (_jsx("td", { title: formatTooltipValue(row[col]), style: style, children: _jsx("div", { className: "cell-content", onCopy: (e) => handleCellCopy(e, row[col]), children: formatCellValue(row[col]) }) }, `${originalIndex}-${col}`));
                                        }), _jsx("td", { className: "row-action-cell", children: _jsx("button", { className: "row-details-btn", onClick: () => setSelectedRowOriginalIndex(originalIndex), children: "Details" }) })] }, originalIndex))), sortedRows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: orderedColumns.length + 1, style: { textAlign: 'center' }, children: data.rows.length === 0 ? 'No data (or empty table)' : 'No matching rows' }) }))] })] })) : (_jsxs("div", { className: "transposed-grid", children: [data.rows.length > 0 && (_jsxs("div", { className: "transposed-row header-row", children: [_jsx("div", { className: "transposed-header spacer", children: "Field" }), data.rows.map((_, i) => (_jsxs("div", { className: "transposed-cell header-cell", children: ["Row ", i + 1] }, `idx-${i}`)))] })), orderedColumns.map(col => (_jsxs("div", { className: "transposed-row", children: [_jsx("div", { className: "transposed-header", title: col, children: _jsx("div", { className: "cell-content", children: col }) }), data.rows.map((row, i) => (_jsx("div", { className: "transposed-cell", title: formatTooltipValue(row[col]), children: _jsx("div", { className: "cell-content", onCopy: (e) => handleCellCopy(e, row[col]), children: formatCellValue(row[col]) }) }, `${i}-${col}`))), data.rows.length === 0 && _jsx("div", { className: "transposed-cell", style: { fontStyle: 'italic', opacity: 0.5 }, children: "Empty" })] }, col)))] })) }), _jsxs("div", { className: "data-footer", children: [_jsxs("span", { className: "data-footer-count", children: ["Showing ", displayedRowCount, " loaded rows. Total rows: ", data.totalRows] }), data.totalRows > pageSize && (_jsxs("div", { className: "pagination-controls", children: [_jsx("button", { className: "icon-btn", onClick: () => onPageChange(currentPage - 1), disabled: currentPage === 0, title: "Previous page", children: "\u2039 Prev" }), _jsxs("span", { className: "page-indicator", children: ["Page ", currentPage + 1, " / ", Math.ceil(data.totalRows / pageSize)] }), _jsx("button", { className: "icon-btn", onClick: () => onPageChange(currentPage + 1), disabled: (currentPage + 1) * pageSize >= data.totalRows, title: "Next page", children: "Next \u203A" })] }))] }), selectedRow && (_jsx("div", { className: "row-detail-overlay", onClick: () => setSelectedRowOriginalIndex(null), children: _jsxs("aside", { className: "row-detail-panel", onClick: (event) => event.stopPropagation(), children: [_jsxs("div", { className: "row-detail-header", children: [_jsxs("div", { children: [_jsx("h3", { children: "Row Details" }), _jsxs("div", { className: "row-detail-subtitle", children: ["Loaded row #", selectedRowOriginalIndex !== null ? selectedRowOriginalIndex + 1 : ''] })] }), _jsx("button", { className: "row-detail-close", onClick: () => setSelectedRowOriginalIndex(null), children: "Close" })] }), _jsx("div", { className: "row-detail-body", children: orderedColumns.map((column) => (_jsxs("div", { className: "row-detail-item", children: [_jsx("div", { className: "row-detail-key", title: column, children: column }), _jsx("pre", { className: "row-detail-value", children: formatDetailValue(selectedRow[column]) })] }, column))) })] }) }))] }));
}
