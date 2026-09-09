#!/usr/bin/env node
/**
 * Put the owner's local meme clips where the host serves them:
 * `host/public/sound-local/` (gitignored — nothing here is committed; the game
 * is a LAN-only party app, no accounts, no internet at runtime).
 *
 *   node tools/fetch-local-sounds.mjs
 *
 * Two passes, either is enough:
 *   1. If `gabriel-source/sound-local/` exists (the owner's editable stash),
 *      every `*.mp3/ogg/wav` + `manifest.json` there is copied into place.
 *   2. Otherwise (or to top up), the curated Myinstants pages in `CUES`/`EXTRAS`
 *      are scraped for their real `/media/sounds/*.mp3` and downloaded.
 * Re-runs skip files already present. `manifest.json` is written only if missing.
 */

import { mkdir, writeFile, readFile, readdir, copyFile, access } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'host', 'public', 'sound-local');
const SRC = join(ROOT, 'gabriel-source', 'sound-local');
const BASE = 'https://www.myinstants.com';
const AUDIO_EXT = new Set(['.mp3', '.ogg', '.wav', '.m4a']);

/** cue → { page, file } — the clip wired into every game's sound-map. */
const CUES = {
  'meme.roundStart':  { page: '/en/instant/hihi-michael-jackson-76976/',            file: 'roundstart-hihi.mp3' },
  'meme.reveal':      { page: '/en/instant/uepa-ratinho-539/',                      file: 'reveal-uepa.mp3' },
  'meme.win':         { page: '/en/instant/pou-estourado-48183/',                   file: 'win-pou-estourado.mp3' },
  'meme.gameover':    { page: '/en/instant/bem-amigos-terminou-73810/',             file: 'gameover-bem-amigos.mp3' },
  'meme.betrayal':    { page: '/en/instant/maldito-traidor-17987/',                 file: 'betrayal-maldito-traidor.mp3' },
  'meme.elimination': { page: '/en/instant/b-a-n-i-d-o-34138/',                     file: 'elimination-banido.mp3' },
};

/** Downloaded for convenience, not mapped. Point a cue at one in manifest.json to use it. */
const EXTRAS = {
  'voce-nao-tem-aura':      '/en/instant/voce-nao-tem-aura-559/',
  'ilari-ilarie-troll':     '/en/instant/ilari-ilari-ilarie-troll-12455/',
  'foi-quando-gyro':        '/en/instant/foi-quando-gyro-finalmente-entendeu-41342/',
  'escreve-e-apaga':        '/en/instant/escreve-e-apaga-53519/',
  'e-o-pix-nada-ainda':     '/en/instant/e-o-pix-nada-ainda-72418/',
  'grupo-vei-parado':       '/en/instant/grupo-vei-parado-54835/',
  '5-5-5-5-facil-professor': '/en/instant/5-5-5-5-ai-e-muito-facil-professor-43013/',
  'tuco-get-out':           '/en/instant/tuco-get-out-30566/',
  'spiderman-meme-song':    '/en/instant/spiderman-meme-song-37638/',
  'anime-ahh':              '/en/instant/anime-ahh-73606/',
  'mj-wooow':               '/en/instant/michael-jackson-wooow/',
  'faaah':                  '/en/instant/faaah-63455/',
  'proxima-estacao-metro':  '/en/instant/proxima-estacao-metro-5791/',
  'pum-impacto':            '/en/instant/pum-impacto-54019/',
  'radio-globo-sp':         '/en/instant/sao-paulo-radio-globo-sp/',
};

const UA = 'Mozilla/5.0 (box-fiesta local sound fetcher)';

const exists = (p) => access(p).then(() => true).catch(() => false);

async function resolveMp3(pagePath) {
  const res = await fetch(BASE + pagePath, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`page ${pagePath} → HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/\/media\/sounds\/[^"'\\)\s]+\.mp3/);
  if (!m) throw new Error(`no /media/sounds/*.mp3 in ${pagePath}`);
  return BASE + m[0];
}

async function download(mp3Url, destName) {
  const dest = join(OUT, destName);
  if (await exists(dest)) return 'skip';
  const res = await fetch(mp3Url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${mp3Url} → HTTP ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return 'ok';
}

async function copyFromStash() {
  let names;
  try { names = await readdir(SRC); } catch { return 0; }
  let n = 0;
  for (const name of names) {
    if (name !== 'manifest.json' && !AUDIO_EXT.has(extname(name).toLowerCase())) continue;
    const dest = join(OUT, name);
    if (await exists(dest)) continue;
    await copyFile(join(SRC, name), dest);
    n++;
    console.log(`  ⇐ ${name}`);
  }
  return n;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const copied = await copyFromStash();
  if (copied > 0) console.log(`  copied ${copied} file(s) from gabriel-source/sound-local/\n`);

  const manifest = {};
  let ok = 0, skip = 0, fail = 0;

  for (const [cue, { page, file }] of Object.entries(CUES)) {
    manifest[cue] = file;
    if (await exists(join(OUT, file))) { skip++; console.log(`  · ${cue}  ${file} (already there)`); continue; }
    try {
      const r = await download(await resolveMp3(page), file);
      r === 'ok' ? ok++ : skip++;
      console.log(`  ${r === 'ok' ? '↓' : '·'} ${cue}  ${file}`);
    } catch (e) {
      fail++;
      console.log(`  ✗ ${cue}  ${e.message}`);
    }
  }

  console.log('\n  extras (not mapped — edit manifest.json to use):');
  for (const [name, page] of Object.entries(EXTRAS)) {
    const file = `extra-${name}.mp3`;
    if (await exists(join(OUT, file))) { skip++; console.log(`  · ${file} (already there)`); continue; }
    try {
      const r = await download(await resolveMp3(page), file);
      r === 'ok' ? ok++ : skip++;
      console.log(`  ${r === 'ok' ? '↓' : '·'} ${file}`);
    } catch (e) {
      fail++;
      console.log(`  ✗ ${file}  ${e.message}`);
    }
  }

  // only keep cues whose file actually landed
  const present = {};
  for (const [cue, file] of Object.entries(manifest)) {
    if (await exists(join(OUT, file))) present[cue] = file;
  }

  const manifestPath = join(OUT, 'manifest.json');
  let current = {};
  try { current = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { /* none/invalid */ }
  if (Object.keys(current).length > 0) {
    console.log('\n  manifest.json already set — leaving it as is:');
    console.log('  ' + JSON.stringify(current));
  } else if (Object.keys(present).length > 0) {
    await writeFile(manifestPath, JSON.stringify(present, null, 2) + '\n');
    console.log(`\n  wrote ${manifestPath}`);
  }
  console.log(`\n  done: ${ok} downloaded, ${skip} already there, ${fail} failed`);
  if (fail > 0 && skip + ok === 0) {
    console.log('  (every fetch failed — no internet / proxy? the clips may already be in the folder from before.)');
  }
  console.log('  reload the host page to pick up the new clips.');
}

main().catch((e) => { console.error(e); process.exit(1); });
