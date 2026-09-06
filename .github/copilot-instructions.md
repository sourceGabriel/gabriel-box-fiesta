# Copilot instructions for gabriel-box-fiesta

## Mission
This repository is a local multiplayer party-game platform with a server-authoritative architecture. Two games ship today (UNO-inspired, Coup-inspired); the platform stays extensible to future games.

## Current focus
UNO MVP + the game-agnostic core (Fases A–C, master prompt §52) + **Coup as game #2** (Fase D, classic ruleset) are all complete. Adding a game touches only `server/src/games/<id>/`, `host/src/games/<id>/`, `mobile/src/games/<id>/` and one line in each registry — never `core/`, `ws-server.ts` or the frontend shell.
Deferred: Coup bots (need a platform "virtual player" concept), the Coup "Reformation" expansion, and Fase 11 (own visual identity, §47 — names "UNO"/"Coup" kept for now). Plans in `C:\Users\gabri\.claude\plans\`. See `.copilot/spec-kit/copilot-operating-standards.md` for the roadmap.
Keep `docs/CHANGELOG.md`, `docs/repository-gap-review.md` and `.copilot/logs/changes-log.md` current in the same batch as any code change.

## Core principles
- Server is the source of truth for game state, validation, timers, turns, and scoring.
- Host and mobile clients are consumers of validated state; they must not enforce game rules on their own.
- Keep the architecture modular and reusable across games.
- Prefer simple solutions over premature abstractions.
- Use the shared workspace for contracts between server, host, and mobile.
- Keep the MVP local-only and in-memory.

## Project structure conventions
- `server/` contains authoritative game logic and WebSocket gateway.
- `shared/` contains protocol, models, and cross-platform contracts.
- `host/` contains the TV/PC presentation layer.
- `mobile/` contains the player control interface.
- Keep game rules in `server/src/games/<game>/` and avoid business logic in React components.

## Working rules
- Do not add database, Kafka, Redis, or service fragmentation unless explicitly requested.
- Do not add cross-game features or a third game before the current work is validated; new games plug into the existing plugin contract, never fork the core.
- Do not skip phase gates: explain objective, decisions, architecture, files, tests, run instructions, validation, and known risks before moving to the next phase.
- Prefer targeted validation: run the smallest relevant build or test command for the affected workspace.
- Preserve the repository as runnable after each phase.

## Validation commands
- Server build: `npm run --workspace server build`
- Server tests: `npm run --workspace server test`
- Host build: `npm run --workspace host build`
- Mobile build: `npm run --workspace mobile build`
- Root workspace build: `npm run build`

## Naming and code style
- Prefer TypeScript with explicit types.
- Keep modules small and testable.
- Use clear domain names like `Room`, `Player`, `Session`, `GameInstance`, `UnoGame`, `CoupGame`.
- Keep private state server-side; only share what is allowed to each client.
- Avoid duplicated logic between UI and backend.

## Safety and quality
- Validate all inputs in the server.
- Reject malformed messages and invalid actions.
- Keep session tokens and player identities separate from display names.
- Keep rate limiting and abuse protection basic but present.
- Add tests for game rules and multiplayer flow as the implementation advances.

## When making changes
- Explain the intent before significant edits.
- Keep changes within the current phase and avoid unrelated cleanup.
- Prefer surgical edits that maintain compatibility with the shared protocol.
- If there is an architectural tradeoff, explain the alternatives and recommended path.
