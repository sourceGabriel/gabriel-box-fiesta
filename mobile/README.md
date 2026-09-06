# @party/mobile — controle do jogador (celular)

A interface que cada jogador abre no navegador do celular: entrar na sala, ver a
mão privada, jogar. **Consumidor de estado validado** — nenhuma regra roda aqui;
toda ação vai para o servidor validar.

React 19 + Vite, mobile-first. Depende de `@party/shared` e conversa com o
`@party/server` por WebSocket. Retoma a sessão sozinho ao recarregar a aba.

## Rodar

```bash
npm run -w mobile dev     # http://localhost:5174  (a partir da raiz do repo)
```

Precisa do servidor (porta 3001) no ar. Entre por
`http://<IP-DO-PC>:5174/join/<CÓDIGO-DA-SALA>` (o QR do host aponta para cá).

## Configuração

`.env` opcional:

- `VITE_SERVER_ORIGIN` — origem do servidor se não for `http://<mesmo-host>:3001`.

Se o QR/URL do host apontar para um IP errado (máquina com várias interfaces),
suba o servidor com `PARTY_PUBLIC_URL=http://<ip-certo>:5174`.

## Build / lint

```bash
npm run -w mobile build   # tsc -b && vite build
npm run -w mobile lint    # oxlint
```

## Estrutura

- `src/App.tsx` — dispatcher fino: `JoinScreen` até entrar, `WaitingScreen` até o
  jogo começar (com estado público + privado), depois a view do jogo ativo.
- `src/shell/` — parte **genérica** (nenhum conhecimento de jogo):
  - `session.ts` — subsistema de sessão/reconexão: chaves `activeSession:<SALA>` e
    `session:<SALA>:<nome>` no localStorage, `readStoredSessionKey` / `readToken` /
    `writeToken` / `rememberActiveSession` / `clearStoredSession`.
  - `useRoomConnection.ts` — WebSocket (reconexão + backoff), `RECONNECT_SESSION` no
    open, persistência de token no `ROOM_JOINED`, recuperação de
    `INVALID_SESSION`/`PLAYER_NOT_FOUND`, `joinOrReconnect({ playerName, avatar })`.
    Expõe `{ roomCode, playerId, connected, error, roomPlayers, catalog,
    selectedGameId, activeGameId, publicState, privateState, send, … }` —
    `publicState`/`privateState` opacos.
  - `MobileHeader.tsx`, `JoinScreen.tsx`, `WaitingScreen.tsx` (mostra o nome do
    jogo selecionado), `messages.ts`, `shell.css`.
- `src/games/{types,registry}.ts` — `ControllerGameViewProps` e
  `CONTROLLER_GAMES = { uno: UnoControllerView }`. Adicionar um jogo = 1 import + 1
  entrada.
- `src/games/uno/` — `UnoControllerView.tsx` (mão, mesa, ações, modal de cor,
  UNO/denúncia, resultado, pausa), `cardArt.ts`, `uno-controller.css`.
- `src/index.css` — reset + design tokens (`--panel`, `--accent`, `--uno-*`, …).
