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

## 2026-09-06 — Fase A / PR A1 (branch `feature/coup-ou-coupa`)
- `shared/src/games/{meta,status,lifecycle,index}.ts`: `GameMeta`, `GameStatus` (`setup|active|intermission|complete`), `LifecycleEvent`.
- `shared/src/protocol/messages.ts` (additive): `SELECT_GAME`, `GAME_ACTION { action: unknown }`, `START_GAME { gameId? }`, `GAME_CATALOG`, `LIFECYCLE_EVENT`.
- Non-breaking: no server/host/mobile logic changed, `shared/` stays types-only, 25 server tests + 4 builds + 2 lints green. Nothing emits the new messages yet — that's PR A2.

## 2026-09-06 — Fase A / PR A2 (branch `feature/coup-ou-coupa`)
- New: `server/src/core/game-plugin.ts` (`GamePlugin`, `GameInstance`, `GameContext`, capability interfaces + guards), `server/src/games/registry.ts` (`GAMES`), `server/src/games/uno/{plugin,action-schema}.ts`.
- `Room` is game-agnostic (`GameInstance`, `selectGame`, plugin-driven `startGame`, `applyGameAction(playerId, action)`, capability guards). `server/src/core/game.ts` deleted.
- `UnoGame`: `GameContext` ctor, injected RNG (determinism fix), `handleAction(playerId, unknown)` + private `dispatch`, `getStatus()`, `getTimer()`.
- `ws-server`: `SELECT_GAME` + `GAME_ACTION` handlers; 5 legacy UNO verbs kept (dual protocol); `GAME_CATALOG` on join; capability-gated timer tick. Wire state/event payload shapes unchanged (boundary casts, `TODO(A5)`).
- Tests migrated + 2 new; 27 server tests green (stable ×4). No frontend changes. Backward-compatible except `ROOM_STATE.handCount` → `0` (no consumer).

## 2026-09-06 — Fase A / PR A3 (branch `feature/coup-ou-coupa`)
- New: `host/src/shell/` (`messages.ts`, `useRoomConnection.ts`, `LobbyScreen.tsx`, `shell.css`) — game-agnostic connection + lobby + chrome; `useRoomConnection` exposes `publicState`/`events` as opaque `unknown`.
- New: `host/src/games/{types,registry}.ts` (`HostGameViewProps`, `HOST_GAMES = { uno: UnoHostView }`) + `host/src/games/uno/` (`UnoHostView.tsx`, `describeEvent.ts`, `animations.ts`, `cardArt.ts` moved, `uno-host.css`).
- `host/src/App.tsx` → ~55-line dispatcher (lobby until `activeGameId && publicState`, then `HOST_GAMES[activeGameId]`). No UNO knowledge in the shell.
- `host/src/index.css` dead Vite-template block replaced with a minimal reset + design tokens; `host/src/App.css` and template `host/src/assets/` removed.
- No wire change (server + mobile untouched). Host build + root build + `npm run -w host lint` + 27 server tests green.
