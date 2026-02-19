import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import '../styles.css';
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
function formatTooltipValue(value) {
    if (value === null || value === undefined)
        return '';
    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
    }
    return String(value);
}
export function DataTable({ data, loading, dbPath, tableName }) {
    const [viewMode, setViewMode] = useState('row');
    const [density, setDensity] = useState('standard');
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
            }
            else {
                // Reset to defaults if no preference found (e.g. new table)
                setViewMode('row');
                setDensity('standard');
            }
        }
        catch (e) {
            console.warn('Failed to load view preferences', e);
        }
    }, [dbPath, tableName]);
    // Save preferences
    useEffect(() => {
        if (!dbPath || !tableName)
            return;
        const key = `ldb-view-${dbPath}::${tableName}`;
        try {
            localStorage.setItem(key, JSON.stringify({ viewMode, density }));
        }
        catch (e) {
            console.warn('Failed to save view preferences', e);
        }
    }, [viewMode, density, dbPath, tableName]);
    if (loading) {
        return _jsx("div", { children: "Loading data..." });
    }
    if (!data) {
        return _jsx("div", { style: { padding: 20, opacity: 0.6 }, children: "No data loaded." });
    }
    const isCompact = density === 'compact';
    return (_jsxs("div", { className: `data-table-wrapper ${isCompact ? 'compact' : ''}`, children: [_jsxs("div", { className: "data-toolbar", children: [_jsxs("div", { className: "toolbar-group", children: [_jsx("span", { className: "toolbar-label", children: "View:" }), _jsx("button", { className: `icon-btn ${viewMode === 'row' ? 'active' : ''}`, onClick: () => setViewMode('row'), title: "Row View", children: "Row" }), _jsx("button", { className: `icon-btn ${viewMode === 'column' ? 'active' : ''}`, onClick: () => setViewMode('column'), title: "Column View", children: "Column" })] }), _jsxs("div", { className: "toolbar-group", children: [_jsx("span", { className: "toolbar-label", children: "Density:" }), _jsx("button", { className: `icon-btn ${density === 'standard' ? 'active' : ''}`, onClick: () => setDensity('standard'), title: "Standard Density", children: "Standard" }), _jsx("button", { className: `icon-btn ${density === 'compact' ? 'active' : ''}`, onClick: () => setDensity('compact'), title: "Compact Density", children: "Compact" })] })] }), _jsx("div", { className: "data-table-container", children: viewMode === 'row' ? (_jsxs("table", { children: [_jsx("thead", { children: _jsx("tr", { children: data.columns.map(col => _jsx("th", { children: col }, col)) }) }), _jsxs("tbody", { children: [data.rows.map((row, i) => (_jsx("tr", { children: data.columns.map(col => (_jsx("td", { title: formatTooltipValue(row[col]), children: _jsx("div", { className: "cell-content", children: formatCellValue(row[col]) }) }, `${i}-${col}`))) }, i))), data.rows.length === 0 && _jsx("tr", { children: _jsx("td", { colSpan: data.columns.length, style: { textAlign: 'center' }, children: "No data (or empty table)" }) })] })] })) : (_jsxs("div", { className: "transposed-grid", children: [data.rows.length > 0 && (_jsxs("div", { className: "transposed-row header-row", children: [_jsx("div", { className: "transposed-header spacer", children: "Field" }), data.rows.map((_, i) => (_jsxs("div", { className: "transposed-cell header-cell", children: ["Row ", i + 1] }, `idx-${i}`)))] })), data.columns.map(col => (_jsxs("div", { className: "transposed-row", children: [_jsx("div", { className: "transposed-header", title: col, children: _jsx("div", { className: "cell-content", children: col }) }), data.rows.map((row, i) => (_jsx("div", { className: "transposed-cell", title: formatTooltipValue(row[col]), children: _jsx("div", { className: "cell-content", children: formatCellValue(row[col]) }) }, `${i}-${col}`))), data.rows.length === 0 && _jsx("div", { className: "transposed-cell", style: { fontStyle: 'italic', opacity: 0.5 }, children: "Empty" })] }, col)))] })) }), _jsxs("div", { style: { marginTop: 10, opacity: 0.7, fontSize: '0.9em' }, children: ["Showing first ", data.rows.length, " rows. Total rows: ", data.totalRows] })] }));
}
