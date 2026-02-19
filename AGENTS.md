# Project AI Agent Entry

This file defines project-level agent behavior for all assistants used in this repository, including Codex, Claude, Gemini, Copilot, and Cursor-based agents.

## Required startup sequence

1. Read this file first.
2. Read project rules under `/.agent/rules/`.
3. Discover skills from `/.agent/skills/` by loading each `SKILL.md` in direct subfolders when relevant.
4. Apply only the minimal set of relevant skills for the current request.

## Skill loading policy

- Treat `/.agent/skills/` as the project-level skill registry.
- Do not hardcode to a single skill path.
- If multiple skills apply, follow all applicable skills in a conflict-free way.
- If a skill conflicts with repository rules, use this priority:
1. User request
2. `AGENTS.md`
3. Files in `/.agent/rules/`
4. Individual `/.agent/skills/*/SKILL.md`

## Shared workflow artifacts

- Store process artifacts in `workspace/`:
- `workspace/plan.md`
- `workspace/task.md`
- `workspace/review.md`
- Archive completed artifacts in `workspace/archive/` with normalized names.

## Codex-specific note

Codex should treat this file as the primary project entrypoint and must load relevant skills from `/.agent/skills/` instead of relying only on global/default skills.

