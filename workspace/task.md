# Task: Diagnosing Release Failure

## Objective
The GitHub Action release for `v1.1.1` (intended `v1.1.0`) failed during build. Need to investigate the cause, fix it, and then re-release as `v1.1.0`.

## Tasks
- [x] Check GitHub Actions logs to identify the build error
  - *Identified: `rust-cache` action could not find `Cargo.toml` in root directory.*
- [x] Fix the code/config causing the issue
  - Update `.github/workflows/release.yml` to specify `workspaces: "src-tauri -> target"`
- [x] Tag Management: Delete failed `v1.1.0` tag (local & remote)
- [x] Re-trigger release procedure for `v1.1.0`
  - Sync version `1.1.0`
  - Commit, tag, and forcefully push to trigger GitHub Action.
