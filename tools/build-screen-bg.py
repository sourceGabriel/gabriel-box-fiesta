#!/usr/bin/env python3
"""
Bake the host shell's full-bleed background art from owner-supplied renders.

Dev-only, not part of any workspace build. The owner drops full-res renders in
`gabriel-source/` (gitignored); this writes the committed, size-capped WebPs the
shell screens use as their backdrops.

  python tools/build-screen-bg.py [key ...]

  key   one or more of:
          catalog                         -> host/src/shell/catalog-bg.webp
          lobby-<id>  (id = uno, coup, zap, lorota, sabetudo, fdp, evoce, dilema)
                                          -> host/src/games/<id>/lobby-bg.webp
        (default: all)

The attract-screen backdrop has its own script (`tools/build-attract-bg.py`).

Sources are AI-generated illustrations for this local-only, non-distributed
party-game app (see §47 — assets unrestricted). Each entry writes a committed
`*.webp` + a sibling `*.CREDITS.md`.

The lobby art is a TEMPLATE. It paints the wordmark, the panel frames ("ENTRE
PELO SEU CELULAR" + a QR square, the players box, "COMO JOGAR?"), the "COMEÇAR"
button and the stats strip. The shell only drops live content — the real QR,
the room code, the player tiles and a functional start button — into fixed %
slots over a letterboxed 16:9 stage (geometry in `.lobby-slot-*`, shell.css).
Every per-game lobby render must keep that same geometry; the whole set was
generated from one prompt (`tools/lobby-bg-prompts.md`) so it already matches.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "gabriel-source"
MAX_W = 2000
QUALITY = 82

# game id -> source file in gabriel-source/backgrounds/
LOBBY_GAMES: dict[str, str] = {
    "uno": "uno.png",
    "coup": "coup.png",
    "zap": "zap.png",
    "lorota": "lorota.png",
    "sabetudo": "sabe-tudo.png",
    "fdp": "fdp.png",
    "evoce": "ehvoce.png",
    "dilema": "dilema.png",
}

# key -> (source path relative to gabriel-source/, output .webp relative to ROOT)
TARGETS: dict[str, tuple[str, str]] = {
    "catalog": ("bg-catalog-room.png", "host/src/shell/catalog-bg.webp"),
    **{
        f"lobby-{gid}": (f"backgrounds/{src}", f"host/src/games/{gid}/lobby-bg.webp")
        for gid, src in LOBBY_GAMES.items()
    },
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

_LOBBY_NOTE = (
    "- Panel frames, wordmark, \"COMO JOGAR?\", the \"COMEÇAR\" button and the "
    "stats strip are painted in. The shell letterboxes this at 16:9 and drops "
    "the real QR, the room code, the player tiles and a functional start button "
    "into fixed % slots (`.lobby-slot-*`, shell.css). Keep that geometry.\n"
)


def where_for(key: str) -> tuple[str, str, str]:
    if key == "catalog":
        return (
            "Catalog-screen background",
            "game-picker screen",
            "- The wordmark, heading, coverflow reel and start button are drawn "
            "live over this room; nothing is measured against it (`cover` fit).\n",
        )
    gid = key.removeprefix("lobby-")
    return (f"Lobby background — {gid}", f"lobby for {gid}", _LOBBY_NOTE)


def build(key: str) -> None:
    src_rel, out_rel = TARGETS[key]
    src = SRC_DIR / src_rel
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
    print(f"{src_rel}  ->  {out_rel}  {im.width}x{im.height}  {kb:.0f} KB")

    title, where, note = where_for(key)
    (out.with_suffix(".CREDITS.md")).write_text(
        CREDIT.format(
            title=title,
            webp=out.name,
            where=where,
            src=src_rel,
            key=key,
            note=note,
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
