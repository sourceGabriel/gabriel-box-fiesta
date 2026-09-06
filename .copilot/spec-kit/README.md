# Spec Kit

This folder centralizes the product specification and operating guidance for Copilot and contributors.

## Files
- `master-prompt.md` - the canonical project brief provided by the product owner. **Do not edit.**
- `copilot-operating-standards.md` - repo-specific operating standards and phase-gating workflow.

## Related tracking docs
- `docs/CHANGELOG.md` - dated record of every change + rationale.
- `docs/repository-gap-review.md` - current state vs the master prompt (kept current).
- `.copilot/logs/changes-log.md` - short running log.
- Active implementation plan: `C:\Users\gabri\.claude\plans\antes-dos-proximos-passos-elegant-clover.md`
  (Fase A→D: make the core game-agnostic so a 2nd game plugs in without touching the core — master prompt §52).

## Current roadmap note
Fase A (game-agnostic core) is being done **before** finishing Fase 11 — a deliberate reorder of the master prompt's linear sequence, because a second complete game is ready and blocked on the plugin abstraction. Everything else in the phase-gating workflow still applies.

## Why this exists
This helps keep the project aligned with the original multi-game local party platform vision without drifting into over-engineering or premature feature work.
