# `sound-local/` — the owner's meme-sound drop folder

Drop your own audio clips here to override the bundled CC0 pack at key game
moments. **Nothing in this folder is committed** (it's gitignored) — it's for your
own private parties. The game runs fine with the folder empty: every cue has a
bundled fallback.

## Setup

### The fast way

```
node tools/fetch-local-sounds.mjs
```

Copies your clips + `manifest.json` from `gabriel-source/sound-local/` (your
editable stash) into this folder, then tops up anything missing by downloading a
curated set from Myinstants. Re-runs skip what's already here. Then reload the
host page.

### By hand

1. Copy `manifest.example.json` → `manifest.json` in this folder.
2. Drop your clips here (`.mp3`, `.ogg`, `.wav` — keep them short, < ~3 s).
3. In `manifest.json`, set each cue to its filename. Leave a cue `""` to keep the
   bundled fallback.

```json
{
  "meme.loser": "aura.mp3",
  "meme.betrayal": "maldito-traidor.ogg",
  "meme.win": "pou-estourado.mp3"
}
```

4. Reload the host page. The manifest is read once at startup.

## Cues and where they fire

**Wired now** (a clip here plays instead of the bundled fallback):

| Cue | Fires when | Owner's pick (Myinstants) |
|---|---|---|
| `meme.roundStart` | a new round / question begins (Zap!, Lorota!, Sabe-Tudo, FDP, É Você!) | "HEE HEE LEVANTA POBRE" · "São Paulo! Rádio Globo SP!" · MJ "hee-hee" |
| `meme.reveal` | answers / duel / vote results are revealed (Zap!, Coup, Lorota!, Sabe-Tudo, FDP, É Você!) | "uepa!" (Ratinho) · "Oh No No No" |
| `meme.win` | someone wins the match (UNO, Coup) / a ZAP! sweep | "POU ESTOURADO" · "ROJÃO" · "PUM IMPACTO" |
| `meme.gameover` | the game-over screen (Zap!, Lorota!, Sabe-Tudo, FDP, É Você!) | "Bem amigos, terminou!" (Galvão) |
| `meme.betrayal` | a Coup challenge is thrown | "Maldito Traidor" |
| `meme.elimination` | a player loses their last influence in Coup | "B-A-N-I-D-O" · "Tuco: GET OUT" |

**Reserved** — listed in `manifest.example.json` for intent, not triggered yet:
`meme.loser`, `meme.correct`, `meme.timeout`, `meme.afk`, `meme.fooled`, `meme.deadLobby`.

Files you add are yours to source; respect the rights of whatever you download.
