# Changelog

## 2026-09-04
### Added
- Creation of repo-level Copilot guidance at `.github/copilot-instructions.md`.
- Creation of the `spec-kit` folder with:
  - `.copilot/spec-kit/master-prompt.md`
  - `.copilot/spec-kit/copilot-operating-standards.md`
  - `.copilot/spec-kit/README.md`
- Creation of `docs/repository-gap-review.md` to record project gaps versus the master prompt.
- Creation of this changelog with reasons for each addition.

### Fixed
- Backend CORS issue for local host origin.
- Host authorization flow for `START_GAME` when the host acts as room owner.

### Why
- The project requires a strong architecture guide and phase-gated execution to avoid drifting away from the intended local multiplayer party-game platform.
- The host permission bug was preventing the room owner from starting the match even though the owner role exists.
- The host UI still does not render the game board, so a dedicated gap review was needed to document the missing phase and guide the next implementation step.

## Next planned change
- Implement the host game board and public game-state rendering from `GAME_STATE_PUBLIC`.
- Use this change log as the durable record of modifications and rationale.
