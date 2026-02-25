import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { TableData } from '../lib/types';
import '../styles.css';

interface DataTableProps {
    data: TableData | null;
    loading: boolean;
    dbPath: string;
    tableName: string;
}

type ViewMode = 'row' | 'column';
type Density = 'standard' | 'compact';
type SortDirection = 'asc' | 'desc';
type ColumnWidths = Record<string, number>;

type SortBy = {
    column: string;
    direction: SortDirection;
} | null;

interface ResizeState {
    column: string;
    startX: number;
    startWidth: number;
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

export function DataTable({ data, loading, dbPath, tableName }: DataTableProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('row');
    const [density, setDensity] = useState<Density>('standard');
    const [columnWidths, setColumnWidths] = useState<ColumnWidths>({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [sortBy, setSortBy] = useState<SortBy>(null);
    const [selectedRowOriginalIndex, setSelectedRowOriginalIndex] = useState<number | null>(null);
    const [showColumnFilters, setShowColumnFilters] = useState(false);
    const resizeRef = useRef<ResizeState | null>(null);

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
            localStorage.setItem(key, JSON.stringify({ viewMode, density, columnWidths }));
        } catch (e) {
            console.warn('Failed to save view preferences', e);
        }
    }, [viewMode, density, columnWidths, dbPath, tableName]);

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
                const matchesGlobal = data.columns.some(column => {
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
                        <div className="filter-match-count">
                            {sortedRows.length}/{data.rows.length}
                        </div>
                    </div>
                )}
            </div>

            {viewMode === 'row' && showColumnFilters && (
                <div className="column-filter-panel">
                    <div className="column-filter-grid">
                        {data.columns.map((column) => (
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
                        <thead>
                            <tr>
                                {data.columns.map(col => {
                                    const width = columnWidths[col];
                                    const style = width
                                        ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }
                                        : undefined;
                                    const isSorted = sortBy?.column === col;
                                    const ariaSort = isSorted ? (sortBy?.direction === 'asc' ? 'ascending' : 'descending') : 'none';
                                    return (
                                        <th key={col} className="resizable-th" style={style} aria-sort={ariaSort}>
                                            <button
                                                className={`th-sort-button ${isSorted ? 'active' : ''}`}
                                                onClick={() => toggleSort(col)}
                                                title="Click to sort"
                                            >
                                                <span className="th-label" title={col}>{col}</span>
                                                <span className="sort-indicator" aria-hidden="true">
                                                    {isSorted ? (sortBy?.direction === 'asc' ? 'ASC' : 'DESC') : '--'}
                                                </span>
                                            </button>
                                            <div
                                                className="column-resize-handle"
                                                onMouseDown={(event) => startResize(col, event)}
                                                onDoubleClick={(event) => resetColumnWidth(col, event)}
                                                title="Drag to resize, double-click to reset"
                                            />
                                        </th>
                                    );
                                })}
                                <th className="row-action-header">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRows.map(({ row, originalIndex }) => (
                                <tr key={originalIndex}>
                                    {data.columns.map(col => {
                                        const width = columnWidths[col];
                                        const style = width
                                            ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }
                                            : undefined;
                                        return (
                                            <td key={`${originalIndex}-${col}`} title={formatTooltipValue(row[col])} style={style}>
                                                <div className="cell-content">
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
                                    <td colSpan={data.columns.length + 1} style={{ textAlign: 'center' }}>
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

                        {data.columns.map(col => (
                            <div key={col} className="transposed-row">
                                <div className="transposed-header" title={col}>
                                    <div className="cell-content">{col}</div>
                                </div>
                                {data.rows.map((row, i) => (
                                    <div key={`${i}-${col}`} className="transposed-cell" title={formatTooltipValue(row[col])}>
                                        <div className="cell-content">
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
            <div style={{ marginTop: 10, opacity: 0.7, fontSize: '0.9em' }}>
                Showing {displayedRowCount} loaded rows. Total rows: {data.totalRows}
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
                            {data.columns.map((column) => (
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
