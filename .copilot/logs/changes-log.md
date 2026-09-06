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

## 2026-09-06 — Claude Code config for efficiency (branch `feature/claude-config`, off `ec44dff`)
- New `.claude/`: `settings.json` (Read-deny on `package-lock.json` / card `*.png` / `*.min.*`; Bash allow for safe read-only `npm`/`npx`/`git`/`gh` commands; `Stop` typecheck hook), `hooks/typecheck-on-stop.mjs`, `commands/{validate,run,checkpoint,phase}.md`, `launch.json` (un-ignored + committed).
- `CLAUDE.md`: added a "Working efficiently" section; validation block references `/validate` and stops hardcoding the test count. (The "Current state / Fase A" section stays — kept in full by the user.)
- `.gitignore`: un-ignore `.claude/launch.json`; ignore `.claude/settings.local.json`.
- Config only — no app code touched. Goal: fewer permission prompts, no accidental token-heavy reads, type errors caught in the same turn.

## 2026-09-06 — Fase A / PR A4 (branch `feature/coup-ou-coupa`)
- New: `mobile/src/shell/` — `session.ts` (reconnect subsystem, extracted verbatim: same localStorage key formats + recovery), `useRoomConnection.ts` (WS + backoff + `RECONNECT_SESSION` + token persistence + `joinOrReconnect`), `messages.ts`, `MobileHeader.tsx`, `JoinScreen.tsx`, `WaitingScreen.tsx` (shows selected game name), `shell.css`. `publicState`/`privateState` opaque.
- New: `mobile/src/games/{types,registry}.ts` (`ControllerGameViewProps`, `CONTROLLER_GAMES = { uno: UnoControllerView }`) + `mobile/src/games/uno/` (`UnoControllerView.tsx` — still emits the legacy UNO verbs, `cardArt.ts` moved, `uno-controller.css`).
- `mobile/src/App.tsx` → ~70-line dispatcher (`JoinScreen` → `WaitingScreen` until `privateState && publicState && registered game` → controller view; renders the error toast). Shell now handles `GAME_CATALOG` + `GAME_STARTED`; infers active game on mid-game reconnect.
- Removed template `mobile/src/assets/`. No wire change. Builds + host/mobile lint + server tsc + 27 server tests green; browser smoke (join / waiting / play / mid-game reload / waiting reload) passed.

## 2026-09-06 — Fase B design elaborated (no code yet)
- Decided with the user: the **TV/host is the control point** for game selection (phones never show a catalog); `assertOwner` already allows `role:'host'` so no server auth change.
- Host gets a **3-screen pre-match flow**: `attract` ("Box Fiesta" wordmark + room code + connected count) → `catalog` (game grid from `GAME_CATALOG`, cover art from the host game module, arrows+Enter / click / touch) → `lobby` (big QR + players + "Iniciar {game}"). Catalog grid moves out of `LobbyScreen`.
- Post-match → back to the **lobby of the same game** ("Jogar de novo" = re-`START_GAME`, "Trocar de jogo" → `catalog`). No new wire messages (reuses `END_GAME`/`START_GAME`).
- Server change queued for Fase B: `Room.endGame()` → `state='accepting_players'` keeping `selectedGameId` (today `'ended'` blocks `selectGame`); re-broadcast `GAME_CATALOG` after `END_GAME`.
- Order unchanged: Fase A finishes (A5) first, then Fase B. Full detail in the plan file's FASE B section + `docs/CHANGELOG.md`.

