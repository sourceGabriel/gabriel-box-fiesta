---
description: Bring up the local stack (server + host + mobile) and print the URLs
---
Start the dev stack for local play — do not run a game, just get it up:

1. `preview_start` the `server` config (port 3001), then `host` (5173), then `mobile` (5174) from `.claude/launch.json`.
2. GET `http://127.0.0.1:3001/room` for the room code.
3. Print:
   - Host (TV): `http://localhost:5173`
   - Join (phone): `http://<lan-ip>:5174/join/<CODE>` — get the LAN ip from the server startup log
4. Stop here. Wait for me to say what to test.
