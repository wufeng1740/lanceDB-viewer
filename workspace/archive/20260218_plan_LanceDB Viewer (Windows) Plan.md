# LanceDB Viewer (Windows) Plan - Tauri Native (Personal MVP)

## 1. Goal
Build a simple Windows desktop app for personal use that can:
- recursively scan a selected folder for all LanceDB datasets,
- list discovered databases and tables quickly,
- show table-level metadata without requiring users to understand vector internals,
- provide a lightweight frontend for browsing and interaction,
- remember the last scanned folder for next launch.

## 2. Current behavior
- There is currently no implementation for a LanceDB viewer in this repository.
- No scan/index/cache flow exists.
- No UI exists for LanceDB browsing.
- No persisted app settings exist yet.

## 3. Root cause
- The project is new and has no runtime shell or feature modules yet.
- No native backend exists to handle filesystem + LanceDB metadata operations.

## 4. Proposed solution
Use a minimal Tauri-native architecture:
- Backend: Tauri v2 Rust commands for all system calls and LanceDB operations.
- Frontend: React + TypeScript UI only (no Node runtime logic).
- Data exchange: typed JSON DTOs returned via `invoke` from Rust commands.
- Persistence: Tauri plugin store (or local JSON through Rust) for `lastScannedFolder`.

MVP metadata policy:
- Always show: database path, table name, schema fields.
- Show row count if cheap/available.
- For vector fields: show `hasVector` and `dimension` when available; otherwise `dimension: unknown`.
- Explicit error contract:
  - Rust side returns categorized errors (`invalid_path`, `permission_denied`, `open_failed`, `metadata_unavailable`, `unknown`).
  - Frontend maps categories to friendly messages and keeps raw detail for debug panel/log.
- Scan boundary policy:
  - Default recursive scan with tolerant error skipping.
  - Skip directories that cannot be accessed and continue scanning.
  - Avoid symlink loop traversal.
  - Keep hidden/system folder policy simple: include by default unless known problematic.
- Scope decision for personal MVP:
  - No progress bar and no cancellation in Phase 1.
  - Keep these as Phase 2 enhancements if real-world scan latency becomes a pain point.

## 5. Step-by-step implementation plan (file-level)
1. Bootstrap Tauri app shell
- Create Tauri v2 + React + TypeScript project structure.
- Add `src-tauri/src/main.rs` and frontend entry files.

2. Define command contracts and DTOs
- Add Rust DTOs in `src-tauri/src/models.rs`.
- Add frontend API types in `src/lib/types.ts`.
- Keep field names stable and aligned between Rust and frontend.

3. Implement native scanner service in Rust
- Add `src-tauri/src/services/scanner.rs`:
  - recursive directory walk,
  - LanceDB candidate detection,
  - open LanceDB via Rust `lancedb` crate,
  - enumerate tables and extract metadata.

4. Implement settings persistence
- Add `src-tauri/src/services/settings.rs`:
  - load/save `lastScannedFolder`,
  - tolerant read/write with fallback defaults.

5. Wire Tauri commands
- Add `src-tauri/src/commands.rs`:
  - `select_folder` (dialog),
  - `scan_folder`,
  - `get_last_scanned_folder`,
  - `get_table_details`.
- Register commands in `src-tauri/src/main.rs`.

6. Build frontend UI
- Add `src/App.tsx` and component files:
  - folder picker + rescan,
  - DB/table list panel,
  - table detail panel,
  - loading/empty/error states.
- Frontend only calls Tauri commands; no filesystem logic in TS.

7. Add tests and docs
- Add Rust unit tests for scanner/settings logic where practical.
- Add frontend smoke tests for rendering states.
- Add README with Windows run/build instructions and known limits.
- Add small test fixture notes for: normal LanceDB folder, empty folder, and one error case.

## 6. Risks and edge cases
- LanceDB crate API/version differences may affect metadata access.
- Deep recursive scans on large disks may be slow; progress/cancellation is intentionally deferred for MVP.
- Some tables may not expose cheap row count.
- Vector dimension may be implicit/missing; `unknown` must be first-class.
- Windows permission or locked-file errors must be surfaced clearly.
- Symlink loops or unusual directory structures may impact scan stability if not guarded.

## 7. Verification steps
Personal-project acceptance (lightweight, not strict benchmarks):
- On Windows, launch app and select a folder with multiple LanceDB datasets.
- Confirm database and table lists appear and are usable without obvious blocking/hang.
- Confirm table details show schema and vector summary (`hasVector`, `dimension` or `unknown`).
- Restart app and verify last scanned folder is restored.
- Scan a folder without LanceDB and verify friendly empty state.
- Scan a folder containing at least one inaccessible/broken path and verify scan continues with surfaced warning/error.
- Validate that app works without Node Sidecar process.

## 8. Rollback strategy
- Keep modules isolated (commands/services/models/components).
- If scanner is unstable, keep app shell and disable scan command bindings.
- Revert newly added Tauri modules as one boundary.
- Use milestone commits per phase (shell, scanner, commands, UI) to simplify rollback.

## 9. What parts of the system should NOT be changed
- Do not alter LanceDB on disk (read-only access only).
- Do not mutate table schema or table data.
- Do not introduce Node Sidecar.
- Do not add cloud/network dependencies for MVP.
- Do not expand scope to write/edit features in this phase.
