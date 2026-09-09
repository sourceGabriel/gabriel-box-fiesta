#!/usr/bin/env python3
"""
Build the curated party sound pack for @party/ui from CC0 Kenney audio.

Dev-only, not part of any workspace build. Two phases (mirrors build-avatars.py):

  python tools/build-sound-pack.py --import <dir>
      <dir> holds the three extracted Kenney packs (folders or the .zip files):
      Interface Sounds, Casino Audio, Music Jingles. Copies only the ~24 files
      we use into tools/sound-source/ (self-contained afterwards).

  python tools/build-sound-pack.py
      Reads tools/sound-source/ and writes ui/src/sound-assets/:
        <id>.ogg          the renamed clips
        index.ts          typed url map (SOUND_SAMPLES, SampleId)
        CREDITS.md         attribution (all CC0, Kenney)

All three source packs are Kenney.nl, licensed CC0 (public domain). Bundled;
nothing is fetched at runtime.

Only the curated output in ui/src/sound-assets/ is committed (it carries a
CREDITS.md mapping every clip back to its original). tools/sound-source/ is a
transient working copy (gitignored) — re-fill it with `--import` before a plain
rebuild.
"""

from __future__ import annotations

import argparse
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "tools" / "sound-source"
OUT_DIR = ROOT / "ui" / "src" / "sound-assets"

# id -> (pack, filename-within-pack).  pack is just a source-folder label.
MANIFEST: dict[str, tuple[str, str]] = {
    # --- UI (Kenney "Interface Sounds") ---
    "ui-click":      ("interface", "click_003.ogg"),
    "ui-select":     ("interface", "select_005.ogg"),
    "ui-confirm":    ("interface", "confirmation_002.ogg"),
    "ui-back":       ("interface", "back_002.ogg"),
    "ui-error":      ("interface", "error_004.ogg"),
    "ui-toggle":     ("interface", "toggle_002.ogg"),
    "ui-open":       ("interface", "maximize_006.ogg"),
    "ui-question":   ("interface", "question_004.ogg"),
    "ui-tick":       ("interface", "tick_002.ogg"),
    "ui-drop":       ("interface", "drop_003.ogg"),
    "ui-glass":      ("interface", "glass_002.ogg"),
    # --- Cards & tokens (Kenney "Casino Audio") ---
    "card-play":     ("casino", "card-place-2.ogg"),
    "card-deal":     ("casino", "card-slide-3.ogg"),
    "card-shuffle":  ("casino", "card-shuffle.ogg"),
    "card-fan":      ("casino", "card-fan-2.ogg"),
    "chip-lay":      ("casino", "chip-lay-2.ogg"),
    "chip-clash":    ("casino", "chips-collide-2.ogg"),
    "dice-throw":    ("casino", "dice-throw-1.ogg"),
    # --- Stingers (Kenney "Music Jingles") ---
    "stinger-win":     ("jingles", "jingles_HIT09.ogg"),
    "stinger-lose":    ("jingles", "jingles_NES09.ogg"),
    "stinger-round":   ("jingles", "jingles_PIZZI03.ogg"),
    "stinger-reveal":  ("jingles", "jingles_STEEL09.ogg"),
    "stinger-zap":     ("jingles", "jingles_SAX03.ogg"),
    "stinger-fanfare": ("jingles", "jingles_HIT15.ogg"),
}

# where each pack's files sit inside a fresh Kenney extract (basename match is
# enough; we search recursively so folder names with spaces don't matter).
PACK_HINT = {
    "interface": "interface-sounds",
    "casino": "casino-audio",
    "jingles": "music-jingles",
}


def _iter_members(src: Path):
    """Yield (name, opener) for every file under a dir or inside a .zip."""
    if src.is_dir():
        for p in src.rglob("*"):
            if p.is_file():
                yield p.name, (lambda p=p: p.read_bytes())
    elif src.suffix.lower() == ".zip":
        with zipfile.ZipFile(src) as z:
            for info in z.infolist():
                if not info.is_dir():
                    yield Path(info.filename).name, (lambda i=info: zipfile.ZipFile(src).read(i))


