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

Hoje `src/App.tsx` é um componente único. O subsistema de sessão/reconexão
(`activeSessionStorageKey`, `joinOrReconnect`, recuperação de `INVALID_SESSION`) é
genérico e será extraído para `src/shell/session.ts` na Fase A4 do plano; a view
do UNO vira `src/games/uno/UnoControllerView.tsx`.
