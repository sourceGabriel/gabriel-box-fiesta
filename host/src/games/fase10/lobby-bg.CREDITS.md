# Lobby background — fase10

`lobby-bg.webp` — AI-generated illustration supplied by the repository owner for the lobby for fase10 of this local-only party-game app.

- Not distributed. The platform runs on a LAN with no accounts and no internet; the file never leaves the host machine.
- Source render `gabriel-source/backgrounds/fase10.png` (gitignored). Rebuild with `python tools/build-screen-bg.py lobby-fase10`.
- Panel frames, wordmark, "COMO JOGAR?", the "COMEÇAR" button and the stats strip are painted in. The shell letterboxes this at 16:9 and drops the real QR, the room code, the player tiles and a functional start button into fixed % slots (`.lobby-slot-*`, shell.css). Keep that geometry.
