import { useState, useEffect } from 'react';
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
            } else {
                // Reset to defaults if no preference found (e.g. new table)
                setViewMode('row');
                setDensity('standard');
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
            localStorage.setItem(key, JSON.stringify({ viewMode, density }));
        } catch (e) {
            console.warn('Failed to save view preferences', e);
        }
    }, [viewMode, density, dbPath, tableName]);


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
                                {data.columns.map(col => <th key={col}>{col}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((row, i) => (
                                <tr key={i}>
                                    {data.columns.map(col => (
                                        <td key={`${i}-${col}`} title={formatTooltipValue(row[col])}>
                                            <div className="cell-content">
                                                {formatCellValue(row[col])}
                                            </div>
                                        </td>
                                    ))}
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
