# tools/

Dev-only helpers. Not part of any workspace build.

## build-avatars.py

Builds the pixel-avatar asset pack (`ui/src/avatar-assets/`) from a curated
subset of the [Universal LPC Spritesheet Character
Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator).

Needs Python 3.9+ and Pillow (`pip install pillow`).

```bash
# One-time: vendor the exact source frames + palettes we use into tools/lpc-source/
python tools/build-avatars.py --lpc /path/to/Universal-LPC-Spritesheet-Character-Generator

# Any time after: regenerate the pack from the vendored sources (no LPC checkout needed)
python tools/build-avatars.py
```

Outputs, all committed:

- `tools/lpc-source/` — vendored south-facing idle frames + body/hair/eye/cloth
  palettes + `credits-raw.json`. Self-contained; the LPC checkout is only needed
  to (re)run `--lpc`.
- `ui/src/avatar-assets/` — baked & portrait-cropped PNG layers, hair sprites in
  the LPC base ramp (recoloured at runtime by `@party/ui`'s `<Avatar>`),
  `palettes.ts`, `index.ts` (typed url maps), `CREDITS.md`.

The catalog (which parts, which colours) is the `GENDERS` / `SKINS` / `HAIR` /
… tables near the top of the script. Keep them in sync with `ui/src/avatar.ts`.
