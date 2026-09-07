# @party/ui — design system compartilhado

Casa única de tokens, componentes React e sons para `@party/host` e
`@party/mobile`. **Consumido como fonte** pelo Vite (`main`/`types` apontam para
`src/index.ts`; sem build). Não é dependência do `server`.

Criado na Fase C para acabar com o CSS/áudio duplicado entre os dois apps.

## Conteúdo

| Arquivo | O que é |
|---|---|
| `src/tokens.css` | fonte única dos design tokens (`--panel`, `--line`, `--muted`, `--accent`, …). Importado em cada `main.tsx` antes do `index.css` do app. |
| `src/components.css` | estilos dos componentes. Também importado em cada `main.tsx`. |
| `src/components/` | `BrandMark` (variante game/platform — ponto único de rename §47), `Button`, `Panel`, `Overlay`, `Timer`, `QrPanel`, `PlayerRoster` (renderiza `<Avatar>` quando o jogador tem um), `Avatar`, `AvatarEditor`. |
| `src/avatar.ts` | catálogos do avatar (corpo/pele/cabelo/cor do cabelo/olhos/camisa/chapéu/fundo — ids de catálogo), `DEFAULT_AVATAR`, `sanitizeAvatar` (clampa id desconhecido pro default), `randomAvatar(rng?)`, `bgHex`. `AvatarSpec` vem de `@party/shared`. Manter os ids em sincronia com `tools/build-avatars.py`. |
| `src/avatar-assets/` | **gerado** por `tools/build-avatars.py` (não editar): 69 PNGs (~35 KB) — camadas pixel LPC recortadas em retrato + sprites de cabelo na rampa base + `palettes.ts` (rampas de cabelo pro recolor em runtime) + `index.ts` (mapas url tipados) + `CREDITS.md`. |
| `src/components/Avatar.tsx` | paperdoll pixel num `<canvas>` 46×46: fundo → cabelo-trás → corpo+cabeça → olhos → camisa → cabelo-frente → chapéu. Cabelo recolorido em runtime (palette-swap) a partir da rampa base LPC; caches module-wide de imagem + canvas recolorido; `image-rendering: pixelated`. |
| `src/components/AvatarEditor.tsx` | editor controlado: preview + "🎲 Surpresa" + uma linha de picker por atributo. |
| `src/sound.ts` | Web Audio sintetizado, sem arquivos: `getSounds()` (singleton) + `createSounds(ctx?)` (injetável em teste). Sons `cardPlay`/`draw`/`turn`/`special`/`uno`/`win`/`error`/`select`. Gesture-unlock; mute em `localStorage['party:sound']`; fallback silencioso. |
| `src/uno-cards.ts` | mapa `carta → PNG` do UNO (`@party/ui/uno-cards`). Os crops ficam em `uno_card_sheet_crops/` na raiz do repo. |
| `src/assets.d.ts` | declaração ambiente para `import '*.png'` (o tsconfig do `ui` não tem `vite/client`). |

Exports em `package.json`: `.` (barrel), `./tokens.css`, `./components.css`,
`./uno-cards`.

## Regras

- **Cores específicas de um jogo** (`--uno-*`, `--coup-*`) ficam no módulo daquele
  jogo, não aqui.
- **Mapas de som por jogo** ficam em `<app>/src/games/<id>/sound-map.ts` — o `ui`
  só fornece o motor (`getSounds()`) e a união genérica `SoundName`.
- Arte específica de jogo: o UNO usa PNGs via `uno-cards`; o Coup usa emoji/CSS
  (sem assets). Novos jogos escolhem seu caminho no próprio módulo.
- Avatares: pack pixel gerado de fontes LPC vendorizadas em `tools/lpc-source/`
  via `python tools/build-avatars.py` (ver `tools/README.md`). Créditos em
  `src/avatar-assets/CREDITS.md`.

## Verificar

```bash
npm run -w ui test    # vitest — sound.test.ts (fake AudioContext) + avatar.test.ts
npm run -w ui lint    # tsc --noEmit
```
