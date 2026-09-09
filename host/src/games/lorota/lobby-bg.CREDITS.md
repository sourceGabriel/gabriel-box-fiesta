# Lobby background — Lorota!

`lobby-bg.webp` — AI-generated illustration supplied by the repository owner for the host lobby for Lorota! of this local-only party-game app.

- Not distributed. The platform runs on a LAN with no accounts and no internet; the file never leaves the host machine.
- Source render `gabriel-source/bg-lobby-lorota.png` (gitignored). Rebuild with `python tools/build-screen-bg.py lobby-lorota`.
- Panel frames are painted in. The shell letterboxes this at 16:9 and drops the QR + room code, the player tiles and a functional start button into fixed % slots. Keep the panel geometry for other games.
