#!/usr/bin/env python3
"""
Optimize the host attract-screen poster(s) from owner-supplied source images.

Dev-only, not part of any workspace build. The owner drops the full-res renders
in `gabriel-source/` (gitignored); this bakes the committed, size-capped WebPs
that `host/src/shell/AttractScreen.tsx` shows full-bleed as the start screen.

  python tools/build-attract-bg.py [wide.png] [portrait.png]

  wide.png      defaults to gabriel-source/mock-poster-wide.png
  portrait.png  defaults to gabriel-source/mock-poster-portrait.png

Writes:
  host/src/shell/attract-bg.webp           landscape poster, max 2000px wide, q82
  host/src/shell/attract-bg-portrait.webp  portrait poster,  max 1400px wide, q82
  host/src/shell/attract-bg.CREDITS.md

The posters already carry the wordmark + tagline. The attract screen is pure
presentation — no room code / QR / phone count (those belong to the lobby).
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "gabriel-source"
SHELL = ROOT / "host" / "src" / "shell"
CREDITS = SHELL / "attract-bg.CREDITS.md"
QUALITY = 82

# (source default, output file, max width)
VARIANTS = [
    ("mock-poster-wide.png", SHELL / "attract-bg.webp", 2000),
    ("mock-poster-portrait.png", SHELL / "attract-bg-portrait.webp", 1400),
]


def bake(src: Path, out: Path, max_w: int) -> None:
    if not src.is_file():
        sys.exit(f"not a file: {src}")
    im = Image.open(src).convert("RGB")
    if im.width > max_w:
        h = round(im.height * max_w / im.width)
        im = im.resize((max_w, h), Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, "WEBP", quality=QUALITY, method=6)
    kb = out.stat().st_size / 1024
    print(f"{src.name}  ->  {out.relative_to(ROOT)}  {im.width}x{im.height}  {kb:.0f} KB")


def main() -> None:
    args = sys.argv[1:]
    for i, (default_name, out, max_w) in enumerate(VARIANTS):
        src = Path(args[i]) if i < len(args) else SRC_DIR / default_name
        bake(src, out, max_w)

    CREDITS.write_text(
        "# Attract-screen posters\n\n"
        "`attract-bg.webp` (landscape) and `attract-bg-portrait.webp` (portrait) —\n"
        "AI-generated posters supplied by the repository owner for the host\n"
        "attract/start screen of this local-only party-game app.\n\n"
        "- Not distributed. The platform runs on a LAN with no accounts and no\n"
        "  internet; the files never leave the host machine.\n"
        "- Source renders in `gabriel-source/` (gitignored). Rebuild with\n"
        "  `python tools/build-attract-bg.py`.\n"
        "- The posters carry the wordmark + tagline. The attract screen is pure\n"
        "  presentation (tap / any key to continue); the room code, QR code and\n"
        "  connected-phone count belong to the lobby only.\n",
        encoding="utf-8",
    )
    print(f"wrote {CREDITS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
