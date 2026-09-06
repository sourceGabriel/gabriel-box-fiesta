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

Hoje `src/App.tsx` é um componente único (lobby + tabuleiro UNO + animações da
Fase 10). A Fase A do plano (`.claude/plans/`) extrai isto para
`src/shell/` (conexão, lobby, chrome — genéricos) + `src/games/uno/` (a view do
UNO), com um registry estático `HOST_GAMES` para múltiplos jogos.
