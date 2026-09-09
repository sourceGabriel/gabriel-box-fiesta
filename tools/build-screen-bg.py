#!/usr/bin/env python3
"""
Bake the host shell's full-bleed background art from owner-supplied renders.

Dev-only, not part of any workspace build. The owner drops full-res renders in
`gabriel-source/` (gitignored); this writes the committed, size-capped WebPs the
shell screens use as their backdrops.

  python tools/build-screen-bg.py [key ...]

  key            one or more of: catalog, lobby-lorota (default: all)

The attract-screen backdrop has its own script (`tools/build-attract-bg.py`).

Each entry maps a source PNG in `gabriel-source/` to a committed `*.webp` +
a sibling `*.CREDITS.md`. Sources are AI-generated illustrations for this
local-only, non-distributed party-game app (see §47 — assets unrestricted).

The lobby art is a TEMPLATE: it paints the panel frames ("ENTRE PELO SEU
CELULAR", the players box, "COMO JOGAR?", the "COMEÇAR" button, the stats
strip) and the shell only drops live content (QR + code, player tiles, a
functional start button) into fixed % slots over a letterboxed 16:9 stage.
A new per-game lobby background must keep that same panel geometry.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "gabriel-source"
MAX_W = 2000
QUALITY = 82

# key -> (source name in gabriel-source/, output .webp path relative to ROOT)
TARGETS: dict[str, tuple[str, str]] = {
    "catalog": ("bg-catalog-room.png", "host/src/shell/catalog-bg.webp"),
    "lobby-lorota": ("bg-lobby-lorota.png", "host/src/games/lorota/lobby-bg.webp"),
}

CREDIT = (
    "# {title}\n\n"
    "`{webp}` — AI-generated illustration supplied by the repository owner for "
    "the host {where} of this local-only party-game app.\n\n"
    "- Not distributed. The platform runs on a LAN with no accounts and no "
    "internet; the file never leaves the host machine.\n"
    "- Source render `gabriel-source/{src}` (gitignored). Rebuild with "
    "`python tools/build-screen-bg.py {key}`.\n"
    "{note}"
)

WHERE = {
    "catalog": (
        "Catalog-screen background",
        "game-picker screen",
        "- The wordmark, heading, coverflow reel and start button are drawn "
        "live over this room; nothing is measured against it (`cover` fit).\n",
    ),
    "lobby-lorota": (
        "Lobby background — Lorota!",
        "lobby for Lorota!",
        "- Panel frames are painted in. The shell letterboxes this at 16:9 and "
        "drops the QR + room code, the player tiles and a functional start "
        "button into fixed % slots. Keep the panel geometry for other games.\n",
    ),
}


def build(key: str) -> None:
    src_name, out_rel = TARGETS[key]
    src = SRC_DIR / src_name
    if not src.is_file():
        sys.exit(f"missing source: {src}")

    im = Image.open(src).convert("RGB")
    if im.width > MAX_W:
        h = round(im.height * MAX_W / im.width)
        im = im.resize((MAX_W, h), Image.LANCZOS)

    out = ROOT / out_rel
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, "WEBP", quality=QUALITY, method=6)
    kb = out.stat().st_size / 1024
    print(f"{src_name}  ->  {out_rel}  {im.width}x{im.height}  {kb:.0f} KB")

    title, where, note = WHERE[key]
    (out.with_suffix(".CREDITS.md")).write_text(
        CREDIT.format(
            title=title, webp=out.name, where=where, src=src_name, key=key, note=note
        ),
        encoding="utf-8",
    )


def main() -> None:
    keys = sys.argv[1:] or list(TARGETS)
    unknown = [k for k in keys if k not in TARGETS]
    if unknown:
        sys.exit(f"unknown key(s): {', '.join(unknown)}  (have: {', '.join(TARGETS)})")
    for key in keys:
        build(key)


if __name__ == "__main__":
    main()
