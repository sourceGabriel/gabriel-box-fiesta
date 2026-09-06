# CLAUDE.md — gabriel-box-fiesta

Claude operating brief. Mirrors `.copilot/spec-kit/`, tuned for efficiency.
**Read this first; don't re-explore what's already captured here or in memory.**

## Working efficiently
- **Default to terse** — status and confirmations in a line or two. Full detail only for decisions, audits, and trade-offs.
- **Broad search across many files → spawn the `Explore` subagent** (returns conclusions, not file dumps). Read whole files only once you know which.
- Never read `package-lock.json`, `uno_card_sheet_crops/**`, `**/dist/**` (also denied in `.claude/settings.json`).
- Commands: `/validate` after a slice · `/checkpoint` before handoff · `/run` for a live stack · `/phase <id>` to open a slice.
- A `Stop` hook auto-typechecks uncommitted `server`/`shared` changes — trust it instead of re-running `tsc` manually.

## What this is
Local (LAN, no internet, no accounts, in-memory) "Jackbox-style" party-game platform: a **shared TV `host`** + **phone `mobile` controllers** + **authoritative `server`**. First game is UNO-inspired. Platform must stay extensible to more games.

- Canonical spec: `.copilot/spec-kit/master-prompt.md` (56 sections — **never edit it**). Key refs: §52 extensibility, §53 MVP success, §47 own visual identity, §54 do-not-do.
- Operating standards: `.copilot/spec-kit/copilot-operating-standards.md`
- Change history + rationale: `docs/CHANGELOG.md` · Gap vs spec: `docs/repository-gap-review.md` · Short log: `.copilot/logs/changes-log.md`

## Current state (2026-09-06)
UNO MVP **complete and validated** (Fases 1–10 + mobile visual overhaul). Server tests: **28 green**. Build: 4 workspaces green. Branch: **`feature/coup-ou-coupa`**.

**Fase A (game-agnostic core, §52) — COMPLETE:**
- ✅ **A1** — `shared/src/games/` generic contract (`GameMeta`, `GameStatus`, `LifecycleEvent`) + `GAME_ACTION`/`SELECT_GAME`/`GAME_CATALOG`/`LIFECYCLE_EVENT` messages.
- ✅ **A2** — `server/src/core/game-plugin.ts` + `server/src/games/registry.ts` (`GAMES`) + `server/src/games/uno/plugin.ts`. `Room` game-agnostic. `server/src/core/game.ts` deleted.
- ✅ **A3** — host split: `host/src/shell/` (game-agnostic; `publicState`/`events` opaque) + `host/src/games/{types,registry}.ts` (`HOST_GAMES`) + `host/src/games/uno/`. Thin `App.tsx`.
- ✅ **A4** — mobile split: `mobile/src/shell/` (`session.ts` reconnect subsystem extracted verbatim) + `mobile/src/games/{types,registry}.ts` (`CONTROLLER_GAMES`) + `mobile/src/games/uno/`. Thin `App.tsx`.
- ✅ **A5** — protocol cleanup (**breaking wire**): 5 legacy UNO verbs removed — only `GAME_ACTION` remains. `GAME_STATE_PUBLIC`/`PLAYER_STATE_PRIVATE`/`GAME_EVENT` are now `{ gameId, state|event: unknown, stateVersion }`; `GAME_STARTED` is `{ gameId }`; `ROOM_STATE.players[]` dropped `handCount`. `shared/events/game-events.ts` → `shared/src/games/uno/events.ts` (`UnoGameEvent`, 4 dead variants dropped). `Direction`/`Phase` moved from `models/common.ts` → `models/uno.ts` (`Direction`, `UnoPhase`). Frontends resolve `activeGameId` from `payload.gameId`; the UNO controller emits `GAME_ACTION`.
**Fase B — COMPLETE:** 3-screen host flow — `shell/AttractScreen` ("Box Fiesta" wordmark, manual advance, no QR) → `shell/CatalogScreen` (game grid + `HOST_GAMES[id].Cover` art, keyboard + click, no QR) → `LobbyScreen` (QR here only, "Trocar de jogo" → catalog, "Iniciar {game}"). `App.tsx` runs a `flow` state machine; in-game wins; `END_GAME` → back to that game's lobby. `Room.endGame()` → `accepting_players` keeping `selectedGameId`; `ws-server` re-broadcasts `GAME_CATALOG` on `END_GAME`. Mobile: `GAME_ENDED` → waiting (session kept); `WaitingScreen` shows game name + tagline. No new wire messages.

