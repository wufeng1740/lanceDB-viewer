import { useState, useEffect, useRef, useCallback } from 'react';
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
type ColumnWidths = Record<string, number>;

const MIN_COLUMN_WIDTH = 80;
const MAX_COLUMN_WIDTH = 1000;

interface ResizeState {
    column: string;
    startX: number;
    startWidth: number;
}

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

export function DataTable({ data, loading, dbPath, tableName }: DataTableProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('row');
    const [density, setDensity] = useState<Density>('standard');
    const [columnWidths, setColumnWidths] = useState<ColumnWidths>({});
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


    if (loading) {
        return <div>Loading data...</div>;
    }

    if (!data) {
        return <div style={{ padding: 20, opacity: 0.6 }}>No data loaded.</div>;
    }

    const isCompact = density === 'compact';

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
            </div>

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
                                    return (
                                        <th key={col} className="resizable-th" style={style}>
                                            <span className="th-label" title={col}>{col}</span>
                                            <div
                                                className="column-resize-handle"
                                                onMouseDown={(event) => startResize(col, event)}
                                                onDoubleClick={(event) => resetColumnWidth(col, event)}
                                                title="Drag to resize, double-click to reset"
                                            />
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((row, i) => (
                                <tr key={i}>
                                    {data.columns.map(col => {
                                        const width = columnWidths[col];
                                        const style = width
                                            ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }
                                            : undefined;
                                        return (
                                            <td key={`${i}-${col}`} title={formatTooltipValue(row[col])} style={style}>
                                                <div className="cell-content">
                                                    {formatCellValue(row[col])}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {data.rows.length === 0 && <tr><td colSpan={data.columns.length} style={{ textAlign: 'center' }}>No data (or empty table)</td></tr>}
                        </tbody>
                    </table>
                ) : (
                    <div className="transposed-grid">
                        {/* Header Row for Transposed View */}
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
                Showing first {data.rows.length} rows. Total rows: {data.totalRows}
            </div>
        </div>
    );
}
