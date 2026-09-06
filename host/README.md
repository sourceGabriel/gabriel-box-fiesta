# @party/host — tela principal (TV/PC)

A tela compartilhada da plataforma: lobby com QR code + código da sala, e o
tabuleiro do jogo em tempo real. É um **consumidor de estado validado** — nenhuma
regra de jogo roda aqui.

React 19 + Vite. Depende de `@party/shared` (contratos) e conversa com o
`@party/server` por WebSocket.

## Rodar

```bash
npm run -w host dev       # http://localhost:5173  (a partir da raiz do repo)
```

Precisa do servidor no ar (`npm run -w server dev`, porta 3001) e do app
`@party/mobile` (porta 5174) para os celulares entrarem.

Fluxo: abra `http://localhost:5173` no PC/TV → mostra o código + QR → jogadores
entram pelo celular → owner (ou o host) clica "Iniciar partida".

## Configuração

`.env` opcional:

- `VITE_SERVER_ORIGIN` — origem do servidor se não for `http://<mesmo-host>:3001`
  (ex.: `http://192.168.0.10:3001`).

## Build / lint

```bash
npm run -w host build     # tsc -b && vite build
npm run -w host lint      # oxlint
```

## Estrutura

- `src/App.tsx` — dispatcher fino: máquina de estados de 3 telas
  (`attract → catalog → lobby`); um jogo em andamento (`activeGameId`) sempre
  vence; fim de jogo volta pro lobby. Não conhece UNO.
- `src/shell/` — parte **genérica** (nenhum conhecimento de jogo):
  - `useRoomConnection.ts` — `/room` + WebSocket (reconexão + backoff), expõe
    `{ roomCode, players, catalog, selectedGameId, activeGameId, publicState,
    events, reactions, connected, send, … }`. `publicState`/`events` são opacos
    aqui; `reactions` é a fila de emoji (auto-expira em 4s).
  - `AttractScreen.tsx` — marca "Box Fiesta" + código da sala; avança só manual
    (tecla/clique). Sem QR.
  - `CatalogScreen.tsx` — grade do `GAME_CATALOG` + arte de capa por jogo
    (`covers` vem do app, não do fio); navegação setas/Enter/Esc + clique. Sem QR.
  - `LobbyScreen.tsx` — QR grande + código + jogadores + "Iniciar {jogo}" +
    "Trocar de jogo". É a única tela com QR.
  - `messages.ts`, `shell.css`.
- `src/games/{types,registry}.ts` — `HostGameViewProps` (inclui `reactions`),
  `HostGameEntry` e `HOST_GAMES = { uno: {…}, coup: {…} }` (`{ View, Cover }`).
  Adicionar um jogo = 1 import + 1 entrada.
- `src/games/uno/` — `UnoHostView.tsx`, `UnoCover.tsx` (capa SVG),
  `describeEvent.ts`, `animations.ts` (Fase 10), `sound-map.ts`, `uno-host.css`
  (arte das cartas vem de `@party/ui/uno-cards`).
- `src/games/coup/` — `CoupHostView.tsx` (mesa, banner de fase, faixa de
  revelação de desafio, feed, overlays, bolhas de reação), `CoupCover.tsx`,
  `describeEvent.ts`, `coupCards.ts` (emoji/cor por personagem — sem assets),
  `coup-host.css`.
- `src/index.css` — reset mínimo; tokens vêm de `@party/ui/tokens.css` (via `main.tsx`).
