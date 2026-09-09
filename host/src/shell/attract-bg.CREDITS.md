# Attract-screen background

`attract-bg.webp` — AI-generated illustration supplied by the repository
owner for the host attract/start screen of this local-only party-game app.

- Not distributed. The platform runs on a LAN with no accounts and no
  internet; the file never leaves the host machine.
- Source render in `gabriel-source/` (gitignored). Rebuild with
  `python tools/build-attract-bg.py`.
- The room code, connected-phone count, QR code and the "press any key"
  prompt are drawn live by `AttractScreen.tsx` over the blank TV in the art.
