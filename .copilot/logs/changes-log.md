# Change log

## 2026-09-04
- Review completed against the master prompt.
- Saved repo-level Copilot guidance in `.github/copilot-instructions.md`.
- Saved spec kit under `.copilot/spec-kit/`.
- Added repository review in `docs/repository-gap-review.md`.
- Added changelog in `docs/CHANGELOG.md`.
- Identified the main remaining gap: host game board rendering is still missing despite server state and game start working.

## Rationale
The project is currently between the room lifecycle phase and the actual host game board phase. The backend can start the match and broadcast public game state, but the host application still fails to render the UNO table, which blocks complete gameplay validation and violates the MVP objective described in the master prompt.

## 2026-09-05
- Delivered Fases 5–10 + hardening on branch `feature/testa-claudin` (PR #2): host game board, multi-round scoring + end-of-game + `NEXT_ROUND`, UNO challenge UI, owner pause/resume, post-play colour modal (§25/26), host event feed, Fase 10 event-driven animations, mobile party visual overhaul, 30s disconnect grace, auto-reconnect + backoff, +3 integration tests (server suite 25 green).
- See `docs/CHANGELOG.md` (2026-09-05 entry) for the itemised list and rationale.

## 2026-09-06
- Reviewed the ChatGPT-drafted multi-game plan; fetched and analysed 5 reference repos (rodwilco/rumpus, AndriGitDev/bodbjanar, christabella/freewee, inosaint/amoebas, 8tp/Coup).
- Wrote the phased plan `C:\Users\gabri\.claude\plans\antes-dos-proximos-passos-elegant-clover.md` (Fase A→D) to make the core game-agnostic (master prompt §52) without touching `core/`/`ws-server`/frontend shell when a new game is added.
- Refreshed `docs/repository-gap-review.md` and `docs/CHANGELOG.md` to current reality (they were frozen at 2026-09-04).

## Rationale (2026-09-06)
- The 4 platform reference repos are small and immature; our infra already exceeds them. Only rumpus's plugin-registry pattern is worth borrowing. 8tp/Coup is a rules reference only (mobile-first, no TV screen, incompatible stack).
- A second complete game is ready in a separate repo. Doing the core abstraction first (proven with the existing UNO game) — a deliberate reorder ahead of Fase 11 — avoids refactoring the frontend twice.
