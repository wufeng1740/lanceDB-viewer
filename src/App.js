import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { getLastScannedFolder, getTableDetails, scanFolder, selectFolder } from './lib/api';
function toUserMessage(error) {
    const map = {
        invalid_path: 'Folder path is invalid.',
        permission_denied: 'Permission denied while scanning.',
        open_failed: 'Unable to open LanceDB dataset.',
        metadata_unavailable: 'Some table metadata is unavailable.',
        unknown: 'Unknown error occurred.'
    };
    return map[error.category] ?? map.unknown;
}
export function App() {
    const [folder, setFolder] = useState(null);
    const [tables, setTables] = useState([]);
    const [warnings, setWarnings] = useState([]);
    const [selected, setSelected] = useState(null);
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        getLastScannedFolder().then((saved) => {
            if (saved) {
                setFolder(saved);
            }
        });
    }, []);
    async function runScan(target) {
        setLoading(true);
        setError(null);
        setWarnings([]);
        try {
            const result = await scanFolder(target);
            setTables(result.tables);
            setWarnings(result.warnings);
            setSelected(null);
            setDetails(null);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setLoading(false);
        }
    }
    async function onPickFolder() {
        const selectedFolder = await selectFolder();
        if (!selectedFolder) {
            return;
        }
        setFolder(selectedFolder);
        await runScan(selectedFolder);
    }
    async function onSelectTable(item) {
        setSelected(item);
        try {
            const tableDetails = await getTableDetails(item.dbPath, item.tableName);
            setDetails(tableDetails);
            setError(null);
        }
        catch (e) {
            setError(e);
            setDetails(null);
        }
    }
    const grouped = useMemo(() => {
        const map = new Map();
        for (const item of tables) {
            const list = map.get(item.dbPath) ?? [];
            list.push(item);
            map.set(item.dbPath, list);
        }
        return Array.from(map.entries());
    }, [tables]);
    return (_jsxs("div", { className: "app", children: [_jsx("h1", { children: "LanceDB Viewer" }), _jsxs("div", { className: "toolbar", children: [_jsx("button", { onClick: onPickFolder, disabled: loading, children: "Select Folder" }), _jsx("button", { onClick: () => folder && runScan(folder), disabled: !folder || loading, children: "Rescan" }), _jsx("span", { className: "path", children: folder ?? 'No folder selected' })] }), loading && _jsx("div", { className: "panel", children: "Scanning..." }), error && _jsxs("div", { className: "error", children: [toUserMessage(error), " ", error.detail ? `(${error.detail})` : ''] }), warnings.length > 0 && (_jsxs("div", { className: "panel", children: [_jsx("strong", { children: "Warnings" }), _jsx("ul", { children: warnings.map((w) => _jsx("li", { children: w }, w)) })] })), _jsxs("div", { className: "layout", children: [_jsxs("section", { className: "panel", children: [_jsx("h2", { children: "Databases / Tables" }), tables.length === 0 && !loading ? _jsx("p", { children: "Nothing found yet." }) : null, _jsx("div", { className: "list", children: grouped.map(([dbPath, dbTables]) => (_jsxs("div", { children: [_jsx("strong", { children: dbPath }), dbTables.map((table) => {
                                            const active = selected?.dbPath === table.dbPath && selected?.tableName === table.tableName;
                                            return (_jsxs("div", { className: `item ${active ? 'active' : ''}`, onClick: () => onSelectTable(table), children: [_jsx("div", { children: table.tableName }), _jsxs("small", { children: ["rows: ", table.rowCount ?? 'unknown', " | vector: ", table.hasVector ? table.vectorDimension ?? 'unknown' : 'no'] })] }, `${table.dbPath}/${table.tableName}`));
                                        })] }, dbPath))) })] }), _jsxs("section", { className: "panel", children: [_jsx("h2", { children: "Table Details" }), !details && _jsx("p", { children: "Select a table to view schema." }), details && (_jsxs("div", { children: [_jsxs("p", { children: [_jsx("strong", { children: "DB:" }), " ", details.dbPath] }), _jsxs("p", { children: [_jsx("strong", { children: "Table:" }), " ", details.tableName] }), _jsxs("p", { children: [_jsx("strong", { children: "Vector:" }), " ", details.hasVector ? details.vectorDimension ?? 'unknown' : 'no'] }), _jsx("h3", { children: "Fields" }), _jsx("ul", { children: details.schemaFields.map((f) => (_jsxs("li", { children: [f.name, ": ", f.dataType, " ", f.isVector ? `(vector ${f.dimension ?? 'unknown'})` : ''] }, f.name))) })] }))] })] })] }));
}
