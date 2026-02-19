import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { getLastScannedFolder, getTableDetails, getTableData, scanFolder, selectFolder, selectFile, readTextFile, getMappingFilePath, setMappingFilePath } from './lib/api';
import type { AppError, TableDetails, TableSummary, TableData } from './lib/types';
import { DataTable } from './components/DataTable';
import { APP_CONFIG } from './lib/config';
import './styles.css';

interface KbInfo {
  id: string;
  name: string;
}

interface KbMappingConfig {
  kbs: KbInfo[];
}

type Theme = 'light' | 'dark' | 'auto';
type TabOption = 'schema' | 'data';

function toUserMessage(error: AppError): string {
  const map: Record<AppError['category'], string> = {
    invalid_path: 'Folder path is invalid.',
    permission_denied: 'Permission denied while scanning.',
    open_failed: 'Unable to open LanceDB dataset.',
    metadata_unavailable: 'Some table metadata is unavailable.',
    unknown: 'Unknown error occurred.'
  };
  return map[error.category] ?? map.unknown;
}


// Settings Modal Component
function SettingsModal({
  onClose,
  onLoadMapping,
  mappingPath,
  theme,
  setTheme,
  defaultTab,
  setDefaultTab
}: {
  onClose: () => void;
  onLoadMapping: () => void;
  mappingPath: string | null;
  theme: Theme;
  setTheme: (t: Theme) => void;
  defaultTab: TabOption;
  setDefaultTab: (t: TabOption) => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Settings</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="settings-section">
            <h4>View Mode</h4>
            <div className="setting-item" style={{ flexDirection: 'row', gap: '20px' }}>
              {(['light', 'dark', 'auto'] as const).map((mode) => (
                <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="theme"
                    value={mode}
                    checked={theme === mode}
                    onChange={() => setTheme(mode)}
                  />
                  <span style={{ textTransform: 'capitalize' }}>
                    {mode === 'auto' ? 'Auto (System)' : mode}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <h4>Default Table View</h4>
            <div className="setting-item" style={{ flexDirection: 'row', gap: '20px' }}>
              {(['schema', 'data'] as const).map((tab) => (
                <label key={tab} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="defaultTab"
                    value={tab}
                    checked={defaultTab === tab}
                    onChange={() => setDefaultTab(tab)}
                  />
                  <span style={{ textTransform: 'capitalize' }}>
                    {tab}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <h4>LanceDB Name Mapping</h4>

            <div className="mapping-info" style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: '1.4', color: '#ccc' }}>
                Map internal directory names (UUIDs or folder names) to human-readable labels in the sidebar.
              </p>

              <details className="help-box">
                <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--accent)' }}>
                  View JSON Format Example
                </summary>
                <div style={{ marginTop: '10px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>
                    Create a <code>.json</code> file with this structure:
                  </p>
                  <pre className="code-block">
                    {`{
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
}`}
                  </pre>
                </div>
              </details>
            </div>

            <div className="setting-item">
              <label>Current Mapping File:</label>
              <div className="setting-value">
                {mappingPath ?? "No file selected"}
              </div>
              <div style={{ marginTop: 8 }}>
                <button onClick={onLoadMapping}>
                  {mappingPath ? "Change Mapping File" : "Select Mapping File"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {/* Add more footer actions if needed */}
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [folder, setFolder] = useState<string | null>(null);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [kbMapping, setKbMapping] = useState<Map<string, string>>(new Map());
  const [mappingPath, setMappingPath] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [selected, setSelected] = useState<TableSummary | null>(null);
  const [details, setDetails] = useState<TableDetails | null>(null);
  const [data, setData] = useState<TableData | null>(null);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const [activeTab, setActiveTab] = useState<'schema' | 'data'>('schema');
  const [sidebarWidth, setSidebarWidth] = useState<number>(APP_CONFIG.defaults.sidebarWidth);
  const isResizing = useRef(false);

  // Theme Logic
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(APP_CONFIG.storageKeys.theme) as Theme) || APP_CONFIG.defaults.theme);

  // Default Tab Logic
  const [defaultTabSetting, setDefaultTabSetting] = useState<TabOption>(() => (localStorage.getItem(APP_CONFIG.storageKeys.defaultTab) as TabOption) || APP_CONFIG.defaults.tab);

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
      } else {
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

  async function loadMappingFile(path: string) {
    try {
      const content = await readTextFile(path);
      const config: KbMappingConfig = JSON.parse(content);
      const map = new Map<string, string>();
      if (config.kbs && Array.isArray(config.kbs)) {
        for (const kb of config.kbs) {
          if (kb.id && kb.name) {
            map.set(kb.id, kb.name);
          }
        }
      }
      setKbMapping(map);
    } catch (e) {
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

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      setSidebarWidth(Math.max(200, Math.min(600, e.clientX)));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);


  async function runScan(target: string) {
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
    } catch (e) {
      setError(e as AppError);
    } finally {
      setLoading(false);
    }
  }

  async function onPickFolder() {
    const selectedFolder = await selectFolder();
    if (!selectedFolder) return;
    setFolder(selectedFolder);
    await runScan(selectedFolder);
  }

  async function onLoadMapping() {
    try {
      const path = await selectFile();
      if (!path) return;

      setMappingPath(path);
      await setMappingFilePath(path);
      await loadMappingFile(path);
    } catch (e) {
      setError(e as AppError);
    }
  }

  async function onSelectTable(item: TableSummary) {
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
    } catch (e) {
      setError(e as AppError);
    }
  }

  async function loadData() {
    if (!selected) return;
    setDataLoading(true);
    try {
      const tableData = await getTableData(selected.dbPath, selected.tableName, 100); // Limit 100
      setData(tableData);
    } catch (e) {
      setError(e as AppError);
    } finally {
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
    const map = new Map<string, TableSummary[]>();
    for (const item of tables) {
      const list = map.get(item.dbPath) ?? [];
      list.push(item);
      map.set(item.dbPath, list);
    }
    return Array.from(map.entries());
  }, [tables]);

  return (
    <div className="app">


      {loading && <div style={{ padding: 10 }}>Scanning...</div>}
      {error && <div className="error" style={{ padding: 10, background: '#500', color: '#fff' }}>{toUserMessage(error)} {error.detail ? `(${error.detail})` : ''}</div>}

      <div className="main-layout">
        <aside className="sidebar" style={{ width: sidebarWidth }}>
          <div className="sidebar-header">
            <div className="sidebar-controls">
              <button
                onClick={onPickFolder}
                disabled={loading}
                title="Select Folder"
                className="icon-only-btn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              </button>
              <button
                onClick={() => folder && runScan(folder)}
                disabled={!folder || loading}
                title="Rescan"
                className="icon-only-btn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              </button>
              <div style={{ flex: 1 }}></div>
              <button
                onClick={() => setShowSettings(true)}
                title="Settings"
                className="icon-only-btn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>
            </div>
            <div className="current-path" title={folder ?? ''}>{folder ?? 'No folder selected'}</div>
          </div>
          <div style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Databases</div>
          {tables.length === 0 && !loading && <div style={{ padding: 20, opacity: 0.6 }}>No tables found.</div>}

          {grouped.map(([dbPath, dbTables]) => {
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

            return (
              <div key={dbPath} className="db-group">
                <div className="db-header" title={dbPath}>{dbName}</div>
                {dbTables.map((table) => {
                  const active = selected?.dbPath === table.dbPath && selected?.tableName === table.tableName;
                  return (
                    <div
                      className={`table-item ${active ? 'active' : ''}`}
                      key={`${table.dbPath}/${table.tableName}`}
                      onClick={() => onSelectTable(table)}
                    >
                      {table.tableName}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </aside>

        <div className="resizer" onMouseDown={startResizing}></div>

        <main className="content">
          {selected ? (
            <>
              <div className="content-header">
                <div className="title-row">
                  <h2>{selected.tableName}</h2>
                  <div className="db-path">{selected.dbPath}</div>
                </div>

                <div className="tabs inline">
                  <div className={`tab ${activeTab === 'schema' ? 'active' : ''}`} onClick={() => setActiveTab('schema')}>Schema</div>
                  <div className={`tab ${activeTab === 'data' ? 'active' : ''}`} onClick={() => setActiveTab('data')}>Data</div>
                </div>
              </div>

              {activeTab === 'schema' && details && (
                <div>
                  <p><strong>Rows:</strong> {details.rowCount ?? 'unknown'}</p>
                  <p><strong>Vector Dimension:</strong> {details.hasVector ? details.vectorDimension ?? 'unknown' : 'None'}</p>

                  <h3>Fields</h3>
                  <div className="data-table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Vector</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.schemaFields.map(f => (
                          <tr key={f.name}>
                            <td>{f.name}</td>
                            <td>{f.dataType}</td>
                            <td>{f.isVector ? `Yes (${f.dimension})` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'data' && (
                <DataTable
                  data={data}
                  loading={dataLoading}
                  dbPath={selected.dbPath}
                  tableName={selected.tableName}
                />
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
              Select a table to view details
            </div>
          )}
        </main>
      </div>

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onLoadMapping={onLoadMapping}
          mappingPath={mappingPath}
          theme={theme}
          setTheme={setTheme}
          defaultTab={defaultTabSetting}
          setDefaultTab={setDefaultTabSetting}
        />
      )}
    </div>
  );
}
