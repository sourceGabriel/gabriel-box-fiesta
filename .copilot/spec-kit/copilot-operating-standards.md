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
- the next step remains explicit.
