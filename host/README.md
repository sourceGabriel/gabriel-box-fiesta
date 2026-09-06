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

- `src/App.tsx` — dispatcher fino: monta a conexão e mostra o lobby até um jogo
  começar, depois entrega para a view registrada daquele jogo. Não conhece UNO.
- `src/shell/` — parte **genérica** (nenhum conhecimento de jogo):
  - `useRoomConnection.ts` — `/room` + WebSocket (reconexão + backoff), expõe
    `{ roomCode, players, catalog, selectedGameId, activeGameId, publicState,
    events, connected, send, … }`. `publicState`/`events` são opacos aqui.
  - `LobbyScreen.tsx` — QR + código + lista de jogadores + botão iniciar; mostra
    a grade do `GAME_CATALOG` só quando há mais de um jogo. `brandName` é prop.
  - `messages.ts`, `shell.css`.
- `src/games/{types,registry}.ts` — `HostGameViewProps` e
  `HOST_GAMES = { uno: UnoHostView }`. Adicionar um jogo = 1 import + 1 entrada.
- `src/games/uno/` — a view do UNO (`UnoHostView.tsx`), `describeEvent.ts`,
  `animations.ts` (Fase 10), `cardArt.ts`, `uno-host.css`.
- `src/index.css` — reset mínimo + design tokens (`--bg`/`--panel`/`--line`/…).
