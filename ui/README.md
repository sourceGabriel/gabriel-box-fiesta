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
| `src/components/` | `BrandMark` (variante game/platform — ponto único de rename §47), `Button`, `Panel`, `Overlay`, `Timer`, `QrPanel`, `PlayerRoster`. |
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

## Verificar

```bash
npm run -w ui test    # vitest — sound.test.ts (fake AudioContext)
npm run -w ui lint    # tsc --noEmit
```