**Fase C — in progress** (`@party/ui` design system + synthesized Web Audio sounds; retrofit host + mobile):
- ✅ **C1** — `ui/` workspace + `ui/src/tokens.css` (single source of design tokens, imported in each `main.tsx`); host/mobile token divergence resolved; `index.css` of each app now reset-only. Consumed as source by Vite (no build).
- ✅ **C2** — `@party/ui` components + `components.css`: `BrandMark` (game/platform variant — §47 rename point), `Button`, `Panel`, `Overlay`, `Timer`, `QrPanel`, `PlayerRoster`. Retrofitted host Attract/Catalog/Lobby/`UnoHostView` + mobile Join/Waiting/`UnoControllerView`; ~116 lines of duplicated CSS removed. `optimizeDeps.exclude: ['@party/ui']` in both vite configs.
- ✅ **C3** — `ui/src/sound.ts` synth Web Audio (`getSounds()` singleton + `createSounds(ctx?)`; sounds `cardPlay`/`draw`/`turn`/`special`/`uno`/`win`/`error`/`select`; gesture-unlock; mute in `localStorage['party:sound']`). `host/src/games/uno/sound-map.ts` wired into `UnoHostView` + a mute button. `ui/src/sound.test.ts` (3, fake AudioContext). Mobile stays silent.
- 🔜 **C4** consolidate `cardArt.ts`.
- §47 decision: **keep the "UNO" name** for now (`BrandMark` parametrized, default "UNO"); "Box Fiesta" is the platform mark.
Then **D** (integrate game #2 — repo TBD from the user).

**Active plan:** `C:\Users\gabri\.claude\plans\antes-dos-proximos-passos-elegant-clover.md` — Fase A→D.
Locked decisions:
- Do **Fase A (agnostic core) before finishing Fase 11** — deliberate reorder (2nd game blocked on the abstraction).
- **One React shell per role** + games as in-bundle modules in a static registry. No per-game apps.
- Keep the name **"UNO"** for now; §47 own-identity deferred to Fase C.
- `handleAction(playerId, action)` · server keeps orchestrating state push (optional `tick(now)` capability, no `pushCallback` in plugins) · core reads a `getStatus()` projection, never parses game events · inject `GameContext.random` (fixes the `Math.random` shuffle).

## Architecture map
Monorepo, npm workspaces: `server` · `shared` (**types-only, no runtime, no zod**) · `ui` (`@party/ui` — cross-app tokens/components/sounds; consumed as source by Vite) · `host` (Vite/React, port 5173) · `mobile` (Vite/React, port 5174). Server port 3001. Transport = raw `ws` (**do not adopt Socket.io**).

| Concern | Where |
|---|---|
| Shared UI (`@party/ui`) | `ui/src/tokens.css` (design tokens) + `ui/src/components/` (`BrandMark`, `Button`, `Panel`, `Overlay`, `Timer`, `QrPanel`, `PlayerRoster`) + `ui/src/components.css` + `ui/src/sound.ts` (synth Web Audio, `getSounds()`). Both CSS files imported in each app's `main.tsx`. Game-specific colours (`--uno-*`) stay in that game's module; per-game sound maps live in `<app>/src/games/<id>/sound-map.ts`. |
| Plugin contract | `server/src/core/game-plugin.ts` (`GamePlugin`, `GameInstance`, `GameContext`, `TurnTimedGame`/`RoundedGame`/`PausableGame`/`TickingGame`, `isX()` guards) |
| Game registry | `server/src/games/registry.ts` (`GAMES` map — add a game = 1 import + 1 entry) |
| Room / player / owner / reconnect / 30s grace / `selectGame`/`startGame(gameId)` | `server/src/core/room.ts` (game-agnostic after A2) |
| Session tokens (sha256, 6h TTL) | `server/src/core/session-service.ts` |
| WS gateway (`GAME_ACTION` routing, dedupe, rate-limit, 16KB cap, reconnect, capability-gated tick) | `server/src/websocket/ws-server.ts` |
| Wire protocol (envelope, zod validation) | `shared/src/protocol/messages.ts` + `server/src/websocket/protocol.ts` |
| UNO engine (~640 lines) + plugin + action zod | `server/src/games/uno/{uno-game,rules,cards,types,plugin,action-schema}.ts` |
| Host UI (shell + game module) | `host/src/shell/` (`useRoomConnection`, `AttractScreen`, `CatalogScreen`, `LobbyScreen`, `messages`, `shell.css`) + `host/src/games/{types,registry}.ts` (`HOST_GAMES[id] = { View, Cover }`) + `host/src/games/uno/` (`UnoHostView`, `UnoCover`, …) + `App.tsx` (flow machine) |
| Mobile UI (shell + game module, after A4) | `mobile/src/shell/` (`session`, `useRoomConnection`, `MobileHeader`, `JoinScreen`, `WaitingScreen`, `shell.css`) + `mobile/src/games/{types,registry}.ts` + `mobile/src/games/uno/` + thin `App.tsx` + `index.css` (theme/tokens) |
| Card PNGs | `uno_card_sheet_crops/` (repo root, 54 files) |
| Tests | `server/src/tests/{uno-game,room,multiplayer.integration}.test.ts` |
| Per-workspace how-to | `{server,shared,host,mobile}/README.md` |

**§52 proof:** adding a game = implement `GamePlugin` (pure TS) + `server/src/games/<id>/` + 1 line in `GAMES` + a host view + a controller view + 1 line in each frontend registry. Zero edits to `core/`, `ws-server.ts`, or either shell. The only UNO name left in shared is `models/uno.ts` + `games/uno/events.ts` (both UNO-scoped) and `unoPlugin.meta.name = 'UNO'` (§47, changes in Fase C).

## Hard rules
- Server is the single source of truth. Host/mobile never enforce rules. No business logic in React.
- `shared/` is the ONLY cross-app contract, and stays **types-only**.
- Keep it local + in-memory. No DB/Redis/Kafka/cloud/multi-room/spectators (§54). No new heavy deps.
- TypeScript strict, strongly typed, small modules, no premature abstraction.
- Phase-gated: each PR = own scope, app stays runnable, all tests/build green, **tracking docs updated in the same batch** (`docs/CHANGELOG.md`, `docs/repository-gap-review.md`, `.copilot/logs/changes-log.md`, the active plan file).
- **Never `git commit` or push without the user's explicit OK for that batch.**
- Validate all inputs server-side. Keep session tokens separate from display names. Keep rate-limiting present.

## Validation
`/validate` runs it all and reports one line. Under the hood:
```
npm run -w server test       # must stay green (currently 28)
npm run -w server lint        # tsc --noEmit
npm run -w host lint          # oxlint
npm run -w mobile lint        # oxlint
npm run build                 # all 4 workspaces
```
Smoke (`/run`): host lobby → 2 mobiles via `/join/<code>` → full UNO round + pause + reconnect (reload a mobile tab) + owner transfer (close owner tab).

## Reference repos (already analysed — don't re-fetch)
- `rodwilco/rumpus` (8★, vanilla JS) — the plugin-registry pattern to mirror: `GAMES={id:GameClass}`, `meta.minPlayers`, `handleSubmit(playerId,payload)`.
- `8tp/Coup` (MIT, Next.js/Zustand/Socket.io, **no TV screen**) — `ActionResolver.ts` ~850 lines pure. **Rules reference only** — port, don't import.
- `bodbjanar` (archived), `freewee` (2015, sensor games), `amoebas` (0★) — confirm the screen/controller/QR/LAN pattern we already have. Nothing to import.
- Our infra (signed session tokens + grace, typed protocol + zod, 25 tests) already exceeds all 4 platform refs.

## Git conventions
- Work on `feature/*` branches; never commit directly to `main`/`develop`.
- Commit message trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- PR body trailer: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Fases 5–10 landed via PR #2 (`feature/testa-claudin`); everything is at `c8b602e` on `main`/`develop`/`feature/coup-ou-coupa`.
