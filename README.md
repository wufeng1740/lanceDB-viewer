# LanceDB Viewer (Windows MVP)

A personal-use desktop viewer for browsing LanceDB datasets with Tauri (Rust backend) + React (UI).

## MVP scope

- Recursively scan a selected folder for LanceDB datasets.
- List databases and tables.
- Show table schema fields and vector summary (`hasVector`, `dimension`/`unknown`).
- Remember the last scanned folder.
- Read-only metadata browsing (no data/schema mutation).

## Not in MVP

- No write/edit/export actions.
- No Node sidecar.
- No progress/cancel UI yet (Phase 2 candidate).

## Development

1. Install dependencies:
   - Node.js 20+
   - Rust stable toolchain
2. Install frontend deps:
   - `npm install`
3. Run app:
   - `npm run dev`
   - In another shell: `cargo tauri dev` (run from `src-tauri/` or via Tauri CLI setup)

## Tests

- Frontend smoke:
  - `npm test`
- Rust unit tests:
  - `cargo test` (inside `src-tauri/`)

## Known limits

- Large recursive scans may be slow.
- Some row counts and vector dimensions may be unavailable and shown as unknown.
- Permission-restricted folders are skipped with warnings.
