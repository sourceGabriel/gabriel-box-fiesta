import { registerCues } from '@party/ui';

/**
 * Owner's local meme-sound layer. The host serves `host/public/sound-local/`
 * at `/sound-local/`; if a `manifest.json` is there it maps cue names to files:
 *
 *   { "meme.loser": "aura.mp3", "meme.betrayal": "traidor.ogg" }
 *
 * Those clips then win over the bundled CC0 pack wherever a game's `sound-map.ts`
 * returns `{ cue: 'meme.loser', fallback: … }`. Nothing is committed — the folder
 * is gitignored (see `host/public/sound-local/README.md`). With no manifest the
 * fetch 404s quietly and every game keeps its bundled fallback.
 */
export async function loadLocalSoundManifest(): Promise<void> {
  try {
    const res = await fetch('/sound-local/manifest.json', { cache: 'no-store' });
    if (!res.ok) return;
    const raw: unknown = await res.json();
    if (!raw || typeof raw !== 'object') return;
    const map: Record<string, string> = {};
    for (const [cue, file] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof file === 'string' && file.trim()) {
        map[cue] = file.startsWith('/') || file.startsWith('http')
          ? file
          : `/sound-local/${file}`;
      }
    }
    registerCues(map);
  } catch {
    // no manifest / bad JSON / offline — bundled fallbacks stay in charge
  }
}
