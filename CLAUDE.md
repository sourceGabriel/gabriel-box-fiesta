# CLAUDE.md — gabriel-box-fiesta

Claude-oriented operating brief. Mirrors `.copilot/spec-kit/` but tuned for efficiency and cross-session memory.
**Read this first; don't re-explore what's already captured here.**

## What this is
Local (LAN, no internet, no accounts, in-memory) "Jackbox-style" party-game platform: a **shared TV `host`** + **phone `mobile` controllers** + **authoritative `server`**. First game is UNO-inspired. Platform must stay extensible to more games.

- Canonical spec: `.copilot/spec-kit/master-prompt.md` (56 sections — **never edit it**). Key refs: §52 extensibility, §53 MVP success, §47 own visual identity, §54 do-not-do.
- Operating standards: `.copilot/spec-kit/copilot-operating-standards.md`
- Change history + rationale: `docs/CHANGELOG.md` · Gap vs spec: `docs/repository-gap-review.md` · Short log: `.copilot/logs/changes-log.md`

## Current state (2026-09-06)
UNO MVP **complete and validated** (Fases 1–10 + mobile visual overhaul). Server tests: **25 green**. Build: 4 workspaces green.
Next: **game-agnostic core** (§52) so a 2nd game plugs in without touching the core. A 2nd complete game exists in a separate repo (to be integrated).

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
| Game contract | `server/src/core/game.ts` (`Game<>` — implemented only by `UnoGame`, unused by core) |
| Room / player / owner / reconnect / 30s grace | `server/src/core/room.ts` |
| Session tokens (sha256, 6h TTL) | `server/src/core/session-service.ts` |
| WS gateway (dedupe by `messageId`, rate-limit, 16KB cap, reconnect, tick loop) | `server/src/websocket/ws-server.ts` |
| Wire protocol (envelope, zod validation) | `shared/src/protocol/messages.ts` + `server/src/websocket/protocol.ts` |
| UNO engine (~635 lines, self-contained) | `server/src/games/uno/{uno-game,rules,cards,types}.ts` |
| Host UI (flat `App.tsx` ~589 lines, no shell) | `host/src/App.tsx` + `App.css` + `cardArt.ts` |
| Mobile UI (flat `App.tsx` ~554 lines, no shell) | `mobile/src/App.tsx` + `App.css` + `index.css` (theme) + `cardArt.ts` |
| Card PNGs | `uno_card_sheet_crops/` (repo root, 54 files) |
| Tests | `server/src/tests/{uno-game,room,multiplayer.integration}.test.ts` |

**UNO coupling in the core (the Fase A target):** `Room` imports concrete `UnoGame`+`UnoAction`; `ws-server` builds `UnoAction` inline + reads `getState().hands`/`.timer`; `shared/protocol/messages.ts` bakes `UnoPublicState`/`GameEvent` into the wire union; `shared/events/game-events.ts` imports `UnoCard`. `shared/models/common.ts` `Phase` has UNO's `awaiting_color_choice`; `Direction` is UNO-only.

## Hard rules
- Server is the single source of truth. Host/mobile never enforce rules. No business logic in React.
- `shared/` is the ONLY cross-app contract, and stays **types-only**.
- Keep it local + in-memory. No DB/Redis/Kafka/cloud/multi-room/spectators (§54). No new heavy deps.
- TypeScript strict, strongly typed, small modules, no premature abstraction.
- Phase-gated: each PR = own scope, app stays runnable, all tests/build green, **tracking docs updated in the same batch** (`docs/CHANGELOG.md`, `docs/repository-gap-review.md`, `.copilot/logs/changes-log.md`, the active plan file).
- **Never `git commit` or push without the user's explicit OK for that batch.**
- Validate all inputs server-side. Keep session tokens separate from display names. Keep rate-limiting present.

## Validation
```
npm run -w server test      # must stay 25 green
npm run -w server lint       # tsc --noEmit
npm run -w host lint         # oxlint
npm run -w mobile lint       # oxlint
npm run build                # all 4 workspaces
```
Smoke: `npm run -w server dev` + `-w host dev` + `-w mobile dev`; host lobby → 2 mobiles via `/join/<code>` → full UNO round + pause + reconnect (reload a mobile tab) + owner transfer (close owner tab).

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