## 2026-09-06 — Fase A / PR A5 (branch `feature/coup-ou-coupa`) — BREAKING wire
- `shared`: dropped 5 legacy UNO client verbs (only `GAME_ACTION` left); `GAME_STATE_PUBLIC`/`PLAYER_STATE_PRIVATE`/`GAME_EVENT` → `{ gameId, state|event: unknown, stateVersion }`; `GAME_STARTED` → `{ gameId }`; `ROOM_STATE` lost `handCount`. `events/game-events.ts` → `games/uno/events.ts` (`UnoGameEvent`, 4 dead variants dropped). `Direction`/`Phase` moved `common.ts` → `models/uno.ts` (`Direction`, `UnoPhase`).
- `server`: `ws-server` deleted the 5 UNO verb handlers, adds `gameId` to the 3 broadcasts + `GAME_STARTED`, no boundary casts; `protocol.ts` dropped the 5 UNO zod schemas + `color` enum; `uno-game.ts` `GameEvent`→`UnoGameEvent`.
- `host`/`mobile`: `useRoomConnection` resolves `activeGameId` from `payload.gameId`; host UNO module `GameEvent`→`UnoGameEvent`; `UnoControllerView` senders → `send('GAME_ACTION', { action: {...} })`.
- Tests: `multiplayer.integration.test.ts` migrated (`gameAction()` helper + `pubState()`/`privState()` casts + `gameId` asserts). 27 server tests green; builds + host/mobile oxlint + server tsc green; browser smoke incl. mid-game reload passed.
- **Fase A (game-agnostic core, §52) is complete.** Next: Fase B.

## 2026-09-06 — Fase B (branch `feature/coup-ou-coupa`) — 3-screen host flow + return-to-lobby
- `host`: new `shell/AttractScreen.tsx` ("Box Fiesta" wordmark, room code, phone count, manual advance, no QR), `shell/CatalogScreen.tsx` (game grid + cover art, keyboard + click nav, no QR), `games/uno/UnoCover.tsx` (inline SVG cover). `HOST_GAMES` entries → `{ View, Cover }`. `App.tsx` flow machine `attract | catalog | lobby` (in-game wins; game-end → lobby). `LobbyScreen` loses the catalog grid, gains "Trocar de jogo" + game name/tagline; QR only here.
- `server`: `Room.endGame()` → `state='accepting_players'` keeping `selectedGameId` (`'ended'` removed from `RoomState`); `ws-server` re-broadcasts `GAME_CATALOG` after `END_GAME`.
- `mobile`: `useRoomConnection` handles `GAME_ENDED` (→ waiting, session kept); `WaitingScreen` shows game name + tagline.
- Tests: `room.test.ts` +1 (endGame → accepting_players + selectedGameId kept + play-again/switch work). **28 server tests green.** Builds + host/mobile oxlint + server tsc green; browser smoke of the full loop passed.
- Decisions applied: QR only on lobby, attract advances manually, UNO cover generated as inline SVG. No new wire messages.
- Next: **Fase C** (`@party/ui` design system + synth Web Audio sounds; folds in Fase 11 §47).

## 2026-09-06 — Fase C / PR C1 (branch `feature/coup-ou-coupa`)
- New workspace `ui/` (`@party/ui`) — cross-app React/CSS/audio home; consumed as source by Vite; added to root `workspaces`; `host`+`mobile` get `file:../ui` dep.
- `ui/src/tokens.css` — single source of design tokens; imported per app in `main.tsx`. Resolved host/mobile token divergence (canonical `--panel #161d29`, `--panel-2 #1d2634`, `--line #2b3646`, `--muted #94a3b8`).
- `host`/`mobile` `index.css` keep only the reset (+ mobile keeps its gradient + `--uno-*`). Builds (5 ws) + lints + 28 server tests green; browser smoke visually unchanged.
- Next: C2 (shared components), C3 (synth sounds), C4 (consolidate `cardArt.ts`). §47 "UNO" name kept.

## 2026-09-06 — Fase C / PR C2 (branch `feature/coup-ou-coupa`)
- New `ui/src/components/` + `components.css`: `BrandMark` (game/platform variant — §47 rename point), `Button`, `Panel`, `Overlay`, `Timer` (warn + active glow), `QrPanel`, `PlayerRoster` (list/pills).
- Retrofit: host Attract/Catalog/Lobby + `UnoHostView` (BrandMark, Timer, Overlay, Button); mobile Join/Waiting + `UnoControllerView` (Timer, Button).
- Removed ~116 lines of now-duplicated CSS across host `shell.css`/`uno-host.css` and mobile `shell.css`/`uno-controller.css`. `vite.config` both got `optimizeDeps.exclude: ['@party/ui']`.
- Builds (5 ws) + host/mobile oxlint + server tsc + 28 tests green; browser smoke of every screen unchanged.
- Next: C3 (synth sounds), C4 (consolidate cardArt).

