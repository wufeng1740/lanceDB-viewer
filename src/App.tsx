import { useEffect, useMemo, useState } from 'react';
import { getLastScannedFolder, getTableDetails, scanFolder, selectFolder } from './lib/api';
import type { AppError, TableDetails, TableSummary } from './lib/types';

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

export function App() {
  const [folder, setFolder] = useState<string | null>(null);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selected, setSelected] = useState<TableSummary | null>(null);
  const [details, setDetails] = useState<TableDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    getLastScannedFolder().then((saved) => {
      if (saved) {
        setFolder(saved);
      }
    });
  }, []);

  async function runScan(target: string) {
    setLoading(true);
    setError(null);
    setWarnings([]);

    try {
      const result = await scanFolder(target);
      setTables(result.tables);
      setWarnings(result.warnings);
      setSelected(null);
      setDetails(null);
    } catch (e) {
      setError(e as AppError);
    } finally {
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

  async function onSelectTable(item: TableSummary) {
    setSelected(item);
    try {
      const tableDetails = await getTableDetails(item.dbPath, item.tableName);
      setDetails(tableDetails);
      setError(null);
    } catch (e) {
      setError(e as AppError);
      setDetails(null);
    }
  }

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
      <h1>LanceDB Viewer</h1>
      <div className="toolbar">
        <button onClick={onPickFolder} disabled={loading}>Select Folder</button>
        <button onClick={() => folder && runScan(folder)} disabled={!folder || loading}>Rescan</button>
        <span className="path">{folder ?? 'No folder selected'}</span>
      </div>

      {loading && <div className="panel">Scanning...</div>}
      {error && <div className="error">{toUserMessage(error)} {error.detail ? `(${error.detail})` : ''}</div>}
      {warnings.length > 0 && (
        <div className="panel">
          <strong>Warnings</strong>
          <ul>
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}

      <div className="layout">
        <section className="panel">
          <h2>Databases / Tables</h2>
          {tables.length === 0 && !loading ? (
            <div style={{ padding: 20, textAlign: 'center', opacity: 0.6 }}>
              <p>No tables found.</p>
              <small>Select a folder that contains <code>.lance</code> directories.</small>
            </div>
          ) : null}
          <div className="list">
            {grouped.map(([dbPath, dbTables]) => (
              <div key={dbPath}>
                <strong>{dbPath}</strong>
                {dbTables.map((table) => {
                  const active = selected?.dbPath === table.dbPath && selected?.tableName === table.tableName;
                  return (
                    <div
                      className={`item ${active ? 'active' : ''}`}
                      key={`${table.dbPath}/${table.tableName}`}
                      onClick={() => onSelectTable(table)}
                    >
                      <div>{table.tableName}</div>
                      <small>
                        rows: {table.rowCount ?? 'unknown'} | vector: {table.hasVector ? table.vectorDimension ?? 'unknown' : 'no'}
                      </small>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Table Details</h2>
          {!details && <p>Select a table to view schema.</p>}
          {details && (
            <div>
              <p><strong>DB:</strong> {details.dbPath}</p>
              <p><strong>Table:</strong> {details.tableName}</p>
              <p><strong>Vector:</strong> {details.hasVector ? details.vectorDimension ?? 'unknown' : 'no'}</p>
              <h3>Fields</h3>
              <ul>
                {details.schemaFields.map((f) => (
                  <li key={f.name}>{f.name}: {f.dataType} {f.isVector ? `(vector ${f.dimension ?? 'unknown'})` : ''}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
