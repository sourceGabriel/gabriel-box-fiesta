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

## Next planned change
- Begin Fase A, PR A1: additive generic contract in `shared/` (`GameMeta`, `GameStatus`, `LifecycleEvent`, `GAME_ACTION`/`SELECT_GAME`/`GAME_CATALOG`/`LIFECYCLE_EVENT` messages) — non-breaking. Await user go-ahead.
