# Tests Layout

- `tests/frontend/smoke.test.ts`: Frontend smoke check for basic test pipeline.
- Rust unit tests are colocated in source modules:
  - `src-tauri/src/services/scanner.rs`
  - `src-tauri/src/services/settings.rs`

## Temp artifacts

If tests need temporary files/databases, use `tests/.tmp/`.
