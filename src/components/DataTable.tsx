import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { TableData } from '../lib/types';
import '../styles.css';

interface DataTableProps {
    data: TableData | null;
    loading: boolean;
    dbPath: string;
    tableName: string;
    pageSize: number;
    currentPage: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

type ViewMode = 'row' | 'column';
type Density = 'standard' | 'compact';
type SortDirection = 'asc' | 'desc';
type ColumnWidths = Record<string, number>;
type ColumnOrder = string[];

type SortBy = {
    column: string;
    direction: SortDirection;
} | null;

interface ResizeState {
    column: string;
    startX: number;
    startWidth: number;
}

interface ColDragState {
    column: string;
    startX: number;
    dragging: boolean;
    dropIdx: number;  // stored in ref to avoid stale closure
}

interface WrappedRow {
    originalIndex: number;
    row: Record<string, unknown>;
}

const MIN_COLUMN_WIDTH = 80;
const MAX_COLUMN_WIDTH = 1000;

function formatCellValue(value: unknown): string {
    if (value === null || value === undefined) return '';
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

function handleCellCopy(e: React.ClipboardEvent<HTMLDivElement>, value: unknown) {
    const selection = window.getSelection()?.toString();
    if (!selection) return;

    const strValue = formatCellValue(value);
    if (!strValue.includes('\n')) return;

    const selectionNoSpace = selection.replace(/\s+/g, '');
    const valueNoSpace = strValue.replace(/\s+/g, '');

    if (selectionNoSpace === valueNoSpace) {
        e.clipboardData.setData('text/plain', strValue);
        e.preventDefault();
        return;
    }

    const startIdx = valueNoSpace.indexOf(selectionNoSpace);
    if (startIdx !== -1) {
        const map: number[] = [];
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

function formatTooltipValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
    }
    return String(value);
}

function toFilterText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim().toLowerCase();
    if (typeof value === 'object') return JSON.stringify(value).toLowerCase();
    return String(value).toLowerCase();
}

function toSortText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function compareValues(a: unknown, b: unknown): number {
    const aIsNil = a === null || a === undefined;
    const bIsNil = b === null || b === undefined;

    if (aIsNil && bIsNil) return 0;
    if (aIsNil) return 1;
    if (bIsNil) return -1;

    if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
    }

    return toSortText(a).localeCompare(toSortText(b), undefined, {
        numeric: true,
        sensitivity: 'base'
    });
}

function formatDetailValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
    }
    return String(value);
}

