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
UNO MVP **complete and validated** (Fases 1–10 + mobile visual overhaul). Server tests: **27 green**. Build: 4 workspaces green. Branch: **`feature/coup-ou-coupa`**.

**Fase A (game-agnostic core, §52) in progress:**
- ✅ **A1** — `shared/src/games/` generic contract (`GameMeta`, `GameStatus`, `LifecycleEvent`) + `GAME_ACTION`/`SELECT_GAME`/`GAME_CATALOG`/`LIFECYCLE_EVENT` messages. Non-breaking.
- ✅ **A2** — `server/src/core/game-plugin.ts` (`GamePlugin`, `GameInstance`, capability interfaces) + `server/src/games/registry.ts` (`GAMES`) + `server/src/games/uno/plugin.ts`. `Room` is game-agnostic; `ws-server` speaks a **dual protocol** (old UNO verbs + generic `GAME_ACTION`). `server/src/core/game.ts` deleted. Wire payloads for state/events unchanged (server casts `unknown`→UNO at the boundary, `TODO(A5)`).
- ✅ **A3** — host split: `host/src/shell/` (`useRoomConnection` + `LobbyScreen` + `messages` + `shell.css`, all game-agnostic; `publicState`/`events` opaque) + `host/src/games/{types,registry}.ts` (`HOST_GAMES`) + `host/src/games/uno/` (`UnoHostView`, `describeEvent`, `animations`, `cardArt` moved, `uno-host.css`). `App.tsx` → ~55-line dispatcher. `App.css` + template `assets/` deleted; `index.css` → minimal reset + tokens. No wire change.
- ✅ **A4** — mobile split: `mobile/src/shell/` (`session.ts` reconnect subsystem extracted verbatim + `useRoomConnection` + `MobileHeader`/`JoinScreen`/`WaitingScreen` + `shell.css`; `publicState`/`privateState` opaque) + `mobile/src/games/{types,registry}.ts` (`CONTROLLER_GAMES`) + `mobile/src/games/uno/` (`UnoControllerView` — still emits legacy verbs, `cardArt` moved, `uno-controller.css`). `App.tsx` → ~70-line dispatcher; `App.css` + template `assets/` deleted. No wire change.
- 🔜 **A5** — drop legacy UNO verbs, generic `{gameId, state}` payloads.
Then B (game catalog UI), C (`@party/ui` design system + synthesized sounds; folds in Fase 11), D (integrate game #2).

**Active plan:** `C:\Users\gabri\.claude\plans\antes-dos-proximos-passos-elegant-clover.md` — Fase A→D.
Locked decisions:
- Do **Fase A (agnostic core) before finishing Fase 11** — deliberate reorder (2nd game blocked on the abstraction).
- **One React shell per role** + games as in-bundle modules in a static registry. No per-game apps.
- Keep the name **"UNO"** for now; §47 own-identity deferred to Fase C.
- `handleAction(playerId, action)` · server keeps orchestrating state push (optional `tick(now)` capability, no `pushCallback` in plugins) · core reads a `getStatus()` projection, never parses game events · inject `GameContext.random` (fixes the `Math.random` shuffle).

## Architecture map
Monorepo, npm workspaces: `server` · `shared` (**types-only, no runtime, no zod**) · `host` (Vite/React, port 5173) · `mobile` (Vite/React, port 5174). Server port 3001. Transport = raw `ws` (**do not adopt Socket.io**).

| Concern | Where |
|---|---|
| Plugin contract | `server/src/core/game-plugin.ts` (`GamePlugin`, `GameInstance`, `GameContext`, `TurnTimedGame`/`RoundedGame`/`PausableGame`/`TickingGame`, `isX()` guards) |
| Game registry | `server/src/games/registry.ts` (`GAMES` map — add a game = 1 import + 1 entry) |
| Room / player / owner / reconnect / 30s grace / `selectGame`/`startGame(gameId)` | `server/src/core/room.ts` (game-agnostic after A2) |
| Session tokens (sha256, 6h TTL) | `server/src/core/session-service.ts` |
| WS gateway (dual protocol, dedupe, rate-limit, 16KB cap, reconnect, capability-gated tick) | `server/src/websocket/ws-server.ts` |
| Wire protocol (envelope, zod validation) | `shared/src/protocol/messages.ts` + `server/src/websocket/protocol.ts` |
| UNO engine (~640 lines) + plugin + action zod | `server/src/games/uno/{uno-game,rules,cards,types,plugin,action-schema}.ts` |
| Host UI (shell + game module, after A3) | `host/src/shell/` (`useRoomConnection`, `LobbyScreen`, `messages`, `shell.css`) + `host/src/games/{types,registry}.ts` + `host/src/games/uno/` + thin `App.tsx` |
| Mobile UI (shell + game module, after A4) | `mobile/src/shell/` (`session`, `useRoomConnection`, `MobileHeader`, `JoinScreen`, `WaitingScreen`, `shell.css`) + `mobile/src/games/{types,registry}.ts` + `mobile/src/games/uno/` + thin `App.tsx` + `index.css` (theme/tokens) |
| Card PNGs | `uno_card_sheet_crops/` (repo root, 54 files) |
| Tests | `server/src/tests/{uno-game,room,multiplayer.integration}.test.ts` |
| Per-workspace how-to | `{server,shared,host,mobile}/README.md` |

**Remaining UNO coupling (A5 target):** `shared/protocol/messages.ts` still bakes `UnoPublicState`/`GameEvent` into `GAME_STATE_PUBLIC`/`GAME_EVENT` (server + both frontends cast at the boundary); `shared/events/game-events.ts` imports `UnoCard`; `shared/models/common.ts` `Phase` has `awaiting_color_choice`; the 5 legacy UNO client verbs still on the wire (both shells' UNO views still emit them). `ROOM_STATE.handCount` is sent as `0` (removed in A5). Both frontends now carry a game-agnostic shell + a `games/uno/` module.

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
npm run -w server test       # must stay green (currently 27)
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
