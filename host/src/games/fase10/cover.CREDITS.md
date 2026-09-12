# Catalog cover — fase10

`cover.webp` — AI-generated illustration supplied by the repository owner for the catalog cover for fase10 of this local-only party-game app.

- Not distributed. The platform runs on a LAN with no accounts and no internet; the file never leaves the host machine.
- Source render `gabriel-source/thumbs/fase10.png` (gitignored). Rebuild with `python tools/build-screen-bg.py cover-fase10`.
- 3:2 key art shown in the catalog coverflow (`host/src/games/<id>/<Id>Cover.tsx` renders it as an `<img>`). The UI overlays a small vibe chip top-left and an optional sticker top-right. Prompt: `tools/cover-art-prompts.md`.
