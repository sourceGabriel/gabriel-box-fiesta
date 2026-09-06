# Copilot operating standards

## Phase-gating workflow
1. Explain the goal of the current phase.
2. Explain the main architectural decisions.
3. Show the relevant file structure and responsibilities.
4. Implement only the necessary scope for that phase.
5. Add or update tests for the changed behavior.
6. Explain local execution steps.
7. Explain validation steps.
8. List known risks or follow-up items.
9. Wait for confirmation before proceeding to the next phase.

## Core repo guardrails
- Server authority > client authority.
- Shared contracts in `shared/` must be the only contract between apps.
- Host and mobile should not contain authoritative game rules.
- Keep the MVP local and in memory.
- Do not add infrastructure complexity before proving need.

## Reuse and extensibility
- New games should plug into the existing room lifecycle and WebSocket protocol instead of forking the core.
- Place domain types and protocol types in `shared/`.
- Keep server-side game engine isolated from browser rendering.

## Validation discipline
- Prefer workspace-scoped commands over broad root runs.
- Validate changed behavior using the smallest targeted command.
- If a change touches server rules, test the server workspace; if it affects UI, run relevant host/mobile checks.

## Acceptance standard
A phase is only complete when:
- the implementation matches the phase scope,
- the code remains executable,
- the relevant tests/build pass,
- the next step remains explicit,
- the tracking docs are updated in the same batch (`docs/CHANGELOG.md`, `docs/repository-gap-review.md`, `.copilot/logs/changes-log.md`, the active plan file).

## Current roadmap (2026-09-06)
The UNO MVP (§53), the game-agnostic core (§52) and a second game (Coup) are all complete. Plans:
`C:\Users\gabri\.claude\plans\antes-dos-proximos-passos-elegant-clover.md` (Fases A–C) and `em-paralelo-ao-que-purring-moler.md` (Fase D).

- **Fase A** — ✅ COMPLETE. `GamePlugin` registry + opaque `GameInstance` + game-agnostic `Room`; frontend shell per role + `games/uno/` module; generic wire (`GAME_ACTION` only, `{ gameId, state|event: unknown }` payloads). 5 green PRs (A1–A5). UNO stays identical. Was a **deliberate reorder ahead of Fase 11** because a second complete game was blocked on the abstraction.
- **Fase B** — ✅ COMPLETE. 3-screen host flow (`AttractScreen` → `CatalogScreen` → `LobbyScreen`), per-game cover art (`HOST_GAMES[id].Cover`), keyboard + click nav, QR only on the lobby; `END_GAME` returns to that game's lobby.
- **Fase C** — ✅ COMPLETE. `@party/ui` = tokens (C1) + components + retrofit (C2) + synth Web Audio sounds host-only (C3) + `uno-cards` card-art map (C4). No duplicated frontend code between the apps. §47: the "UNO" name is kept — `BrandMark.text` is the single rename point.
- **Fase D** — ✅ COMPLETE (v1). Coup as game #2, classic ruleset, ported from a standalone repo (rules reference — ported, not imported). D1 `shared` contract, D2 `server/src/games/coup/` engine + plugin (57 server tests), D3 host view, D4 mobile controller + "how to play", D5 generic emoji reactions (`SEND_REACTION`/`REACTION`). **§52 held in practice** — the game touched zero `core/`/`ws-server`/shell/`shared/protocol` files (only D5, a platform feature, touched the protocol). Deferred: bots (need a "virtual player" concept), the Reformation expansion, D6 polish (sounds, card-flip animation).

Acceptance test for Fase A (proves §52): a stub game plugs in by touching only `server/src/games/<id>/` + one line in each registry — zero edits to `core/`, `ws-server.ts`, or the frontend shell.
