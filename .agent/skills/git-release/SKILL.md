---
name: git-release
description: Trigger when user says "git release v..." (for example "git release v1.2.3"). Sync versions with tools/version-sync.js, commit release changes, create annotated tag, and push branch + tag to trigger GitHub Actions release workflow.
---

# Git Release

Use this skill when the user asks for a release with a command like `git release v1.2.3`.

## Inputs

- Expected phrase: `git release v...`
- Extract version from the phrase.
- Accepted format: `vX.Y.Z` (example: `v1.4.0`)

## Workflow

1. Validate version format is `vX.Y.Z`.
2. Strip the `v` prefix and run:
   - `node tools/version-sync.js X.Y.Z`
3. Stage all current changes:
   - `git add -A`
4. Create commit:
   - `git commit -m "release: vX.Y.Z"`
5. Create annotated tag:
   - `git tag -a vX.Y.Z -m "vX.Y.Z"`
6. Push branch and tag:
   - `git push origin <current-branch>`
   - `git push origin vX.Y.Z`

## Notes

- Pushing tag `v*` triggers `.github/workflows/release.yml`.
- If commit fails because there are no changes, stop and tell the user.
- If tag already exists locally or remotely, stop and ask user how to proceed.
- This skill intentionally includes all local changes in the release commit to avoid missing workflow/config updates.
