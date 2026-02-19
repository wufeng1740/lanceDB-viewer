# Task Checklist

- [x] Initialize Tauri v2 + React + TypeScript project skeleton for Windows
- [x] Add Rust DTO models and aligned frontend TS types
- [x] Implement Rust-native LanceDB scanner service (`lancedb` crate)
- [x] Add scanner boundary handling (permission skip, symlink loop guard, tolerant recursion)
- [x] Implement settings persistence for `lastScannedFolder`
- [x] Implement and register Tauri commands for select/scan/list/detail
- [x] Define and implement Rust-to-frontend error category contract and UI message mapping
- [x] Build frontend UI panels and invoke-based data flow
- [x] Add loading/empty/error states and command error handling
- [x] Add minimal Rust tests for scanner/settings plus frontend smoke checks (normal/empty/error path)
- [x] Write README usage notes and MVP limitations (explicitly no Node Sidecar)
- [x] Mark scan progress/cancel as Phase 2 (documented defer, not implemented in MVP)
