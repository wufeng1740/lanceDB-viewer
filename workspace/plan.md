# Plan to Fix Release Failure

## Rationale
The GitHub Actions `release.yml` workflow failed during the `Rust cache` step. The error in the logs was:
`error: could not find 'Cargo.toml' in 'D:\a\lanceDB-viewer\lanceDB-viewer' or any parent directory`
This happened because Tauri's Rust codebase is inside the `src-tauri` directory, but the `swatinem/rust-cache@v2` action defaults to looking for `Cargo.toml` in the repository root. We need to explicitly configure the `workspaces` input for this action.

In addition, since the tag `v1.1.0` has already been pushed and its workflow failed, we must delete the existing tag before recreating it to re-trigger the release.

## Scope Lock
You are ONLY allowed to modify:
- `.github/workflows/release.yml`

You must NOT:
- Modify other files (other than auto-syncing `package.json` / `tauri.conf.json` via version script)
- Change folder structure
- Change schema or architecture

## Plan Details
1. **Fix `release.yml`**:
   - In `.github/workflows/release.yml`, locate the `Rust cache` step.
   - Add the `with` configuration to specify the Tauri workspace:
     ```yaml
           - name: Rust cache
             uses: swatinem/rust-cache@v2
             with:
               workspaces: "src-tauri -> target"
     ```

2. **Re-release Process (Tag Management)**:
   - Since `v1.1.0` was already tagged and pushed, we need to delete it from both local and remote:
     - `git tag -d v1.1.0`
     - `git push origin :refs/tags/v1.1.0`
   - Proceed with the standard `git-release` skill:
     - Run `node tools/version-sync.js 1.1.0`
     - Commit the fix as a new release commit for `v1.1.0`
     - Tag `v1.1.0` and push both branch and tag.

## Verification
- Once the tag `v1.1.0` is forcefully pushed, the GitHub Action will trigger.
- We will monitor the Action (`gh run view`) to ensure the `Rust cache` step passes and the build assets are correctly published.
