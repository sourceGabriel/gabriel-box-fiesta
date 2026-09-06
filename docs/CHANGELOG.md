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

## 2026-09-06 — Claude Code config for efficiency + token reduction (branch `feature/claude-config`)
### Added
- `.claude/settings.json` — `permissions.deny` on Read of `package-lock.json`, the card `*.png` files and `*.min.*` (stops token-heavy reads); `permissions.allow` for safe read-only Bash (`npm test`/`build`/`lint`, `npx tsc`/`vitest`/`tsx`, read-only `git`, read-only `gh pr/run/issue`) so those stop prompting.
- `.claude/hooks/typecheck-on-stop.mjs` + a `Stop` hook — if `server/`/`shared/` have uncommitted changes, runs `tsc --noEmit` when Claude finishes; silent on success, surfaces type errors (exit 2) so they're fixed in the same turn.
- `.claude/commands/{validate,run,checkpoint,phase}.md` — slash commands for the repeated rituals.
- `.claude/launch.json` — committed (was gitignored) so `/run` works in every worktree; ports are fixed so it's not worktree-specific.

### Changed
- `CLAUDE.md` — added a "Working efficiently" section (terse-by-default, `Explore`-subagent-first, deny list, commands); validation block references `/validate` and no longer hardcodes a test count.
- `.gitignore` — un-ignore `.claude/launch.json`; ignore `.claude/settings.local.json` (personal grants).

### Why
- Every permission prompt is a round-trip and every accidental read of `package-lock.json` (~25k tokens) or a card PNG is wasted context. The deny/allow lists and the terse/subagent defaults cut token use per session; the `Stop` typecheck catches errors in one turn instead of a fix-up pass; the commands collapse multi-turn rituals into one.

## 2026-09-06 — Fase A, PR A4: mobile split into shell (+ session subsystem) + `games/uno/` (no wire change)
### Added
- `mobile/src/shell/` — the game-agnostic phone controller:
  - `session.ts` — the reconnect subsystem, extracted verbatim: `activeSessionStorageKey` / `sessionKeyFor` / `readStoredSessionKey` / `readToken` / `writeToken` / `rememberActiveSession` / `clearStoredSession`. Same two localStorage entries per room (`activeSession:<ROOM>` → key, `session:<ROOM>:<name>` → signed token), same key formats.
  - `useRoomConnection.ts` — owns the WebSocket (auto-reconnect + backoff), `RECONNECT_SESSION` on open when a token is held, token persistence on `ROOM_JOINED`, `INVALID_SESSION`/`PLAYER_NOT_FOUND` recovery, and `joinOrReconnect({ playerName, avatar })`. Exposes `{ roomCode, setRoomCode, playerId, connected, error, roomPlayers, catalog, selectedGameId, activeGameId, publicState, privateState, send, joinOrReconnect }`. `publicState`/`privateState` opaque.
  - `messages.ts` (`makeMessage`, `getRoomCodeFromPath`, `Send`), `MobileHeader.tsx` (room + reconnecting pill, `children` slot for the game's timer), `JoinScreen.tsx`, `WaitingScreen.tsx` (shows the selected game's name from the catalog), `shell.css`.
- `mobile/src/games/{types,registry}.ts` — `ControllerGameViewProps` (`{ publicState, privateState, playerId, connected, roomCode, send }`), `CONTROLLER_GAMES = { uno: UnoControllerView }`.
- `mobile/src/games/uno/` — `UnoControllerView.tsx` (table strip + hand + actions + UNO/challenge + result + colour modal + paused; still emits the legacy verbs `PLAY_CARD`/`DRAW_CARD`/`CHOOSE_COLOR`/`UNO_CALL`/`UNO_CHALLENGE`), `cardArt.ts` (moved), `uno-controller.css`.

