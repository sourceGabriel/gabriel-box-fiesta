---
description: Start a phase-gated work slice per the operating standards
argument-hint: <phase/PR id, e.g. A4>
---
Start work on phase/PR **$ARGUMENTS**.

1. Read the active plan file (path in `CLAUDE.md`) and `.copilot/spec-kit/copilot-operating-standards.md`.
2. State, before touching code:
   - the goal of this slice
   - files in scope
   - the acceptance bar (`/validate` green, tracking docs updated, app still runnable)
   - what is explicitly **out of scope** for this slice
3. Wait for my confirmation before writing code.

Phase-gate rules: one PR = one scope · app stays runnable · `/validate` green before handoff · `/checkpoint` before handoff · never `git commit` without my explicit OK.
