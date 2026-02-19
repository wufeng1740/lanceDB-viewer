---
trigger: always_on
---

Project Coding Rule

# Gemini Project Instructions

Follow `AGENTS.md` at repository root as the primary instruction source.

Then:

1. Load relevant project rules from `/.agent/rules/`.
2. Discover and apply relevant skills from `/.agent/skills/*/SKILL.md`.
3. Keep planning/execution artifacts in `workspace/` and archive to `workspace/archive/`.

Do not bind to one fixed skill path. Choose the minimal relevant skill set for the current request.


# project structure
- read docs/project_structure.md for project structure or architecture if needed

tests
- for any test file, saved in the corresponding category in the tests/ folder
- after adding any test file, updated the README.md in tests/ to include the new test file
- anything that would potentially created by test file, such as database, should saved into tests/.tmp