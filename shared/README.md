# @party/shared — contratos entre apps

O **único** ponto de acoplamento entre `server`, `host` e `mobile`.
**Somente tipos** — nenhum código de runtime, nenhuma dependência (nem `zod`).

## Conteúdo

| Arquivo | O que define |
|---|---|
| `src/models/common.ts` | `PlayerId`, `RoomId`, `SessionId`, `TurnTimer` |
| `src/models/room.ts` | `Player`, `Session`, `RoomSummary` |
| `src/models/uno.ts` | tipos do UNO (`UnoCard`, `UnoPublicState`, `UnoPrivatePlayerState`, `Phase`, `Direction`, …) |
| `src/games/` | contrato genérico de jogo: `GameMeta`, `GameStatus`, `LifecycleEvent` |
| `src/events/game-events.ts` | união de eventos do UNO (`GameEvent`) — migra para `src/games/uno/events.ts` na Fase A5 |
| `src/protocol/messages.ts` | `Envelope`, `ClientMessage`, `ServerMessage` — o protocolo de fio |

## Uso

Importado como `@party/shared` (workspace `file:`):

```ts
import type { ServerMessage, GameMeta } from '@party/shared';
```

Após editar, rode `npm run -w shared build` — os outros workspaces consomem
`dist/`. Verificação: `npm run -w shared lint` (`tsc --noEmit`).
