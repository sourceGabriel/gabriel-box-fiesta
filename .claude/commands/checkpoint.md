---
description: Sync tracking docs + memory with the work done this session, then a short status
---
For the code changes made in this session, update — **in one pass** — every doc that applies. Do not commit.

- `docs/CHANGELOG.md` — dated entry, `Added` / `Fixed` / `Changed`, plus a **`Why:`** line
- `docs/repository-gap-review.md` — only if the status vs `.copilot/spec-kit/master-prompt.md` moved
- `.copilot/logs/changes-log.md` — one short line
- the active plan file (path in `CLAUDE.md`) — tick or append the relevant step
- memory `box-fiesta-project-state.md` — only if phase / branch / progress changed

For each doc, if it did **not** need changing, say which and why (one line each).

Then print a 3-line status: `branch @ <sha>` · what changed this session · what's next.
