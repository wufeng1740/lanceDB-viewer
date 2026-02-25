---
name: plan-first-coding
description: Prefix-gated workflow skill. Activate only when the first token of the user message is one of: "plan:"/"plan：", "ask:"/"ask：", "sync:"/"sync：", "archive:"/"archive：", or "closure:"/"closure：". Do not activate from semantic intent alone.
---

# Plan-First Coding

## Overview

Enforce a plan-first workflow with minimal, bounded edits, explicit reporting, and structured closure. Keep process artifacts in project-local `workspace/` for multi-AI collaboration.

If instructions conflict, apply this priority:
1. User request
2. Repository `AGENTS.md`
3. This skill workflow

## Keyword Triggers

Strict matching rule: Trigger only when the very first token of the user message is one of these exact prefixes:
- `plan:` or `plan：`
- `ask:` or `ask：`
- `sync:` or `sync：`
- `archive:` or `archive：`
- `closure:` or `closure：`

Non-trigger rule:
- If none of the prefixes above is the first token, this skill must not be applied.
- In non-trigger cases, follow repository defaults and execute the request directly with minimal process overhead.

### plan: / plan：

- Ensure `workspace/` exists.
- Create or update `workspace/plan.md`.
- If `workspace/plan.md` exists but is for a different request, replace it.
- Create or update `workspace/task.md` with executable checklist items using Markdown checkboxes only: `- [ ]` and `- [x]`.
- Put longer analysis or review notes in `workspace/review.md` (or other `workspace/*.md` files).
- Keep chat concise; keep details in `workspace/`.
- Write `workspace/plan.md` using this exact structure:
  1. Goal
  2. Current behavior
  3. Root cause
  4. Proposed solution
  5. Step-by-step implementation plan (file-level)
  6. Risks and edge cases
  7. Verification steps
  8. Rollback strategy
  9. What parts of the system should NOT be changed
- Add a `Point-by-point response` section in chat that answers each user request item by item without omission.

### ask: / ask：

- Treat as a question-only request.
- Do not modify source code files.
- Analyze the project or code as needed to answer.

### sync: / sync：

Perform "Architecture Sync" to ensure all documentation is up-to-date with the changes made. Checklist:
- Update `docs/project_structure.md` (if modules or flows changed).
- Update relevant `docs/*.md` files.
- Update `AppConfig` documentation (if settings were added/changed).
- Update `schemaVersion` documentation (if LanceDB schema changed).
- Update logger event documentation (if new events were added).

### archive: / archive：

- Ensure `workspace/archive/` exists.
- Move completed process files from `workspace/` to `workspace/archive/`.
- Rename each archived file using: `YYYYMMDD_[type]_[target].md`
- Allowed `type`: `plan`, `task`, `review`, `summary`.
- `target` must be kebab-case (`a-z`, `0-9`, `-` only).
- Example: `20260216_plan_file-level-qa-updating.md`

### closure: / closure：

Perform the following two-phase wrap-up:

#### Phase 1: Architecture Sync
Execute the `sync:` logic as defined above.

#### Phase 2: Archive
Execute the `archive:` logic as defined above to move process files from `workspace/` to `workspace/archive/`.

## Workflow

1. Draft a short plan (3-7 steps). Do not edit code yet.
2. Ask for approval only if the plan has major tradeoffs; otherwise proceed.
3. Edit with constraints:
- Change as little as possible and preserve existing architecture.
- Avoid large refactors. Do not change DB schema unless required.
- Define a "Do-not-change list" before edits to prevent scope drift.
- Default to at most 3 edited files per iteration.
- If a complete minimal fix needs 4-5 files, proceed and explain why in the report.
- If more than 5 files are needed, stop and ask.
- If unsure, add TODOs instead of guessing.
4. Always report after edits:
- Files changed.
- What changed.
- How to verify (commands or steps). If not run, say so.
