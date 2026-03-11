# Release Fix Walkthrough

## Issue
The GitHub Actions release workflow for `v1.1.0` (originally tagged `v1.1.1` then requested as `v1.1.0`) was failing inside the `Rust cache` step.
The root cause was that `swatinem/rust-cache@v2` defaults to looking for `Cargo.toml` in the repository root (`./Cargo.toml`), but in Tauri apps, the Rust backend is located inside the `./src-tauri` workspace.

## Resolution
1. **GitHub Workflow Fix**: Fixed `.github/workflows/release.yml` by explicitly setting `workspaces` for the `Rust cache` step:
   ```yaml
      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: "src-tauri -> target"
   ```

2. **Tag Cleanup**: The failed `v1.1.0` tag was present both locally and remotely, blocking a fresh release. It was automatically deleted from both ends:
   ```bash
   git tag -d v1.1.0
   git push origin :refs/tags/v1.1.0
   ```

3. **Re-Release Execution**: Used the project's internal sync script to ensure `package.json` and `tauri.conf.json` were on the correct `1.1.0` version, collected the changed `release.yml` into a new release commit, re-tagged `v1.1.0`, and pushed the branch and tag.

## Verification
- We monitored the newly triggered GitHub Action for `v1.1.0`.
- The `Rust cache` step successfully cached targets and the pipeline proceeded directly to the `Build and publish release assets` step on all platforms without errors.
