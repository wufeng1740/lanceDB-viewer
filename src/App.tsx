import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { getLastScannedFolder, getTableDetails, getTableData, scanFolder, selectFolder } from './lib/api';
import type { AppError, TableDetails, TableSummary, TableData } from './lib/types';
import './styles.css';

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

// Helper to format cell values
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      // Check if it looks like a vector (array of numbers)
      if (value.length > 0 && typeof value[0] === 'number') {
        return `[Vector dim=${value.length}]`;
      }
      return `[Array(${value.length})]`;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

export function App() {
  const [folder, setFolder] = useState<string | null>(null);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [selected, setSelected] = useState<TableSummary | null>(null);
  const [details, setDetails] = useState<TableDetails | null>(null);
  const [data, setData] = useState<TableData | null>(null);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const [activeTab, setActiveTab] = useState<'schema' | 'data'>('schema');
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const isResizing = useRef(false);

  useEffect(() => {
    getLastScannedFolder().then((saved) => {
      if (saved) {
        setFolder(saved);
        runScan(saved); // Auto-scan on load if folder exists
      }
    });
  }, []);

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

  async function onSelectTable(item: TableSummary) {
    if (selected?.dbPath === item.dbPath && selected?.tableName === item.tableName) {
      return; // Already selected
    }

    setSelected(item);
    setDetails(null);
    setData(null);
    setError(null);
    setActiveTab('schema'); // Reset to schema view

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
      <div className="toolbar">
        <h2>LanceDB Viewer</h2>
        <button onClick={onPickFolder} disabled={loading}>Select Folder</button>
        <button onClick={() => folder && runScan(folder)} disabled={!folder || loading}>Rescan</button>
        <span className="path" title={folder ?? ''}>{folder ?? 'No folder selected'}</span>
      </div>

      {loading && <div style={{ padding: 10 }}>Scanning...</div>}
      {error && <div className="error" style={{ padding: 10, background: '#500', color: '#fff' }}>{toUserMessage(error)} {error.detail ? `(${error.detail})` : ''}</div>}

      <div className="main-layout">
        <aside className="sidebar" style={{ width: sidebarWidth }}>
          <div style={{ padding: 10, borderBottom: '1px solid #444', fontWeight: 'bold' }}>Databases</div>
          {tables.length === 0 && !loading && <div style={{ padding: 20, opacity: 0.6 }}>No tables found.</div>}

          {grouped.map(([dbPath, dbTables]) => {
            // Extract last part of path for cleaner display
            const parts = dbPath.split(/[/\\]/);
            const dbName = parts[parts.length - 1] || dbPath;

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
              <h2 style={{ margin: '0 0 20px 0' }}>
                {selected.tableName} <small style={{ opacity: 0.6, fontSize: '0.6em', fontWeight: 'normal' }}>{selected.dbPath}</small>
              </h2>

              <div className="tabs">
                <div className={`tab ${activeTab === 'schema' ? 'active' : ''}`} onClick={() => setActiveTab('schema')}>Schema</div>
                <div className={`tab ${activeTab === 'data' ? 'active' : ''}`} onClick={() => setActiveTab('data')}>Data</div>
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
                <>
                  {dataLoading && <div>Loading data...</div>}
                  {data && (
                    <div className="data-table-container">
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
                                <td key={`${i}-${col}`} title={typeof row[col] === 'string' ? row[col] as string : ''}>
                                  {formatCellValue(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {data.rows.length === 0 && <tr><td colSpan={data.columns.length} style={{ textAlign: 'center' }}>No data (or empty table)</td></tr>}
                        </tbody>
                      </table>
                      <div style={{ marginTop: 10, opacity: 0.7, fontSize: '0.9em' }}>
                        Showing first {data.rows.length} rows. Total rows: {data.totalRows}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
              Select a table to view details
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
