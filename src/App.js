import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { getLastScannedFolder, getTableDetails, getTableData, scanFolder, selectFolder, selectFile, readTextFile, getMappingFilePath, setMappingFilePath } from './lib/api';
import { DataTable } from './components/DataTable';
import { APP_CONFIG } from './lib/config';
import './styles.css';
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
// Settings Modal Component
function SettingsModal({ onClose, onLoadMapping, mappingPath, theme, setTheme, defaultTab, setDefaultTab }) {
    return (_jsx("div", { className: "modal-overlay", onClick: onClose, children: _jsxs("div", { className: "modal-content", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { children: "Settings" }), _jsx("button", { className: "modal-close", onClick: onClose, children: "\u00D7" })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("div", { className: "settings-section", children: [_jsx("h4", { children: "View Mode" }), _jsx("div", { className: "setting-item", style: { flexDirection: 'row', gap: '20px' }, children: ['light', 'dark', 'auto'].map((mode) => (_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }, children: [_jsx("input", { type: "radio", name: "theme", value: mode, checked: theme === mode, onChange: () => setTheme(mode) }), _jsx("span", { style: { textTransform: 'capitalize' }, children: mode === 'auto' ? 'Auto (System)' : mode })] }, mode))) })] }), _jsxs("div", { className: "settings-section", children: [_jsx("h4", { children: "Default Table View" }), _jsx("div", { className: "setting-item", style: { flexDirection: 'row', gap: '20px' }, children: ['schema', 'data'].map((tab) => (_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }, children: [_jsx("input", { type: "radio", name: "defaultTab", value: tab, checked: defaultTab === tab, onChange: () => setDefaultTab(tab) }), _jsx("span", { style: { textTransform: 'capitalize' }, children: tab })] }, tab))) })] }), _jsxs("div", { className: "settings-section", children: [_jsx("h4", { children: "LanceDB Name Mapping" }), _jsxs("div", { className: "mapping-info", style: { marginBottom: '16px' }, children: [_jsx("p", { style: { margin: '0 0 8px 0', fontSize: '14px', lineHeight: '1.4', color: '#ccc' }, children: "Map internal directory names (UUIDs or folder names) to human-readable labels in the sidebar." }), _jsxs("details", { className: "help-box", children: [_jsx("summary", { style: { cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--accent)' }, children: "View JSON Format Example" }), _jsxs("div", { style: { marginTop: '10px' }, children: [_jsxs("p", { style: { fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px 0' }, children: ["Create a ", _jsx("code", { children: ".json" }), " file with this structure:"] }), _jsx("pre", { className: "code-block", children: `{
  "kbs": [
    {
      "id": "c05565e7-d65a-4648-8df0-29c470129727",
      "name": "My Knowledge Base"
    },
    {
      "id": "folder_name_here",
      "name": "Project Documentation"
    }
  ]
}` })] })] })] }), _jsxs("div", { className: "setting-item", children: [_jsx("label", { children: "Current Mapping File:" }), _jsx("div", { className: "setting-value", children: mappingPath ?? "No file selected" }), _jsx("div", { style: { marginTop: 8 }, children: _jsx("button", { onClick: onLoadMapping, children: mappingPath ? "Change Mapping File" : "Select Mapping File" }) })] })] })] }), _jsx("div", { className: "modal-footer" })] }) }));
}
export function App() {
    const [folder, setFolder] = useState(null);
    const [tables, setTables] = useState([]);
    const [warnings, setWarnings] = useState([]);
    const [kbMapping, setKbMapping] = useState(new Map());
    const [mappingPath, setMappingPath] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [selected, setSelected] = useState(null);
    const [details, setDetails] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('schema');
    const [sidebarWidth, setSidebarWidth] = useState(APP_CONFIG.defaults.sidebarWidth);
    const isResizing = useRef(false);
    // Theme Logic
    const [theme, setTheme] = useState(() => localStorage.getItem(APP_CONFIG.storageKeys.theme) || APP_CONFIG.defaults.theme);
    // Default Tab Logic
    const [defaultTabSetting, setDefaultTabSetting] = useState(() => localStorage.getItem(APP_CONFIG.storageKeys.defaultTab) || APP_CONFIG.defaults.tab);
    useEffect(() => {
        localStorage.setItem(APP_CONFIG.storageKeys.defaultTab, defaultTabSetting);
    }, [defaultTabSetting]);
    useEffect(() => {
        const root = document.documentElement;
        const applyTheme = () => {
            let activeTheme = theme;
            if (theme === 'auto') {
                activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            if (activeTheme === 'dark') {
                root.removeAttribute('data-theme');
            }
            else {
                root.setAttribute('data-theme', 'light');
            }
        };
        applyTheme();
        localStorage.setItem(APP_CONFIG.storageKeys.theme, theme);
        if (theme === 'auto') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = () => applyTheme();
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        }
    }, [theme]);
    useEffect(() => {
        getLastScannedFolder().then((saved) => {
            if (saved) {
                setFolder(saved);
                runScan(saved); // Auto-scan on load if folder exists
            }
        });
        getMappingFilePath().then(async (path) => {
            if (path) {
                setMappingPath(path);
                await loadMappingFile(path);
            }
        });
    }, []);
    async function loadMappingFile(path) {
        try {
            const content = await readTextFile(path);
            const config = JSON.parse(content);
            const map = new Map();
            if (config.kbs && Array.isArray(config.kbs)) {
                for (const kb of config.kbs) {
                    if (kb.id && kb.name) {
                        map.set(kb.id, kb.name);
                    }
                }
            }
            setKbMapping(map);
        }
        catch (e) {
            console.error("Failed to load mapping file", e);
            // Optional: set error state if critical, but for now just log
        }
    }
    // Resizing logic
    const startResizing = useCallback(() => {
        isResizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, []);
    const handleMouseMove = useCallback((e) => {
        if (isResizing.current) {
            setSidebarWidth(Math.max(200, Math.min(600, e.clientX)));
        }
    }, []);
    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);
    async function runScan(target) {
        setLoading(true);
        setError(null);
        setWarnings([]);
        try {
            const result = await scanFolder(target);
            setTables(result.tables);
            setWarnings(result.warnings);
            // Don't clear selected if it still exists? For now clear to be safe
            // setSelected(null);
            // setDetails(null);
            // setData(null);
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
        if (!selectedFolder)
            return;
        setFolder(selectedFolder);
        await runScan(selectedFolder);
    }
    async function onLoadMapping() {
        try {
            const path = await selectFile();
            if (!path)
                return;
            setMappingPath(path);
            await setMappingFilePath(path);
            await loadMappingFile(path);
        }
        catch (e) {
            setError(e);
        }
    }
    async function onSelectTable(item) {
        if (selected?.dbPath === item.dbPath && selected?.tableName === item.tableName) {
            return; // Already selected
        }
        setSelected(item);
        setDetails(null);
        setData(null);
        setError(null);
        setActiveTab(defaultTabSetting); // Use persisted preference
        try {
            // Fetch details immediately
            const tableDetails = await getTableDetails(item.dbPath, item.tableName);
            setDetails(tableDetails);
        }
        catch (e) {
            setError(e);
        }
    }
    async function loadData() {
        if (!selected)
            return;
        setDataLoading(true);
        try {
            const tableData = await getTableData(selected.dbPath, selected.tableName, 100); // Limit 100
            setData(tableData);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setDataLoading(false);
        }
    }
    // Switch tabs
    useEffect(() => {
        if (activeTab === 'data' && selected && !data) {
            loadData();
        }
    }, [activeTab, selected]);
    const grouped = useMemo(() => {
        const map = new Map();
        for (const item of tables) {
            const list = map.get(item.dbPath) ?? [];
            list.push(item);
            map.set(item.dbPath, list);
        }
        return Array.from(map.entries());
    }, [tables]);
    return (_jsxs("div", { className: "app", children: [loading && _jsx("div", { style: { padding: 10 }, children: "Scanning..." }), error && _jsxs("div", { className: "error", style: { padding: 10, background: '#500', color: '#fff' }, children: [toUserMessage(error), " ", error.detail ? `(${error.detail})` : ''] }), _jsxs("div", { className: "main-layout", children: [_jsxs("aside", { className: "sidebar", style: { width: sidebarWidth }, children: [_jsxs("div", { className: "sidebar-header", children: [_jsxs("div", { className: "sidebar-controls", children: [_jsx("button", { onClick: onPickFolder, disabled: loading, title: "Select Folder", className: "icon-only-btn", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" }) }) }), _jsx("button", { onClick: () => folder && runScan(folder), disabled: !folder || loading, title: "Rescan", className: "icon-only-btn", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("polyline", { points: "23 4 23 10 17 10" }), _jsx("polyline", { points: "1 20 1 14 7 14" }), _jsx("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })] }) }), _jsx("div", { style: { flex: 1 } }), _jsx("button", { onClick: () => setShowSettings(true), title: "Settings", className: "icon-only-btn", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "3" }), _jsx("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" })] }) })] }), _jsx("div", { className: "current-path", title: folder ?? '', children: folder ?? 'No folder selected' })] }), _jsx("div", { style: { padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }, children: "Databases" }), tables.length === 0 && !loading && _jsx("div", { style: { padding: 20, opacity: 0.6 }, children: "No tables found." }), grouped.map(([dbPath, dbTables]) => {
                                // Extract last part of path for cleaner display
                                const parts = dbPath.split(/[/\\]/);
                                // Reverse iterate to find the first part that matches a known KB ID
                                let dbName = parts[parts.length - 1] || dbPath;
                                for (let i = parts.length - 1; i >= 0; i--) {
                                    const part = parts[i];
                                    const mapped = kbMapping.get(part);
                                    if (mapped) {
                                        dbName = mapped;
                                        break;
                                    }
                                }
                                return (_jsxs("div", { className: "db-group", children: [_jsx("div", { className: "db-header", title: dbPath, children: dbName }), dbTables.map((table) => {
                                            const active = selected?.dbPath === table.dbPath && selected?.tableName === table.tableName;
                                            return (_jsx("div", { className: `table-item ${active ? 'active' : ''}`, onClick: () => onSelectTable(table), children: table.tableName }, `${table.dbPath}/${table.tableName}`));
                                        })] }, dbPath));
                            })] }), _jsx("div", { className: "resizer", onMouseDown: startResizing }), _jsx("main", { className: "content", children: selected ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "content-header", children: [_jsxs("div", { className: "title-row", children: [_jsx("h2", { children: selected.tableName }), _jsx("div", { className: "db-path", children: selected.dbPath })] }), _jsxs("div", { className: "tabs inline", children: [_jsx("div", { className: `tab ${activeTab === 'schema' ? 'active' : ''}`, onClick: () => setActiveTab('schema'), children: "Schema" }), _jsx("div", { className: `tab ${activeTab === 'data' ? 'active' : ''}`, onClick: () => setActiveTab('data'), children: "Data" })] })] }), activeTab === 'schema' && details && (_jsxs("div", { children: [_jsxs("p", { children: [_jsx("strong", { children: "Rows:" }), " ", details.rowCount ?? 'unknown'] }), _jsxs("p", { children: [_jsx("strong", { children: "Vector Dimension:" }), " ", details.hasVector ? details.vectorDimension ?? 'unknown' : 'None'] }), _jsx("h3", { children: "Fields" }), _jsx("div", { className: "data-table-container", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Vector" })] }) }), _jsx("tbody", { children: details.schemaFields.map(f => (_jsxs("tr", { children: [_jsx("td", { children: f.name }), _jsx("td", { children: f.dataType }), _jsx("td", { children: f.isVector ? `Yes (${f.dimension})` : '-' })] }, f.name))) })] }) })] })), activeTab === 'data' && (_jsx(DataTable, { data: data, loading: dataLoading, dbPath: selected.dbPath, tableName: selected.tableName }))] })) : (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }, children: "Select a table to view details" })) })] }), showSettings && (_jsx(SettingsModal, { onClose: () => setShowSettings(false), onLoadMapping: onLoadMapping, mappingPath: mappingPath, theme: theme, setTheme: setTheme, defaultTab: defaultTabSetting, setDefaultTab: setDefaultTabSetting }))] }));
}
