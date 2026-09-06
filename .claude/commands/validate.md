---
description: Run every workspace test, typecheck, lint and the build; report a one-line summary
---
Run these in order. Do **not** paste full output — only the failing output if something breaks, then stop.

1. `npm run -w server test`
2. `npm run -w server lint`
3. `npm run -w shared lint`
4. `npm run -w host lint`
5. `npm run -w mobile lint`
6. `npm run build`

If all pass, reply with a single line: `✅ <N> server tests · lint clean · build 4/4`.
If anything fails: show only that step's error, say which step, and stop (don't run the rest).
