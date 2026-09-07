#!/usr/bin/env python3
"""
Build the box-fiesta pixel-avatar asset pack from LPC sprites.

Two phases:

  python tools/build-avatars.py --lpc <path-to-Universal-LPC-Spritesheet-Character-Generator>
      Copies exactly the source frames + palettes + credits we use into
      tools/lpc-source/  (self-contained — the LPC checkout is no longer needed).

  python tools/build-avatars.py
      Reads tools/lpc-source/ and (re)generates ui/src/avatar-assets/:
        - baked, recoloured, portrait-cropped PNG layers (body/eyes/shirt/hat)
        - hair sprites in the LPC base ramp (recoloured at runtime by @party/ui)
        - palettes.json  (hair ramps for the runtime swap)
        - index.ts       (typed url maps, explicit imports — no import.meta.glob)
        - CREDITS.md      (attribution for the exact subset used)

Requires Pillow (`pip install pillow`). This is a dev-only tool; it is not part
of any workspace build.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SRC = REPO / "tools" / "lpc-source"
OUT = REPO / "ui" / "src" / "avatar-assets"

# LPC idle sheets are 4 rows (N/W/S/E) of 64px frames; row 2 (y=128) faces south.
SOUTH = (0, 128, 64, 192)
# Portrait box: head + shoulders, headroom for tall hats. Every baked layer is
# cropped to this exact rect so the runtime just stacks same-size images at 0,0.
CROP = (12, 0, 52, 46)  # -> 40 x 46 (~3x4 portrait)

# ---------------------------------------------------------------------------
# Catalog (ids are the AvatarSpec values; keep in sync with ui/src/avatar.ts)
# ---------------------------------------------------------------------------

GENDERS = ["female", "male"]

# body_ulpc palette keys
SKINS = ["light", "amber", "taupe", "bronze", "brown", "black"]

# id -> lpc hair dir under spritesheets/hair/ , split = has adult/bg + adult/fg
HAIR = [
    ("afro", "afro", False), ("cornrows", "cornrows", False),
    ("dreads", "dreadlocks_short", False), ("buzz", "buzzcut", False),
    ("curly", "curly_short", False), ("cowlick", "cowlick", False),
    ("bedhead", "bedhead", False), ("messy", "messy1", False),
    ("page", "page", False), ("parted", "parted3", False),
    ("fade", "flat_top_fade", False), ("mop", "mop", False),
    # feminine-leaning
    ("bob", "bob", False), ("lob", "lob", False), ("long", "long", False),
    ("straight", "long_straight", False), ("loose", "loose", False),
    ("curtains", "curtains", False), ("halfup", "half_up", False),
    ("bun", "bangs_bun", False), ("pigtails", "pigtails", False),
    ("pigtails_bangs", "pigtails_bangs", False),
    ("braid", "braid", True), ("ponytail", "high_ponytail", True),
]

# hair_ulpc palette keys
HAIR_COLORS = ["black", "dark_brown", "chestnut", "light_brown", "blonde",
               "platinum", "ash", "ginger", "red", "raven", "pink", "purple"]

# eye_ulpc palette keys
EYES = ["brown", "blue", "green", "gray", "orange", "purple"]

# id -> lpc hat idle.png path (relative to spritesheets/) ; "none" ships nothing
HATS = [
    ("crown", "hat/formal/crown/adult/idle.png"),
    ("tophat", "hat/formal/tophat/adult/idle.png"),
    ("tiara", "hat/formal/tiara/adult/idle.png"),
    ("wizard", "hat/magic/celestial/adult/idle.png"),
    ("tricorne", "hat/pirate/tricorne/basic/adult/idle.png"),
    ("bandana", "hat/cloth/bandana/adult/idle.png"),
    ("headband", "hat/headband/tied/adult/idle.png"),
    ("santa", "hat/holiday/christmas/adult/idle.png"),
    ("bonnie", "hat/pirate/bonnie/adult/idle.png"),
]

# id -> (lpc clothes category/style, cloth_ulpc colour to bake)
SHIRTS = [
    ("tee", "shortsleeve/tshirt", "red"),
    ("vneck", "shortsleeve/tshirt_vneck", "blue"),
    ("scoop", "shortsleeve/tshirt_scoop", "teal"),
    ("longsleeve", "longsleeve/longsleeve", "purple"),
    ("tank", "sleeveless/sleeveless1", "yellow"),
    ("polo", "shortsleeve/shortsleeve_polo", "forest"),
    ("cardigan", "longsleeve/longsleeve2_cardigan", "slate"),
    ("wrap", "shortsleeve/shortsleeve_cardigan", "rose"),
]

BODY_SHEET = "body/bodies/{gender}/idle.png"
HEAD_SHEET = "head/heads/human/{gender}/idle.png"
EYES_SHEET = "eyes/human/adult/neutral/idle.png"


def _sheet_paths() -> list[str]:
    """All spritesheet files (relative to spritesheets/) the pack needs."""
    paths: list[str] = [EYES_SHEET]
    for g in GENDERS:
        paths.append(BODY_SHEET.format(gender=g))
        paths.append(HEAD_SHEET.format(gender=g))
    for _id, d, split in HAIR:
        if split:
            paths.append(f"hair/{d}/adult/bg/idle.png")
            paths.append(f"hair/{d}/adult/fg/idle.png")
        else:
            paths.append(f"hair/{d}/adult/idle.png")
    for _id, p in HATS:
        paths.append(p)
    for _id, style, _c in SHIRTS:
        for g in GENDERS:
            paths.append(f"torso/clothes/{style}/{g}/idle.png")
    return paths


# ---------------------------------------------------------------------------
# Phase 1: copy sources
# ---------------------------------------------------------------------------

def copy_sources(lpc: Path) -> None:
    sheets = lpc / "spritesheets"
    pal = lpc / "palette_definitions"
    if not sheets.is_dir():
        sys.exit(f"not an LPC checkout: {lpc} (missing spritesheets/)")

    (SRC / "spritesheets").mkdir(parents=True, exist_ok=True)
    n = 0
    for rel in _sheet_paths():
        s = sheets / rel
        if not s.is_file():
            sys.exit(f"missing source frame: {rel}")
        d = SRC / "spritesheets" / rel
        d.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(s, d)
        n += 1

    for material in ("body", "hair", "eye", "cloth"):
        src_dir = pal / material
        dst_dir = SRC / "palette_definitions" / material
        if dst_dir.exists():
            shutil.rmtree(dst_dir)
        shutil.copytree(src_dir, dst_dir)

    # Gather attribution for exactly the source frames we use: keep a credit
    # entry when its `file` names a folder that one of our frames lives under.
    mine = _sheet_paths()

    def used(f: str) -> bool:
        return bool(f) and any(m == f or m.startswith(f + "/") for m in mine)

    credits: list[dict] = [{
        "name": "Human eyes (neutral)",
        "file": EYES_SHEET.rsplit("/", 1)[0],
        "authors": ["Stephen Challener (Redshrike)", "Johannes Sjölund (wulax)",
                    "Benjamin K. Smith (BenCreating)", "bluecarrot16"],
        "licenses": ["OGA-BY 3.0", "CC-BY-SA 3.0", "GPL 3.0"],
        "urls": ["https://opengameart.org/content/lpc-character-bases"],
    }]
    for jf in (lpc / "sheet_definitions").rglob("*.json"):
        if jf.name.startswith("meta_"):
            continue
        try:
            data = json.loads(jf.read_text(encoding="utf-8"))
        except Exception:
            continue
        for c in data.get("credits", []):
            f = c.get("file", "")
            if used(f):
                credits.append({
                    "name": data.get("name", ""),
                    "file": f,
                    "authors": c.get("authors", []),
                    "licenses": c.get("licenses", []),
                    "urls": c.get("urls", []),
                })
    (SRC / "credits-raw.json").write_text(
        json.dumps(credits, indent=2, ensure_ascii=False), encoding="utf-8")
    (SRC / "README.md").write_text(
        "# tools/lpc-source\n\n"
        "Vendored subset of the Universal LPC Spritesheet Character Generator "
        "(https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator)\n"
        "used to build `ui/src/avatar-assets/`. Only the south-facing idle frames, "
        "the body/hair/eye/cloth palettes, and the matching credits are kept.\n\n"
        "Regenerate the pack with `python tools/build-avatars.py`.\n",
        encoding="utf-8")
    print(f"copied {n} frames + 4 palette sets + credits-raw.json into {SRC.relative_to(REPO)}")


# ---------------------------------------------------------------------------
# Phase 2: generate the pack
# ---------------------------------------------------------------------------

def _hex(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _load_pal(material: str) -> dict:
    return json.loads((SRC / "palette_definitions" / material /
                       f"{material}_ulpc.json").read_text(encoding="utf-8"))


def _base_ramp(material: str) -> str:
    return json.loads((SRC / "palette_definitions" / material /
                       f"meta_{material}.json").read_text(encoding="utf-8"))["base"]


def generate() -> None:
    try:
        from PIL import Image
    except ImportError:
        sys.exit("Pillow is required: pip install pillow")

    sheets = SRC / "spritesheets"
    if not sheets.is_dir():
        sys.exit("run `python tools/build-avatars.py --lpc <path>` first")

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    body_pal, body_base = _load_pal("body"), _base_ramp("body")
    hair_pal, hair_base = _load_pal("hair"), _base_ramp("hair")
    eye_pal, eye_base = _load_pal("eye"), _base_ramp("eye")
    cloth_pal, cloth_base = _load_pal("cloth"), _base_ramp("cloth")

    def south(rel: str):
        return Image.open(sheets / rel).convert("RGBA").crop(SOUTH)

    def recolor(im, src_ramp, dst_ramp):
        m = {_hex(a): _hex(b) for a, b in zip(src_ramp, dst_ramp)}
        px = im.load()
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, a = px[x, y]
                if a and (r, g, b) in m:
                    px[x, y] = (*m[(r, g, b)], a)
        return im

    def portrait(im):
        return im.crop(CROP)

    def save(im, name: str) -> str:
        portrait(im).save(OUT / name, optimize=True)
        return name

    imports: list[str] = []
    body_map: dict[str, dict[str, str]] = {}
    eyes_map: dict[str, str] = {}
    shirt_map: dict[str, dict[str, str]] = {}
    hat_map: dict[str, str] = {}
    hair_map: dict[str, dict[str, str | None]] = {}

    def ident(name: str) -> str:
        return "a_" + name.replace(".png", "").replace("-", "_")

    def register(name: str) -> str:
        imports.append(f"import {ident(name)} from './{name}';")
        return ident(name)

    # bodies: body + head, recoloured per skin
    for g in GENDERS:
        head = south(HEAD_SHEET.format(gender=g))
        body_map[g] = {}
        for skin in SKINS:
            c = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
            c.alpha_composite(recolor(south(BODY_SHEET.format(gender=g)).copy(),
                                      body_pal[body_base], body_pal[skin]))
            c.alpha_composite(recolor(head.copy(), body_pal[body_base], body_pal[skin]))
            name = save(c, f"body-{g}-{skin}.png")
            body_map[g][skin] = register(name)

    # eyes: shared neutral face layer, recoloured per eye colour
    for eye in EYES:
        c = recolor(south(EYES_SHEET).copy(), eye_pal[eye_base], eye_pal[eye])
        name = save(c, f"eyes-{eye}.png")
        eyes_map[eye] = register(name)

    # shirts: baked to one cloth colour per style, per gender
    for sid, style, colour in SHIRTS:
        shirt_map[sid] = {}
        for g in GENDERS:
            im = recolor(south(f"torso/clothes/{style}/{g}/idle.png").copy(),
                         cloth_pal[cloth_base], cloth_pal[colour])
            name = save(im, f"shirt-{sid}-{g}.png")
            shirt_map[sid][g] = register(name)

    # hats: as-is
    for hid, path in HATS:
        name = save(south(path).copy(), f"hat-{hid}.png")
        hat_map[hid] = register(name)

    # hair: ship in the base ramp; @party/ui recolours at runtime
    for hid, d, split in HAIR:
        entry: dict[str, str | None] = {"back": None}
        if split:
            entry["back"] = register(save(south(f"hair/{d}/adult/bg/idle.png").copy(),
                                          f"hair-{hid}-back.png"))
            front = south(f"hair/{d}/adult/fg/idle.png").copy()
        else:
            front = south(f"hair/{d}/adult/idle.png").copy()
        entry["front"] = register(save(front, f"hair-{hid}.png"))
        hair_map[hid] = entry

    # palettes.ts (runtime hair recolour) — a .ts module so no resolveJsonModule
    hair_ramps = {k: hair_pal[k] for k in HAIR_COLORS}
    (OUT / "palettes.ts").write_text(
        "// GENERATED by tools/build-avatars.py — do not edit.\n"
        f"export const HAIR_BASE: readonly string[] = {json.dumps(hair_pal[hair_base])};\n"
        f"export const HAIR_RAMPS: Record<string, readonly string[]> = "
        f"{json.dumps(hair_ramps, indent=2)};\n",
        encoding="utf-8")

    # index.ts (typed url maps) — emit identifiers (import bindings) unquoted
    def ts(obj, indent=1) -> str:
        pad, pad2 = "  " * indent, "  " * (indent + 1)
        if isinstance(obj, dict):
            if not obj:
                return "{}"
            body = ",\n".join(f'{pad2}{json.dumps(k)}: {ts(v, indent + 1)}'
                              for k, v in obj.items())
            return "{\n" + body + f"\n{pad}}}"
        if obj is None:
            return "null"
        return str(obj)  # an identifier like a_body_female_light

    lines = [
        "// GENERATED by tools/build-avatars.py — do not edit.",
        "export { HAIR_BASE, HAIR_RAMPS } from './palettes';",
        *imports,
        "",
        f"export const BODY_URL: Record<string, Record<string, string>> = {ts(body_map)};",
        f"export const EYES_URL: Record<string, string> = {ts(eyes_map)};",
        f"export const SHIRT_URL: Record<string, Record<string, string>> = {ts(shirt_map)};",
        f"export const HAT_URL: Record<string, string> = {ts(hat_map)};",
        "export const HAIR_URL: Record<string, { front: string; back: string | null }> = "
        f"{ts(hair_map)};",
        "",
    ]
    (OUT / "index.ts").write_text("\n".join(lines), encoding="utf-8")

    # CREDITS.md
    raw = json.loads((SRC / "credits-raw.json").read_text(encoding="utf-8"))
    authors: set[str] = set()
    licenses: set[str] = set()
    for c in raw:
        authors.update(a for a in c["authors"] if a)
        licenses.update(lic for lic in c["licenses"] if lic)
    md = ["# Avatar art credits", "",
          "The pixel avatars are built from a curated subset of the "
          "**Universal LPC Spritesheet Character Generator** "
          "(https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator), "
          "itself a collection from the Liberated Pixel Cup on OpenGameArt.org.", "",
          f"**Licenses in this subset:** {', '.join(sorted(licenses))}.", "",
          "## Authors", "",
          ", ".join(sorted(authors, key=str.lower)) + ".", "",
          "## Per-part detail", ""]
    for c in sorted(raw, key=lambda c: c["file"]):
        md.append(f"- **{c['name'] or c['file']}** (`{c['file']}`) — "
                  f"{', '.join(c['authors'])} — {', '.join(c['licenses'])}"
                  + (f" — {c['urls'][0]}" if c.get("urls") else ""))
    (OUT / "CREDITS.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    pngs = list(OUT.glob("*.png"))
    kb = sum(p.stat().st_size for p in pngs) / 1024
    print(f"generated {len(pngs)} PNGs ({kb:.0f} KB) + index.ts + palettes.ts + CREDITS.md "
          f"into {OUT.relative_to(REPO)}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lpc", type=Path, help="path to an LPC generator checkout (copy phase)")
    args = ap.parse_args()
    if args.lpc:
        copy_sources(args.lpc.resolve())
    generate()


if __name__ == "__main__":
    main()
