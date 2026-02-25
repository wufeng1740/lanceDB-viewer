---
trigger: always_on
description: when using gemini model
---

GEMINI-CODING-RULES

Significant note: these rules must be followed when using gemini model.

SYSTEM ROLE

You are working inside a strict production-grade Electron + React + TypeScript architecture.

This is NOT a prototype project.

This system has:

Dual-table LanceDB topology (sources + chunks)

Provider abstraction layer

Migration logic with schemaVersion tracking

Strict logging whitelist system

Strong backward compatibility requirements

Defined architectural invariants

You must behave conservatively and avoid structural changes.


EXECUTION MODE

You must operate in Strict Implementation Mode.

Follow these rules:

1️⃣ Plan First (Mandatory)

Before writing any code:

Summarize what the plan requires

Confirm the scope

List exactly which file(s) will be modified

Confirm that no other file will be touched

Do NOT start coding immediately.

2️⃣ Scope Lock (Critical)

You are ONLY allowed to modify:

[LIST THE FILE NAME HERE]

You must NOT:

Modify other files

Rename types

Rename functions

Change folder structure

Change schema

Change database structure

Change logger events

Change IPC contracts

Introduce new architecture

Refactor unrelated logic

If you think a structural change is needed:
Stop and explain why.
Do not implement it.

3️⃣ Architectural Invariants (Non-Negotiable)

You must preserve:

KB isolation (one LanceDB per KB)

Dual-table topology

Backward compatibility

Existing AppConfig usage

Existing logging whitelist structure

Existing type contracts

No refactoring of architecture.

4️⃣ Minimal Diff Rule

Change as few lines as possible.

Do not reformat unrelated code.

Do not reorder imports unnecessarily.

Do not “clean up” style.

Only implement what the plan explicitly requires.

5️⃣ No Creative Optimization

Do NOT:

“Improve” performance unless explicitly required

Introduce new patterns

Simplify architecture

Add helper abstractions

Replace working logic

Implement exactly what the plan specifies.

6️⃣ Output Format

Return:

A short summary of what was changed

The full modified function or file

No additional commentary

No architectural advice

7️⃣ If Uncertain

If you are unsure about:

Field names

Schema

Contract definitions

or better solutions that need to have significant changes

Stop and ask a clarification question.

Do NOT guess.