def do_import(src_root: str) -> None:
    root = Path(src_root).expanduser().resolve()
    if not root.exists():
        sys.exit(f"--import path not found: {root}")
    # candidate sources: the dir itself, its subdirs, and any .zip inside it
    candidates = [root, *(p for p in root.iterdir() if p.is_dir() or p.suffix.lower() == ".zip")]

    wanted: dict[str, set[str]] = {}
    for _id, (pack, fname) in MANIFEST.items():
        wanted.setdefault(pack, set()).add(fname)

    for pack, files in wanted.items():
        dest = SOURCE_DIR / pack
        dest.mkdir(parents=True, exist_ok=True)
        hint = PACK_HINT[pack]
        srcs = [c for c in candidates if hint in c.name.lower()] or candidates
        found: set[str] = set()
        for c in srcs:
            for name, opener in _iter_members(c):
                if name in files and name not in found:
                    (dest / name).write_bytes(opener())
                    found.add(name)
        missing = files - found
        if missing:
            sys.exit(f"[{pack}] could not find in {src_root}: {sorted(missing)}")
        print(f"  {pack:10} {len(found)} files -> {dest.relative_to(ROOT)}")


def build() -> None:
    if not SOURCE_DIR.is_dir():
        sys.exit(f"no {SOURCE_DIR.relative_to(ROOT)} - run with --import first")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.ogg"):
        old.unlink()

    for _id, (pack, fname) in MANIFEST.items():
        src = SOURCE_DIR / pack / fname
        if not src.is_file():
            sys.exit(f"missing source clip: {src.relative_to(ROOT)} (re-run --import)")
        shutil.copy2(src, OUT_DIR / f"{_id}.ogg")

    write_index()
    write_credits()
    total = sum(f.stat().st_size for f in OUT_DIR.glob("*.ogg"))
    print(f"wrote {len(MANIFEST)} clips ({total / 1024:.0f} KB) + index.ts + CREDITS.md "
          f"to {OUT_DIR.relative_to(ROOT)}")


def write_index() -> None:
    ids = list(MANIFEST)
    lines = [
        "/**",
        " * @party/ui — curated party sound pack. GENERATED by",
        " * tools/build-sound-pack.py — do not edit by hand.",
        " *",
        " * All clips are Kenney.nl, licensed CC0 (public domain). Bundled; nothing",
        " * is fetched at runtime. Played through @party/ui's sound system",
        " * (getSounds().sample(id) / .play({ sample: id })), sharing its mute state.",
        " */",
        "",
    ]
    for i in ids:
        lines.append(f"import s_{i.replace('-', '_')} from './{i}.ogg';")
    lines.append("")
    lines.append("export const SOUND_SAMPLES = {")
    for i in ids:
        lines.append(f"  {i!r}: s_{i.replace('-', '_')},")
    lines.append("} as const;")
    lines.append("")
    lines.append("export type SampleId = keyof typeof SOUND_SAMPLES;")
    lines.append("")
    lines.append("export const SAMPLE_IDS = Object.keys(SOUND_SAMPLES) as SampleId[];")
    lines.append("")
    (OUT_DIR / "index.ts").write_text("\n".join(lines), encoding="utf-8")


def write_credits() -> None:
    rows = "\n".join(
        f"| `{i}.ogg` | {pack} | `{fname}` |" for i, (pack, fname) in MANIFEST.items()
    )
    body = f"""# Party sound pack

All clips by **Kenney** (<https://kenney.nl>), licensed **CC0 1.0** (public
domain dedication) — free for personal, educational and commercial use;
crediting is appreciated but not required.

Source packs:
- Interface Sounds — <https://kenney.nl/assets/interface-sounds>
- Casino Audio — <https://kenney.nl/assets/casino-audio>
- Music Jingles — <https://kenney.nl/assets/music-jingles>

Regenerate with `python tools/build-sound-pack.py` (sources vendored in
`tools/sound-source/`).

| file | pack | original |
|---|---|---|
{rows}
"""
    (OUT_DIR / "CREDITS.md").write_text(body, encoding="utf-8")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--import", dest="imp", metavar="DIR",
                    help="copy the clips we use out of the 3 Kenney packs in DIR into tools/sound-source/")
    args = ap.parse_args()
    if args.imp:
        do_import(args.imp)
    build()
