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

## 2026-09-05 — Fases 5–10 + hardening (branch `feature/testa-claudin`, PR #2)
### Added
- Host game board: real table (draw/discard piles with card art, active colour, direction, pending +N, current-turn highlight, per-player hand counts, timer) — Fase 5.
- Multi-round scoring: cumulative scores across rounds, end-of-game at `targetScore` (default 500), `NEXT_ROUND` owner/host message, round/game result overlay with scoreboard.
- UNO challenge (denúncia) in the UI: `unoChallengeable` in public state, "Denunciar <name>" buttons on mobile, "🔥 em UNO" / "⚠️ esqueceu o UNO" banners on host.
- Owner pause / resume: engine freezes the turn timer and restores remaining time; `PAUSE_GAME`/`RESUME_GAME` wired through `Room` and ws-server.
- Post-play colour picker (§25/26): wild is played first, server enters `awaiting_color_choice`, mobile opens a confirm-to-pick modal; timeout auto-picks the most common colour.
- Live event feed on the host from the `GAME_EVENT` stream.
- Fase 10 — event-driven table animations on the host: serial queue drives fly-cards (played→discard, drawn from monte), colour flash, sentido spin, skip flash, "UNO!" burst, "+N" penalty rise, victory burst; result overlay held ~900ms so the winning play lands first. Respects `prefers-reduced-motion`.
- Mobile player screen party visual overhaul: gradient wordmark join screen with labelled fields + avatar grid + live preview; waiting/paused screens with roster; in-game "SUA VEZ" banner + table strip (discard card + colour + pending + sentido); playable cards ringed / non-playable dimmed / selected lifts; "Jogar" shows a mini of the selected card.
- 30s disconnect grace window before owner transfer (identity + hand kept; ownership only moves if the player doesn't reconnect in time).
- Integration tests: 8-player lobby, sustained-play (no errors/desync/deck loss), duplicate-`messageId` idempotency. Server suite now 25 green.
- WebSocket auto-reconnect + exponential backoff on both clients; mobile resumes its session on reload.
- `.claude/launch.json` for local dev servers.

### Changed
- Host and mobile dev ports split (5173 / 5174); QR join URL points to the mobile app.
- `Room.disconnectPlayer` split into `markDisconnected()` + `finalizeDisconnect()`.
- `--passWithNoTests` on shared/host/mobile so root `npm test` is green.
- Replaced the leftover Vite-template `mobile/src/index.css` with a mobile-first themed base.

### Fixed
- Flaky +4/+2 stacking engine tests made deterministic.
- Transient WebSocket error banner that stayed stuck even while the game ran fine.

### Why
- The MVP success criteria (§53) require a full observable match on the host, multi-round scoring, UNO denúncia and reconnection — all delivered here.
- Phones drop Wi-Fi; auto-reconnect + a disconnect grace window keep games stable through blips.

## 2026-09-06 — Multi-game platform plan (no code yet)
### Added
- `C:\Users\gabri\.claude\plans\antes-dos-proximos-passos-elegant-clover.md` — phased plan (Fase A→D) to make the core game-agnostic so a second game plugs in without touching `core/`, `ws-server` or the frontend shell (master prompt §52).
- Comparative analysis of 5 reference repos (rodwilco/rumpus, AndriGitDev/bodbjanar, christabella/freewee, inosaint/amoebas, 8tp/Coup).

### Decisions
- Do **Fase A (game-agnostic core) before finishing Fase 11** — deliberate deviation from the master prompt's linear phase order, because a second complete game is ready and blocked on the abstraction. Polishing UNO visuals now would be reworked once the multi-game shell exists.
- One React shell per role + games as in-bundle modules in a static registry (not per-game apps).
- Keep the "UNO" name for now; §47 own-identity is deferred to Fase C.
- `handleAction(playerId, action)`; server keeps orchestrating state push (optional `tick(now)` capability); core reads a `getStatus()` projection and never parses game events; `GameContext.random` fixes the non-deterministic shuffle.

### Why
- The reference repos confirm our infra already exceeds theirs; the only borrowed idea is rumpus's plugin registry. 8tp/Coup is a rules reference only (its runtime has no TV screen and uses an incompatible stack). Extracting the abstraction first, proven with the existing UNO game, avoids refactoring twice.

## 2026-09-06 — Fase A, PR A1: generic game contract in `shared/` (non-breaking)
### Added
- `shared/src/games/{meta,status,lifecycle}.ts` + `index.ts` barrel, re-exported from `shared/src/index.ts`:
  - `GameMeta` — static per-plugin description (id, name, tagline, min/max players, `capabilities: { rounds, turnTimer, pause }`).
  - `GameStatus` — `'setup' | 'active' | 'intermission' | 'complete'`; the room-facing projection that will replace UNO's `Phase` at the core boundary.
  - `LifecycleEvent` — shell-level events the server emits (`game_selected`, `game_started`, `round_advanced`, `game_completed`, `returned_to_lobby`).
- Wire protocol (`shared/src/protocol/messages.ts`), additive only:
  - `ClientMessage`: `SELECT_GAME { gameId }`, `GAME_ACTION { action: unknown }`; `START_GAME` payload `{}` → `{ gameId?: string }`.
  - `ServerMessage`: `GAME_CATALOG { games: GameMeta[]; selectedGameId }`, `LIFECYCLE_EVENT { event: LifecycleEvent; stateVersion }`.

### Why
- First step of making the core game-agnostic (§52). Pure type additions — no server/host/mobile logic touched, no runtime in `shared/`. All 25 server tests, all 4 builds and both lints stay green. `protocolVersion` stays `1`; nothing emits the new messages yet.

## 2026-09-06 — Fase A, PR A2: server registry + opaque `GameInstance` + game-agnostic `Room`
### Added
- `server/src/core/game-plugin.ts` — `GameContext` (injected `now` + `random`), `GameInstance` (opaque state/events, `getStatus()`), capability interfaces `TurnTimedGame` / `RoundedGame` / `PausableGame` / `TickingGame` + `isX()` guards, `GamePlugin`.
- `server/src/games/registry.ts` — `GAMES` map (rumpus pattern), `DEFAULT_GAME_ID`, `gameCatalog()`. Adding a game = one import + one entry.
- `server/src/games/uno/plugin.ts` (`unoPlugin`) + `server/src/games/uno/action-schema.ts` (`parseUnoAction`, small zod).

### Changed
- `Room` — no UNO imports; `game: GameInstance | null`, `selectedGameId`. `selectGame(gameId)`; `startGame(requestedBy, gameId?)` looks up the plugin and validates against `meta.min/maxPlayers`; `applyGameAction(playerId, action)`; `startNextRound` / `pause` / `resume` / `applyTimeout` capability-guarded. Removed the dead `startTurnTimer()`.
- `UnoGame` — constructor takes `GameContext`; `nowProvider = ctx.now`, shuffle now uses injected `ctx.random` (fixes the determinism gap). Public `handleAction(playerId, action: unknown)` (validates + injects playerId); the switch is now `private dispatch()`. Added `getStatus()` and `getTimer()`. `onTurnTimeout()` returns void. Implements `PausableGame`/`RoundedGame`/`TurnTimedGame`; the old `Game<>` interface (`server/src/core/game.ts`) is deleted (unused).
- `ws-server` — new `SELECT_GAME` and generic `GAME_ACTION` handlers; the 5 UNO verbs kept (rewritten to `room.applyGameAction(playerId, action)`) for a dual protocol during the frontend migration. `GAME_CATALOG` sent on every join. `tickTimers` is capability-gated. `ROOM_STATE.players[].handCount` sent as `0` (redundant; removed in A5). `GAME_STATE_PUBLIC` / `PLAYER_STATE_PRIVATE` / `GAME_EVENT` payload shapes unchanged (server casts `unknown` → UNO types at the boundary — `TODO(A5)`).
- `protocol.ts` — zod for `SELECT_GAME`, `GAME_ACTION`, `START_GAME { gameId? }`.

### Tests
- `uno-game.test.ts` migrated (`mkGame()` helper, `handleAction(playerId, action)`, `getStatus()` assertions, +1 malformed-action test).
- `multiplayer.integration.test.ts` +1 test: catalog on join, `SELECT_GAME` accept/reject, generic `GAME_ACTION` drive, malformed action rejected. **27 server tests green** (stable ×4).

### Why
- The core no longer references any specific game (§52). The old wire is fully backward-compatible for current clients (only `ROOM_STATE.handCount` semantics change, and it has no consumer). Nothing in the frontend changed yet.

## 2026-09-06 — Fase A, PR A3: host split into game-agnostic shell + `games/uno/` module (no wire change)
### Added
- `host/src/shell/` — the game-agnostic host:
  - `messages.ts` — `serverOrigin` / `wsOrigin` / `SAFE_QR_PREFIX`, `makeMessage`, `createMessageId`, `Send` type.
  - `useRoomConnection.ts` — owns the `/room` fetch (with retry), the WebSocket (auto-reconnect + exponential backoff), and message handling. Exposes `{ roomCode, players, joinUrl, joinQrDataUrl, connected, lastError, catalog, selectedGameId, activeGameId, publicState (opaque), events (ordered, capped 24), send }`. `publicState` / `events` are `unknown` here — the game view casts them.
  - `LobbyScreen.tsx` — QR / code / player list / start button; renders the `GAME_CATALOG` grid only when more than one game is registered; `brandName` is a prop (default `"UNO"`, §47).
  - `shell.css` — shell container + lobby styles (was the shell half of `App.css`).
- `host/src/games/{types,registry}.ts` — `HostGameViewProps` (`{ publicState, events, players, connected, send }`), `HOST_GAMES = { uno: UnoHostView }`. Adding a game = one import + one entry.
- `host/src/games/uno/` — the UNO host module:
  - `UnoHostView.tsx` — the whole board render + UNO-derived values + the animation queue (re-driven from the `events` prop) + `renderAnim()` + result/paused overlays. Owner commands go through `props.send(...)`.
  - `describeEvent.ts`, `animations.ts` (`ANIMATION_MS`, `flyStyle`, `isAnimated`, `centre`, `REDUCED_MOTION`), `cardArt.ts` (moved from `host/src/cardArt.ts`), `uno-host.css` (board + Fase 10 animations).

### Changed
- `host/src/App.tsx` → ~55 lines: `useRoomConnection()`, `<LobbyScreen>` until `activeGameId && publicState`, then `HOST_GAMES[activeGameId]`. Knows nothing about UNO.
- `host/src/index.css` — replaced the dead Vite-template block (`--accent:#aa3bff`, `#social`, `h1{56px}`, `body{overflow:hidden}` that fought `App.css`) with a minimal reset + the design tokens (`--bg`/`--panel`/`--line`/`--text`/`--muted`/`--accent`).
- Removed `host/src/App.css` and the leftover template `host/src/assets/` (`hero.png`, `react.svg`, `vite.svg`).

### Tests
- `host` has no unit tests; `tsc -b && vite build`, root `npm run build`, `npm run -w host lint` (oxlint) and the 27 server tests all green. No wire change — the server and mobile are untouched.

### Why
- Proves the host shell carries zero game knowledge: a second game is one `HOST_GAMES` entry + one view module. The connection/lobby/reconnect chrome is now reusable as-is.

## Next planned change
- Fase A, PR A4: mobile shell + session/reconnect subsystem + `mobile/src/games/uno/` (no wire change). Then A5 (drop the legacy UNO verbs, generic `{ gameId, state }` payloads).