export function DataTable({ data, loading, dbPath, tableName, pageSize, currentPage, onPageChange, onPageSizeChange }: DataTableProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('row');
    const [density, setDensity] = useState<Density>('standard');
    const [columnWidths, setColumnWidths] = useState<ColumnWidths>({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [sortBy, setSortBy] = useState<SortBy>(null);
    const [selectedRowOriginalIndex, setSelectedRowOriginalIndex] = useState<number | null>(null);
    const [showColumnFilters, setShowColumnFilters] = useState(false);
    const [columnOrder, setColumnOrder] = useState<ColumnOrder>([]);
    const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
    const [draggingColumn, setDraggingColumn] = useState<string | null>(null);
    const resizeRef = useRef<ResizeState | null>(null);
    const colDragRef = useRef<ColDragState | null>(null);
    const theadRef = useRef<HTMLTableSectionElement | null>(null);
    // Always-current ref for orderedColumns — avoids stale closures in native event listeners
    const orderedColumnsRef = useRef<string[]>([]);

    const handleResizeMouseMove = useCallback((event: MouseEvent) => {
        const resizeState = resizeRef.current;
        if (!resizeState) return;
        const nextWidth = Math.max(
            MIN_COLUMN_WIDTH,
            Math.min(MAX_COLUMN_WIDTH, resizeState.startWidth + event.clientX - resizeState.startX)
        );
        setColumnWidths(prev => {
            if (prev[resizeState.column] === nextWidth) return prev;
            return { ...prev, [resizeState.column]: nextWidth };
        });
    }, []);

    const stopResize = useCallback(() => {
        resizeRef.current = null;
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', stopResize);
    }, [handleResizeMouseMove]);

    const startResize = useCallback((column: string, event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const th = event.currentTarget.parentElement as HTMLElement | null;
        if (!th) return;
        const startWidth = columnWidths[column] ?? th.getBoundingClientRect().width;
        resizeRef.current = { column, startX: event.clientX, startWidth };
        document.addEventListener('mousemove', handleResizeMouseMove);
        document.addEventListener('mouseup', stopResize);
    }, [columnWidths, handleResizeMouseMove, stopResize]);

    const resetColumnWidth = useCallback((column: string, event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setColumnWidths(prev => {
            if (!(column in prev)) return prev;
            const next = { ...prev };
            delete next[column];
            return next;
        });
    }, []);

    const setColumnFilter = useCallback((column: string, value: string) => {
        setColumnFilters(prev => ({ ...prev, [column]: value }));
    }, []);

    const clearFiltersAndSort = useCallback(() => {
        setGlobalFilter('');
        setColumnFilters({});
        setSortBy(null);
    }, []);

    const toggleSort = useCallback((column: string) => {
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
        if (!dbPath || !tableName) return;
        const key = `ldb-view-${dbPath}::${tableName}`;
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.viewMode) setViewMode(parsed.viewMode);
                if (parsed.density) setDensity(parsed.density);
                if (parsed.columnOrder) setColumnOrder(parsed.columnOrder);
                if (parsed.columnWidths && typeof parsed.columnWidths === 'object') {
                    const validWidths = Object.entries(parsed.columnWidths).reduce<ColumnWidths>((acc, [col, width]) => {
                        if (typeof width === 'number' && Number.isFinite(width)) {
                            acc[col] = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width));
                        }
                        return acc;
                    }, {});
                    setColumnWidths(validWidths);
                } else {
                    setColumnWidths({});
                }
            } else {
                // Reset to defaults if no preference found (e.g. new table)
                setViewMode('row');
                setDensity('standard');
                setColumnWidths({});
                setColumnOrder([]);
            }
        } catch (e) {
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
        if (!dbPath || !tableName) return;
        const key = `ldb-view-${dbPath}::${tableName}`;
        try {
            localStorage.setItem(key, JSON.stringify({ viewMode, density, columnWidths, columnOrder }));
        } catch (e) {
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
        if (selectedRowOriginalIndex === null) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSelectedRowOriginalIndex(null);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedRowOriginalIndex]);

    const orderedColumns = useMemo(() => {
        if (!data) return [];
        const baseColumns = data.columns;
        if (!columnOrder || columnOrder.length === 0) return baseColumns;

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

    const wrappedRows = useMemo<WrappedRow[]>(() => {
        if (!data) return [];
        return data.rows.map((row, index) => ({ row, originalIndex: index }));
    }, [data]);

    const normalizedGlobalFilter = globalFilter.trim().toLowerCase();

    const activeColumnFilters = useMemo(() => {
        return Object.entries(columnFilters)
            .map(([column, value]) => [column, value.trim().toLowerCase()] as const)
            .filter(([, value]) => value.length > 0);
    }, [columnFilters]);

    const filteredRows = useMemo(() => {
        if (!data) return [];
        return wrappedRows.filter(({ row }) => {
            if (normalizedGlobalFilter) {
                const matchesGlobal = orderedColumns.some(column => {
                    return toFilterText(row[column]).includes(normalizedGlobalFilter);
                });
                if (!matchesGlobal) return false;
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
        if (!sortBy) return filteredRows;
        const direction = sortBy.direction === 'asc' ? 1 : -1;
        const nextRows = [...filteredRows];
        nextRows.sort((a, b) => direction * compareValues(a.row[sortBy.column], b.row[sortBy.column]));
        return nextRows;
    }, [filteredRows, sortBy]);

    const selectedRow = useMemo(() => {
        if (!data || selectedRowOriginalIndex === null) return null;
        return data.rows[selectedRowOriginalIndex] ?? null;
    }, [data, selectedRowOriginalIndex]);

    // ---- Mouse-event based column drag ----
    // All handlers defined inline inside startColDrag to share a single closure
    // and avoid the stale-closure bug of useCallback with state deps.
    const getDropIndexFromX = useCallback((clientX: number): number => {
        if (!theadRef.current) return -1;
        const ths = Array.from(theadRef.current.querySelectorAll('th.resizable-th'));
        for (let i = 0; i < ths.length; i++) {
            const rect = ths[i].getBoundingClientRect();
            const mid = rect.left + rect.width / 2;
            if (clientX < mid) return i;
        }
        return ths.length;
    }, []);

    const startColDrag = useCallback((column: string, e: React.MouseEvent<HTMLSpanElement>) => {
        e.preventDefault();
        e.stopPropagation();
        colDragRef.current = { column, startX: e.clientX, dragging: false, dropIdx: -1 };

        const onMouseMove = (ev: MouseEvent) => {
            const state = colDragRef.current;
            if (!state) return;
            if (!state.dragging && Math.abs(ev.clientX - state.startX) > 5) {
                state.dragging = true;
                setDraggingColumn(state.column);
            }
            if (state.dragging) {
                const idx = getDropIndexFromX(ev.clientX);
                state.dropIdx = idx;  // write to ref directly — no stale closure
                setDropIndicatorIndex(idx);
            }
        };

        const onMouseUp = (_ev: MouseEvent) => {
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
        return <div>Loading data...</div>;
    }

    if (!data) {
        return <div style={{ padding: 20, opacity: 0.6 }}>No data loaded.</div>;
    }

    const isCompact = density === 'compact';
    const displayedRowCount = viewMode === 'row' ? sortedRows.length : data.rows.length;

    return (
        <div className={`data-table-wrapper ${isCompact ? 'compact' : ''}`}>
            <div className="data-toolbar">
                <div className="toolbar-group">
                    <span className="toolbar-label">View:</span>
                    <button
                        className={`icon-btn ${viewMode === 'row' ? 'active' : ''}`}
                        onClick={() => setViewMode('row')}
                        title="Row View"
                    >
                        Row
                    </button>
                    <button
                        className={`icon-btn ${viewMode === 'column' ? 'active' : ''}`}
                        onClick={() => setViewMode('column')}
                        title="Column View"
                    >
                        Column
                    </button>
                </div>
                <div className="toolbar-group">
                    <span className="toolbar-label">Density:</span>
                    <button
                        className={`icon-btn ${density === 'standard' ? 'active' : ''}`}
                        onClick={() => setDensity('standard')}
                        title="Standard Density"
                    >
                        Standard
                    </button>
                    <button
                        className={`icon-btn ${density === 'compact' ? 'active' : ''}`}
                        onClick={() => setDensity('compact')}
                        title="Compact Density"
                    >
                        Compact
                    </button>
                </div>
                <div className="toolbar-group">
                    <span className="toolbar-label">Rows/page:</span>
                    <select
                        className="page-size-select"
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        aria-label="Rows per page"
                    >
                        <option value={100}>100</option>
                        <option value={500}>500</option>
                        <option value={1000}>1000</option>
                    </select>
                </div>
                {viewMode === 'row' && (
                    <div className="toolbar-group toolbar-group-grow">
                        <input
                            className="global-filter-input"
                            type="text"
                            value={globalFilter}
                            onChange={(event) => setGlobalFilter(event.target.value)}
                            placeholder="Search all columns..."
                            aria-label="Global row filter"
                        />
                        <button
                            className={`icon-btn ${showColumnFilters ? 'active' : ''}`}
                            onClick={() => setShowColumnFilters(prev => !prev)}
                            title="Toggle column filters"
                        >
                            Filters
                        </button>
                        <button
                            className="icon-btn"
                            onClick={clearFiltersAndSort}
                            disabled={!hasActiveFilterOrSort}
                            title="Clear all filters and sorting"
                        >
                            Clear
                        </button>
                        <button
                            className="icon-btn"
                            onClick={handleResetColumnOrder}
                            disabled={columnOrder.length === 0}
                            title="Reset column order to default"
                        >
                            Reset Order
                        </button>
                        <div className="filter-match-count">
                            {sortedRows.length}/{data.rows.length}
                        </div>
                    </div>
                )}
            </div>

            {viewMode === 'row' && showColumnFilters && (
                <div className="column-filter-panel">
                    <div className="column-filter-grid">
                        {orderedColumns.map((column) => (
                            <label key={column} className="column-filter-item">
                                <span title={column}>{column}</span>
                                <input
                                    type="text"
                                    value={columnFilters[column] ?? ''}
                                    onChange={(event) => setColumnFilter(column, event.target.value)}
                                    placeholder={`Filter ${column}`}
                                    aria-label={`Filter column ${column}`}
                                />
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="data-table-container">
                {viewMode === 'row' ? (
                    <table>
                        <thead ref={theadRef}>
                            <tr style={{ position: 'relative' }}>
                                {orderedColumns.map((col, colIdx) => {
                                    const width = columnWidths[col];
                                    const style = width
                                        ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }
                                        : undefined;
                                    const isSorted = sortBy?.column === col;
                                    const ariaSort = isSorted ? (sortBy?.direction === 'asc' ? 'ascending' : 'descending') : 'none';
                                    const isBeingDragged = activeDragColumn === col;
                                    return (
                                        <th
                                            key={col}
                                            className={`resizable-th${isBeingDragged ? ' col-dragging' : ''}`}
                                            style={style}
                                            aria-sort={ariaSort}
                                        >
                                            {/* Drop indicator line: show before this column if dropIndicatorIndex matches */}
                                            {dropIndicatorIndex === colIdx && (
                                                <span className="col-drop-indicator" />
                                            )}
                                            <div className="th-inner">
                                                <span
                                                    className="col-drag-handle"
                                                    onMouseDown={(e) => startColDrag(col, e)}
                                                    title="Drag to reorder column"
                                                >
                                                    ⠿
                                                </span>
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    className={`th-sort-button ${isSorted ? 'active' : ''}`}
                                                    onClick={() => toggleSort(col)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSort(col); }}
                                                    title="Click to sort"
                                                >
                                                    <span className="th-label" title={col}>{col}</span>
                                                    <span className="sort-indicator" aria-hidden="true">
                                                        {isSorted ? (sortBy?.direction === 'asc' ? 'ASC' : 'DESC') : '--'}
                                                    </span>
                                                </div>
                                                <div
                                                    className="column-resize-handle"
                                                    onMouseDown={(event) => startResize(col, event)}
                                                    onDoubleClick={(event) => resetColumnWidth(col, event)}
                                                    title="Drag to resize, double-click to reset"
                                                />
                                            </div>
                                        </th>
                                    );
                                })}
                                {/* Drop indicator at the very end */}
                                {dropIndicatorIndex === orderedColumns.length && (
                                    <th style={{ position: 'relative', width: 0, padding: 0, border: 'none' }}>
                                        <span className="col-drop-indicator" />
                                    </th>
                                )}
                                <th className="row-action-header">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRows.map(({ row, originalIndex }) => (
                                <tr key={originalIndex}>
                                    {orderedColumns.map(col => {
                                        const width = columnWidths[col];
                                        const style = width
                                            ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }
                                            : undefined;
                                        return (
                                            <td key={`${originalIndex}-${col}`} title={formatTooltipValue(row[col])} style={style}>
                                                <div className="cell-content" onCopy={(e) => handleCellCopy(e, row[col])}>
                                                    {formatCellValue(row[col])}
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="row-action-cell">
                                        <button
                                            className="row-details-btn"
                                            onClick={() => setSelectedRowOriginalIndex(originalIndex)}
                                        >
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {sortedRows.length === 0 && (
                                <tr>
                                    <td colSpan={orderedColumns.length + 1} style={{ textAlign: 'center' }}>
                                        {data.rows.length === 0 ? 'No data (or empty table)' : 'No matching rows'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <div className="transposed-grid">
                        {data.rows.length > 0 && (
                            <div className="transposed-row header-row">
                                <div className="transposed-header spacer">Field</div>
                                {data.rows.map((_, i) => (
                                    <div key={`idx-${i}`} className="transposed-cell header-cell">
                                        Row {i + 1}
                                    </div>
                                ))}
                            </div>
                        )}

                        {orderedColumns.map(col => (
                            <div key={col} className="transposed-row">
                                <div className="transposed-header" title={col}>
                                    <div className="cell-content">{col}</div>
                                </div>
                                {data.rows.map((row, i) => (
                                    <div key={`${i}-${col}`} className="transposed-cell" title={formatTooltipValue(row[col])}>
                                        <div className="cell-content" onCopy={(e) => handleCellCopy(e, row[col])}>
                                            {formatCellValue(row[col])}
                                        </div>
                                    </div>
                                ))}
                                {data.rows.length === 0 && <div className="transposed-cell" style={{ fontStyle: 'italic', opacity: 0.5 }}>Empty</div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="data-footer">
                <span className="data-footer-count">
                    Showing {displayedRowCount} loaded rows. Total rows: {data.totalRows}
                </span>
                {data.totalRows > pageSize && (
                    <div className="pagination-controls">
                        <button
                            className="icon-btn"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 0}
                            title="Previous page"
                        >
                            ‹ Prev
                        </button>
                        <span className="page-indicator">
                            Page {currentPage + 1} / {Math.ceil(data.totalRows / pageSize)}
                        </span>
                        <button
                            className="icon-btn"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={(currentPage + 1) * pageSize >= data.totalRows}
                            title="Next page"
                        >
                            Next ›
                        </button>
                    </div>
                )}
            </div>

            {selectedRow && (
                <div className="row-detail-overlay" onClick={() => setSelectedRowOriginalIndex(null)}>
                    <aside className="row-detail-panel" onClick={(event) => event.stopPropagation()}>
                        <div className="row-detail-header">
                            <div>
                                <h3>Row Details</h3>
                                <div className="row-detail-subtitle">Loaded row #{selectedRowOriginalIndex !== null ? selectedRowOriginalIndex + 1 : ''}</div>
                            </div>
                            <button className="row-detail-close" onClick={() => setSelectedRowOriginalIndex(null)}>
                                Close
                            </button>
                        </div>
                        <div className="row-detail-body">
                            {orderedColumns.map((column) => (
                                <div key={column} className="row-detail-item">
                                    <div className="row-detail-key" title={column}>{column}</div>
                                    <pre className="row-detail-value">{formatDetailValue(selectedRow[column])}</pre>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
