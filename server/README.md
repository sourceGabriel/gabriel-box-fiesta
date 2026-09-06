# @party/server — servidor autoritativo

Fonte única da verdade: estado do jogo, validação, turnos, timers, pontuação,
eventos. Gateway WebSocket (raw `ws`), uma sala em memória, sem banco.

Node 20+, TypeScript (`tsx` em dev, `tsc` no build). Depende só de `@party/shared`
para os contratos de fio.

## Rodar

```bash
npm run -w server dev     # tsx watch — porta 3001 (PORT= para trocar)
```

Ao subir, o log mostra o código da sala e a URL de join (`http://<ip>:5174/join/<código>`).
Force o IP/origem com `PARTY_PUBLIC_URL=http://<ip>:5174` se a auto-detecção errar.

## Testar / lint / build

```bash
npm run -w server test    # vitest — regras UNO + Coup + integração multiplayer (~57)
npm run -w server lint    # tsc --noEmit
npm run -w server build   # tsc -p tsconfig.json
```

## Mapa

| Pasta | Papel |
|---|---|
| `src/core/` | `Room` (jogadores/owner/reconexão/janela de graça), `SessionService`, `RoomManager`, `game-plugin.ts` (contrato `GamePlugin`/`GameInstance` + capacidades `TurnTimedGame`/`RoundedGame`/`PausableGame`/`TickingGame`) |
| `src/games/` | `registry.ts` (`GAMES`) + `games/<id>/` (regras puras + `plugin.ts`). Hoje: `uno/`, `coup/`. |
| `src/games/coup/` | engine clássica do Coup portada de um app standalone: `deck`/`player`/`game`/`action-resolver` (regras puras, `ResolverResult`+`SideEffect`) + `coup-game.ts` (`CoupGame` — orquestra, projeta estado, emite eventos; `getTimer()`/`onTurnTimeout()` no lugar de `setTimeout`) + `action-schema.ts` (zod) + `plugin.ts`. RNG/relógio injetados via `GameContext`. |
| `src/websocket/` | `ws-server.ts` (gateway, roteamento de `GAME_ACTION`, broadcast, tick de timer, rebroadcast de `SEND_REACTION`→`REACTION`), `protocol.ts` (validação zod do envelope) |
| `src/network/` | descoberta de IPv4 local |
| `src/tests/` | `uno-game` / `coup-game` (regras), `room` (lobby), `multiplayer.integration` (black-box sobre `ws`, inclui um caminho Coup + reações) |

**Regra de ouro:** adicionar um jogo = `src/games/<id>/` + 1 linha em `registry.ts`.
Nada em `core/` ou `websocket/` conhece um jogo específico (ver `.claude/plans/`).
`shared/` fica **só tipos** — todo o `zod` das ações do jogo vive em `games/<id>/action-schema.ts`.