## 2026-09-06 — Fase C / PR C3 (branch `feature/coup-ou-coupa`)
- `ui/src/sound.ts` — synth Web Audio engine (no files, §47): `createSounds(ctx?)` (test-injectable) + `getSounds()` singleton; sounds `cardPlay`/`draw`/`turn`/`special`/`uno`/`win`/`error`/`select`; one-time gesture listener resumes the ctx; mute persists in `localStorage[party:sound]`; silent no-op fallback.
- `host/src/games/uno/sound-map.ts` — `soundForEvent(UnoGameEvent)`; wired into `UnoHostView` (per fresh event, before the reduced-motion guard) + a mute ghost button.
- `ui/src/sound.test.ts` (3 tests, fake AudioContext). Builds (5 ws) + host/mobile oxlint + server tsc + 28 server tests green; browser smoke confirmed oscillators created per event and mute silences them.
- Mobile stays silent for now. Next: C4 (consolidate `cardArt.ts`) closes Fase C.

## 2026-09-06 — Fase C / PR C4 (branch `feature/coup-ou-coupa`) — Fase C complete
- `host`/`mobile` `games/uno/cardArt.ts` (near-identical) → `ui/src/uno-cards.ts` (`@party/ui/uno-cards`). `getCardBackArt` unified to `wildColor` (host behaviour). `ui/src/assets.d.ts` ambient `*.png`.
- Both UNO views import from `@party/ui/uno-cards`; crops stay at repo root (`../../uno_card_sheet_crops/`). 55 PNGs still emitted per app; browser smoke: host board + mobile hand show real card art.
- **Fase C done.** `@party/ui` = tokens + components + sounds + uno-cards; no duplicated frontend code between the apps. §47 "UNO" name kept (`BrandMark.text` = single rename point).
- Next: **Fase D** (integrate game #2 — repo pending from user).

## 2026-09-06 — Fase D (branch `feature/coupzin`) — Coup as game #2 (classic)
- **D1** `shared/src/models/coup.ts` + `shared/src/games/coup/events.ts` (types-only; string values == server enum values).
- **D2** `server/src/games/coup/` ported from `Jogos/Coup/src/engine/` classic-only (no Reformation): `deck`/`player`/`game` (injected `ctx.random`/`ctx.now`), `action-resolver`, `coup-game.ts` (`CoupGame implements PausableGame, TurnTimedGame` — absorbs the standalone `GameEngine`; no `setTimeout`, one deadline via `getTimer()`/`onTurnTimeout()`; 1-influence forced losses auto-resolve), `action-schema.ts` (zod, 9 intents), `plugin.ts`. Registry +1. `coup-game.test.ts` (27) + integration Coup path. **56 → 57 server tests** (D5 adds 1).
- **D3** `host/src/games/coup/` (`CoupHostView` + `CoupCover` + `describeEvent` + `coupCards` + css). Registry +1.
- **D4** `mobile/src/games/coup/` (`CoupControllerView` — one prompt per `pendingDecision` + `HowToPlay` overlay). Registry +1.
- **D5** generic emoji reactions: `SEND_REACTION`/`REACTION` in `shared/protocol` + `ws-server` rebroadcast (1.2s cooldown) + `reactions: LiveReaction[]` in both `useRoomConnection` + threaded to game views. Coup UI: controller emoji bar + TV/controller bubbles. `multiplayer.integration.test.ts` +1.
- **§52 proof held:** the game touched zero `core/`/`ws-server`/shell/`shared/protocol` files; only D5 (a platform feature) touched protocol + shells.
- Live smoke (host + 2 phones): full Coup match incl. bluff→challenge→reveal→influence-loss→turn-advance, pause/resume, 2-player endgame, game-over overlay, "Nova partida", reaction bubble on TV. No errors. server tsc + host/mobile oxlint + build (5 ws) green.
- **Deferred from v1:** D6 polish (sound-map, card-flip anim), bots (needs platform "virtual player" concept — Coup's `BotBrain` is ~1100 lines pure TS), Reformation expansion.
- Committed as 5 commits (D1–D5) on `feature/coupzin`.
