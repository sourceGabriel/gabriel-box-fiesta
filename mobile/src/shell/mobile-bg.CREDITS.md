# Mobile background

`mobile-bg.webp` — AI-generated illustration supplied by the repository owner for the phone controller screens of this local-only party-game app.

- Not distributed. The platform runs on a LAN with no accounts and no internet; the file never leaves the host machine.
- Source render `gabriel-source/mobile-bg.png` (gitignored). Rebuild with `python tools/build-screen-bg.py mobile-bg`.
- Portrait 1:2. The top third is illustrated (hand + phone + TV + "Box Fiesta" wordmark); it fades to near-solid dark so the join / waiting panels read over it (`cover`, `background-position: top`). Prompt: `tools/mobile-art-prompts.md`.