### Changed
- `mobile/src/App.tsx` → ~70-line dispatcher: `JoinScreen` until `playerId`, `WaitingScreen` until `privateState && publicState && a registered game`, else the game's controller view. Renders the shared error toast. No UNO knowledge.
- Removed the leftover template `mobile/src/assets/`. `mobile/src/index.css` (already a proper mobile-first base since 2026-09-05) unchanged.
- New (existing server messages the flat app ignored): the shell handles `GAME_CATALOG` (catalog + selected game) and `GAME_STARTED` (sets the active game); on a mid-game reconnect it infers the active game from the selection when the first state arrives.

### Tests
- `mobile` has no unit tests. Builds (mobile, root), oxlint (host + mobile), server `tsc --noEmit`, and the 27 server tests all green. Browser smoke: join → waiting (with game name) → host starts → controller board → play a card (state propagates to both phones + host) → reload a phone mid-game (session resumes, board restored) → reload while waiting (silently resumes as the same player). No wire change.

### Why
- The phone controller's connection + session/reconnect chrome is now a reusable shell; a second game is one `CONTROLLER_GAMES` entry + one view module. The reconnect subsystem — the client's most delicate part — was moved without changing any key format, message, or recovery path.

## 2026-09-06 — Fase A, PR A5: protocol cleanup — generic wire, no UNO in the core (BREAKING wire)
### Changed — `shared`
- `ClientMessage`: removed `PLAY_CARD` / `DRAW_CARD` / `CHOOSE_COLOR` / `UNO_CALL` / `UNO_CHALLENGE`. `GAME_ACTION { action: unknown }` is the only per-game verb.
- `ServerMessage`: `GAME_STARTED` → `{ gameId }`; `GAME_STATE_PUBLIC` / `PLAYER_STATE_PRIVATE` → `{ gameId; state: unknown; stateVersion }`; `GAME_EVENT` → `{ gameId; event: unknown; stateVersion }`; `ROOM_STATE.players[]` dropped `handCount` (no consumer — live counts come from the game's public state).
- `shared/src/events/game-events.ts` **deleted** → `shared/src/games/uno/events.ts` as `UnoGameEvent`. The 4 dead variants (`player_joined`, `player_reconnected`, `player_disconnected`, `owner_changed` — the server sends those as their own envelopes) removed.
- `Direction` and `Phase` moved out of `models/common.ts` (now generics-only: `PlayerId`/`RoomId`/`SessionId`/`TurnTimer`) into `models/uno.ts` as `Direction` + `UnoPhase` (`ready | round_active | awaiting_color_choice | round_finished | game_finished`). `UnoPublicState.phase` is `UnoPhase | 'paused'` (Room projector overlay); `UnoFullState.phase` is `UnoPhase`.

### Changed — `server`
- `ws-server`: the 5 legacy UNO verb handlers deleted (only `GAME_ACTION` routes to `room.applyGameAction`). The 3 broadcasts (`GAME_STATE_PUBLIC` / `PLAYER_STATE_PRIVATE` / `GAME_EVENT`) and `GAME_STARTED` now carry `gameId: room.selectedGameId`; no more `as UnoPublicState` casts. `ROOM_STATE` no longer sends `handCount`.
- `protocol.ts`: the 5 UNO zod schemas and the now-unused `color` enum removed.
- `uno-game.ts` + the UNO plugin: `GameEvent` → `UnoGameEvent`.

### Changed — `host` / `mobile`
- Both `useRoomConnection` hooks resolve `activeGameId` straight from `message.payload.gameId` (`GAME_STARTED`, and `GAME_STATE_PUBLIC`/`PLAYER_STATE_PRIVATE` on a mid-game reconnect); the `selectedGameIdRef` inference is gone.
- Host UNO module: `GameEvent` → `UnoGameEvent`.
- `mobile/src/games/uno/UnoControllerView.tsx`: the 5 action senders now emit `send('GAME_ACTION', { action: { type: 'play_card' | 'draw_card' | 'choose_color' | 'uno_call' | 'uno_challenge', … } })`.

### Tests
- `multiplayer.integration.test.ts`: added a `gameAction()` helper + `pubState()`/`privState()` casts (payloads are `unknown` now); bot rewritten to `GAME_ACTION`; asserts `GAME_STARTED`/`GAME_STATE_PUBLIC` payload `gameId === 'uno'`. `uno-game.test.ts` / `room.test.ts` unchanged. **27 server tests green.**
- Builds (4 workspaces), oxlint (host + mobile), server `tsc --noEmit` green. Browser smoke: start → `GAME_STARTED {gameId}` → controller board → play a card via `GAME_ACTION` (propagates to both phones + host feed) → mid-game reload (board restored from `payload.gameId`, no crash).

### Compat
- **Breaking:** `GAME_ACTION` replaces 5 verbs; 3 state/event payloads gain `gameId` and become `unknown`; `GAME_STARTED` gains `gameId`; `ROOM_STATE` loses `handCount`. Unchanged: `JOIN_ROOM`, `RECONNECT_SESSION`, `PING`, `KICK_PLAYER`, `PAUSE`/`RESUME`, `END_GAME`, `NEXT_ROUND`, `SELECT_GAME`, the envelope shape, `protocolVersion: 1` (no third-party clients), the whole session/reconnect subsystem.

## 2026-09-06 — Fase B design elaborated with the user (no code yet)
### Decisions
- **The TV (host) is the control point for game selection.** The host screen renders and navigates the catalog and picks the game; the phones never show a catalog. `assertOwner` already lets `role === 'host'` through, so no server auth change is needed.
- **Host gets a 3-screen pre-match flow:** `attract` (platform wordmark "Box Fiesta" + room code + connected count) → `catalog` (game grid from `GAME_CATALOG`, cover art from the host game module, keyboard + click/touch nav) → `lobby` (large QR + code + player list + "Iniciar {game}"). The catalog grid moves out of `LobbyScreen` (today it is embedded there).
- **Post-match returns to the `lobby` of the same game** — "Jogar de novo" re-sends `START_GAME`, "Trocar de jogo" goes back to `catalog`. It does not return to attract.
- **No new wire messages.** "Back to lobby" reuses `END_GAME`; "play again" reuses `START_GAME`. `SELECT_GAME` / `GAME_CATALOG` / `LIFECYCLE_EVENT` already exist (A1).
- MVP host input: click/touch + keyboard (arrows + Enter, covers a smart-TV D-pad). Gamepad/remote mapping is out of scope.

### Planned changes (Fase B, after A5)
- **server:** `Room.endGame()` will set `state = 'accepting_players'` and keep `selectedGameId` (today it sets `'ended'`, which blocks `selectGame`); `ws-server` re-broadcasts `GAME_CATALOG` after `END_GAME`.
- **host:** new `shell/AttractScreen.tsx`, `shell/CatalogScreen.tsx`, a `phase` state machine (`attract | catalog | lobby | in-game`); `LobbyScreen` loses the catalog grid; `HOST_GAMES[id]` gains `cover`.
- **mobile:** `WaitingScreen` shows the selected game's name/tagline; `GAME_ENDED` / `returned_to_lobby` returns to waiting with the session kept.

### Open points
- QR on the attract/catalog screens (proposal: code always visible, big QR only on the lobby); attract auto-advance after idle vs manual only; a UNO cover image is needed for the catalog card.

### Why
- The master-prompt platform vision (§52) needs a game picker, not a single fused lobby. Recorded now so Fase B (after A5) starts from a settled flow instead of re-deciding it. Full detail: `C:\Users\gabri\.claude\plans\antes-dos-proximos-passos-elegant-clover.md` (FASE B).

## 2026-09-06 — Fase B: 3-screen host flow (attract → catalog → lobby) + return-to-lobby
### Added — `host`
- `shell/AttractScreen.tsx` — the platform screen: "Box Fiesta" wordmark, room code, connected-phone count. Advances **manually only** (any key / click / tap) — no idle auto-advance. No QR here.
- `shell/CatalogScreen.tsx` — game grid from `GAME_CATALOG` (`GameMeta` name / tagline / player range) + cover art from the game module. Keyboard (←/→/↑/↓ move, Enter/Space pick, Esc/Backspace back) and click/tap. Covers are passed down from the app, not fetched from the wire (`shared` stays types-only). No QR here.
- `games/uno/UnoCover.tsx` — UNO catalog cover as an inline SVG (tilted card back + four-colour oval + "UNO" wordmark), no external asset.
- `HostGameEntry` (`{ View, Cover }`); `HOST_GAMES` entries are now objects, `App.tsx` reads `HOST_GAMES[id].View`.

### Changed — `host`
- `App.tsx` — a `flow` state machine (`attract | catalog | lobby`); a game in progress (incl. mid-game host reload) always wins. When a game ends, `flow` returns to `lobby` (not attract). `SELECT_GAME` is sent when a game is picked in the catalog.
- `LobbyScreen.tsx` — the catalog grid is gone (moved to `CatalogScreen`); the title now shows the selected game's name + tagline; added a "Trocar de jogo" button (→ catalog). QR stays here (large), and is the only screen with a QR.

### Changed — `server`
- `Room.endGame()` — now sets `state = 'accepting_players'` (was `'ended'`, which blocked `selectGame`) and keeps `selectedGameId`, so the host lands on that game's lobby and can "play again" (`START_GAME`) or "switch game" (`SELECT_GAME`). `'ended'` removed from `RoomState`.
- `ws-server` `END_GAME` handler re-broadcasts `GAME_CATALOG` (fresh, same `selectedGameId`) alongside `GAME_ENDED` / `ROOM_STATE`.

### Changed — `mobile`
- `useRoomConnection` handles `GAME_ENDED` — clears the game state so the player returns to `WaitingScreen`, session kept.
- `WaitingScreen` shows the selected game's name (accent) + tagline.

### Tests
- `room.test.ts` +1: `endGame()` → `accepting_players`, keeps `selectedGameId`, `selectGame` / `startGame` work again (play again + switch). **28 server tests green.**
- Builds (4 workspaces), oxlint (host + mobile), server `tsc` green. Browser smoke: attract → (key/click) → catalog (UNO cover, nav) → pick → lobby (QR, code, players) → "Trocar de jogo" → catalog → lobby → 2 phones join (waiting shows "UNO" + tagline) → start → play → "Encerrar" → **host back to the lobby, phones back to waiting with session** → "Iniciar UNO" again (play again) works.

### Why
- The platform vision (§52) needs a game picker and a place to land after a match, not a single fused lobby. No new wire messages — reuses `END_GAME` / `START_GAME` / `SELECT_GAME` / `GAME_CATALOG`.

## 2026-09-06 — Fase C / PR C1: `@party/ui` workspace + unified design tokens
### Added
- New workspace **`ui/` (`@party/ui`)** — the home for cross-app React/CSS/audio (`shared/` stays types-only). `main: src/index.ts`, consumed **as source** by Vite (no build step; `build`/`lint` = `tsc --noEmit`). Added to root `workspaces` (after `shared`); `host` + `mobile` get `"@party/ui": "file:../ui"`.
- **`ui/src/tokens.css`** — single source of design tokens: `--bg`, `--panel`, `--panel-2`, `--line`, `--line-soft`, `--text`, `--muted`, `--accent`, `--good`, `--danger`, `--radius*`, `--shadow-lg`, `--font` (+ `color-scheme: dark` and font smoothing on `:root`). Imported once per app in `main.tsx` before its `index.css`.

### Changed
- Resolved the token divergence between the two apps — canonical values: `--panel #161d29` (was host `#141a24`), `--panel-2 #1d2634` (was host `#1b2330`), `--line #2b3646` (was host `#2a3444`), `--muted #94a3b8` (was mobile `#93a1b5`); `--bg` / `--text` / `--accent` were already equal.
- `host/src/index.css` and `mobile/src/index.css` no longer define shared tokens — just the reset (+ mobile keeps its body gradient and the UNO card colours `--uno-*`, plus a `--bg-0: var(--bg)` alias for existing rules).

### Tests
- Builds (5 workspaces incl. `ui`), oxlint (host + mobile), server `tsc`, 28 server tests green. Browser smoke: host attract / catalog / lobby and mobile join render unchanged; tokens resolve from `@party/ui`.

### Why
- First Fase C step: one place for tokens, so C2 (shared components) and C3 (sounds) have a foundation and the two apps stop drifting apart visually.

## 2026-09-06 — Fase C / PR C2: `@party/ui` components + retrofit
### Added
- **`ui/src/components/`** + `ui/src/components.css` (`@party/ui/components.css`, imported per app in `main.tsx`):
  - `BrandMark` — the wordmark; `variant="game"` (amber→red, e.g. "UNO") / `variant="platform"` ("Box Fiesta" multicolour), `size` sm/md/lg/xl. §47: the game text is a prop.
  - `Button` — `variant` primary / success / ghost / danger.
  - `Panel` — surface treatment (bg + hairline border + radius), `className` passthrough.
  - `Overlay` — full-screen dimmed modal shell + centred card.
  - `Timer` — labelled countdown chip; red at ≤ `warnAt`s, `active` glow ("your turn"), `null` → "—".
  - `QrPanel` — QR image (or skeleton) + room code + join URL, with the safe-data-URI guard.
  - `PlayerRoster` — simple `{name, connected}` list; `layout` list (host lobby) / pills (mobile waiting).

### Changed
- **host**: `AttractScreen` / `CatalogScreen` use `BrandMark` (platform); `LobbyScreen` uses `BrandMark` + `QrPanel` + `PlayerRoster` + `Button`; `UnoHostView` topbar uses `BrandMark` + `Timer`, the paused / result overlays use `Overlay` + `Button`, side-actions use `Button`.
- **mobile**: `JoinScreen` uses `BrandMark` + `Button`; `WaitingScreen` roster uses `PlayerRoster` (pills); `UnoControllerView` header uses `Timer` (`active={myTurn}`), colour-modal confirm uses `Button`.
- Removed the now-duplicated CSS: host `shell.css` lost `.brand-mark` / `.platform-mark` / `.start-button` / `.ghost-button` / `.lobby-qr*` / `.lobby-code` / `.lobby-url` / `.qr-skeleton` / `.lobby-players*`; host `uno-host.css` lost `.turn-timer*` / `.result-overlay` / `.result-card*` (kept `.result-scoreboard*` / `.eyebrow` as overlay *content*); mobile `shell.css` lost `.wordmark` / `.primary-button*`; mobile `uno-controller.css` lost `.header-timer*`. Net −116 CSS lines.
- Both `vite.config.ts` got `optimizeDeps.exclude: ['@party/ui']` so Vite transforms the linked source instead of pre-bundling it.

### Tests
- Builds (5 workspaces), oxlint (host + mobile), server `tsc`, 28 server tests green. Browser smoke: attract / catalog / lobby / mobile join / in-game (host board + Timer, mobile controller + Timer glow) / paused Overlay — all render unchanged.

### Why
- One implementation of each recurring widget; the two apps now share the wordmark, buttons, timer, QR panel and roster instead of four near-copies. The `BrandMark` `text` prop is the single §47 rename point.

## 2026-09-06 — Fase C / PR C3: synthesized Web Audio sounds
### Added
- **`ui/src/sound.ts`** — `@party/ui` sound engine. Every sound is oscillators + a gain envelope, no audio files (§47): `cardPlay`, `draw`, `turn`, `special`, `uno`, `win`, `error`, `select`.
  - `createSounds(ctx?)` — pure factory (a stub `AudioContext` can be injected for tests); returns `{ …sounds, play(name), unlock(), isEnabled(), setEnabled(on), toggle() }`.
  - `getSounds()` — the app-wide lazy singleton. Installs a one-time `pointerdown`/`keydown` listener that resumes the (initially suspended) context; `unlock()` forces it.
  - Mute persists in `localStorage['party:sound']`; SSR / no-Web-Audio → a silent no-op instance.
- **`host/src/games/uno/sound-map.ts`** — `soundForEvent(UnoGameEvent) → SoundName | null` (card_played→cardPlay, card_drawn→draw, turn_started→turn, color/direction/skip→special, uno_called→uno, uno_penalty_applied→error, round/game_finished→win). Lives in the UNO module.

### Changed
- `UnoHostView` plays a sound per fresh game event (in the same effect that feeds the animation queue, *before* the reduced-motion guard — sound ≠ motion). New "🔊 Som ligado / 🔇 Som desligado" ghost button in the side actions.
- `ui/src/index.ts` re-exports `createSounds` / `getSounds`.

### Tests
- `ui/src/sound.test.ts` (3, with a fake `AudioContext`): every sound plays without throwing and builds oscillators; muted → no audio nodes; `toggle()` flips and reports state. **`ui` now has a real test suite.**
- Builds (5 workspaces), oxlint (host + mobile), server `tsc`, 28 server tests green. Browser smoke: game start → `turn` sound (2 osc); card played → `cardPlay` + next `turn` (+3 osc); mute button → label flips, `localStorage` set, no further audio nodes.

### Why
- The TV is the party's shared speaker; the board now has audio feedback, synthesized so there are no asset files to license or ship. Mobile stays silent for now (4 phones chirping = noise) — can get light haptics/ticks later.

## 2026-09-06 — Fase C / PR C4: consolidate `cardArt.ts` → `@party/ui` (Fase C complete)
### Changed
- `host/src/games/uno/cardArt.ts` and `mobile/src/games/uno/cardArt.ts` (near-identical — 55 card-image imports + `getCardArt` / `getCardBackArt`) collapsed into **`ui/src/uno-cards.ts`**, exposed as `@party/ui/uno-cards`. The one behaviour difference (`getCardBackArt` → `wildColor` on host vs the unused mobile export) resolved to `wildColor` (host's — the colourful "change colour" face is the deck back).
- `ui/src/assets.d.ts` — ambient `*.png` module declaration so `@party/ui` typechecks the image imports (`ui` tsconfig has no `vite/client`).
- Card images live at the repo root `uno_card_sheet_crops/` still; `ui/src/uno-cards.ts` imports them at `../../uno_card_sheet_crops/*.png`. `UnoHostView` / `UnoControllerView` import from `@party/ui/uno-cards`.

### Tests
- Builds (5 workspaces), oxlint (host + mobile), server `tsc`, `ui` (3) + server (28) tests green. Browser smoke: the host board and the mobile hand render real card art (`Wild_Card_Change_Colour.png`, `Red_2.png`, … all `naturalWidth > 0`); Vite emits all 55 PNGs into each app's `dist/assets/`.

### Fase C — complete
`@party/ui` now holds: design tokens (`tokens.css`), components (`BrandMark`/`Button`/`Panel`/`Overlay`/`Timer`/`QrPanel`/`PlayerRoster` + `components.css`), synthesized sounds (`sound.ts`), and the UNO card-art map (`uno-cards`). No duplicated frontend code between the two apps. §47: the "UNO" name is kept — `BrandMark.text` is the single rename point.

## 2026-09-06 — Fase D / PR D1: `shared` contract for Coup (types-only)
### Added
- `shared/src/models/coup.ts` — `CoupCharacter` (5 classic), `CoupActionType` (7 classic), `CoupPhase`, `CoupInfluence`, `CoupPublicPlayer`, `CoupPendingAction`, `CoupPendingBlock`, `CoupChallengeWindow`, `CoupRevealOutcome`, `CoupPublicState`, `CoupDecision`, `CoupPrivateState`. String values match the server engine's internal enums verbatim.
- `shared/src/games/coup/events.ts` — `CoupGameEvent` union (mirrors `UnoGameEvent`). `shared/src/index.ts` +2 exports.

## 2026-09-06 — Fase D / PR D2: Coup engine + plugin (classic ruleset)
### Added
- `server/src/games/coup/` — classic Coup ported from the standalone repo's `src/engine/` (no Reformation): `deck`/`player`/`game` (RNG/clock injected), `action-resolver` (`ResolverResult` + `SideEffect`), `coup-game.ts` (`CoupGame implements PausableGame, TurnTimedGame` — absorbs the standalone `GameEngine`; no `setTimeout`, one deadline via `getTimer()`/`onTurnTimeout()`; per-player projection + single `pendingDecision`; emits `CoupGameEvent`s; single-influence forced losses auto-resolve), `action-schema.ts` (zod, 9 intents), `plugin.ts` (`coupPlugin`, 2–6p, `{ rounds:false, turnTimer:true, pause:true }`).
- `server/src/games/registry.ts` — 1 import + 1 entry. `DEFAULT_GAME_ID` stays `uno`.
- `server/src/tests/coup-game.test.ts` (27) + a Coup path in `multiplayer.integration.test.ts`. **Server tests: 56 green (was 28).**
- No changes to `core/`, `ws-server.ts`, `shared/protocol`, or either frontend shell (§52). Coup timers reuse `TurnTimedGame` — every phase (action / challenge / block / block-challenge / influence-loss / exchange) exposes its deadline; `onTurnTimeout()` auto-resolves.

## 2026-09-06 — Fase D / PR D3: Coup host (TV) view
### Added
- `host/src/games/coup/` — `CoupHostView` (seat table with coins + face-down/revealed influence cards, phase banner, challenge-reveal strip, event feed, game-over/pause `Overlay`, owner pause/kick/end), `CoupCover` (inline SVG), `describeEvent.ts` (PT-BR feed), `coupCards.ts` (character emoji/colour + action labels — no image assets, §47 deferred, name kept "Coup"), `coup-host.css`.
- `host/src/games/registry.ts` — 1 import + 1 entry.

## 2026-09-06 — Fase D / PR D4: Coup mobile controller
### Added
- `mobile/src/games/coup/` — `CoupControllerView` (one prompt at a time from `pendingDecision`: action grid → target sub-screen, challenge/pass, block/pass, block-challenge/pass, influence-loss picker, exchange keep-picker; forced-Coup + cost disables with reasons), `HowToPlay` overlay (static rules), `coupCards.ts`, `coup-controller.css`.
- `mobile/src/games/registry.ts` — 1 import + 1 entry.

## 2026-09-06 — Fase D / PR D5: generic emoji reactions (platform)
### Added
- `shared/src/protocol/messages.ts` — `SEND_REACTION { reaction }` (client→server) + `REACTION { playerId; reaction; at }` (server→client). Game-agnostic.
- `server/src/websocket/protocol.ts` — `SEND_REACTION` zod (`reaction` 1–16 chars). `ws-server.ts` — handler: 1.2s per-socket cooldown, rebroadcast `REACTION` to the whole room.
- `host` + `mobile` `useRoomConnection` — `reactions: LiveReaction[]` (auto-expire 4s); passed to game views via `HostGameViewProps` / `ControllerGameViewProps`. Coup UI: emoji bar on the controller, floating bubbles on TV + controller.
- `server/src/tests/multiplayer.integration.test.ts` — reaction rebroadcast + oversized-payload rejection. **Server tests: 57 green.**
- D5 is a small platform addition (touches `shared/protocol` + `ws-server` + both shells) — deliberately generic so UNO can adopt it later.
- Live smoke (host + 2 phones): catalog shows both games → Coup lobby → bluffed Tax → challenge → reveal overlay + feed → influence loss → turn advance → pause/resume → 2-player endgame → game-over overlay → "Nova partida" → reaction bubble on TV. No console/server errors.

## Next planned change
- **Fase D / D6 (polish, optional)** — Coup `sound-map.ts` (reuse `@party/ui` `getSounds()`), card-flip animation on reveal. Then **bots** (needs a platform "virtual player" concept — `BotBrain` is ~1100 lines pure TS, portable later) and the **Reformation** expansion, both deferred from v1.
