#!/usr/bin/env python3
"""
Optimize the host attract-screen background from an owner-supplied source image.

Dev-only, not part of any workspace build. The owner drops the full-res render in
`gabriel-source/` (gitignored); this bakes the committed, size-capped WebP that
`host/src/shell/AttractScreen.tsx` uses as its backdrop.

  python tools/build-attract-bg.py [source.png]

  source.png  defaults to the newest *.png in gabriel-source/. Writes:
    host/src/shell/attract-bg.webp     max 2000px wide, quality 82
    host/src/shell/attract-bg.CREDITS.md

The live UI renders the dynamic bits (room code, phone count, QR, the
"press any key" prompt) as an overlay over the blank CRT in the art.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "gabriel-source"
OUT = ROOT / "host" / "src" / "shell" / "attract-bg.webp"
CREDITS = ROOT / "host" / "src" / "shell" / "attract-bg.CREDITS.md"
MAX_W = 2000
QUALITY = 82


def pick_source() -> Path:
    if len(sys.argv) > 1:
        return Path(sys.argv[1])
    pngs = sorted(SRC_DIR.glob("*.png"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not pngs:
        sys.exit(f"no *.png in {SRC_DIR} and no path given")
    return pngs[0]


def main() -> None:
    src = pick_source()
    if not src.is_file():
        sys.exit(f"not a file: {src}")

    im = Image.open(src).convert("RGB")
    if im.width > MAX_W:
        h = round(im.height * MAX_W / im.width)
        im = im.resize((MAX_W, h), Image.LANCZOS)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    im.save(OUT, "WEBP", quality=QUALITY, method=6)
    kb = OUT.stat().st_size / 1024
    print(f"{src.name}  ->  {OUT.relative_to(ROOT)}  {im.width}x{im.height}  {kb:.0f} KB")

    CREDITS.write_text(
        "# Attract-screen background\n\n"
        f"`attract-bg.webp` — AI-generated illustration supplied by the repository\n"
        "owner for the host attract/start screen of this local-only party-game app.\n\n"
        "- Not distributed. The platform runs on a LAN with no accounts and no\n"
        "  internet; the file never leaves the host machine.\n"
        f"- Source render in `gabriel-source/` (gitignored). Rebuild with\n"
        "  `python tools/build-attract-bg.py`.\n"
        "- The room code, connected-phone count, QR code and the \"press any key\"\n"
        "  prompt are drawn live by `AttractScreen.tsx` over the blank TV in the art.\n",
        encoding="utf-8",
    )
    print(f"wrote {CREDITS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
