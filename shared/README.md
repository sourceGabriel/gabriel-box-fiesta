# @party/shared — contratos entre apps

O **único** ponto de acoplamento entre `server`, `host` e `mobile`.
**Somente tipos** — nenhum código de runtime, nenhuma dependência (nem `zod`).

## Conteúdo

| Arquivo | O que define |
|---|---|
| `src/models/common.ts` | genéricos: `PlayerId`, `RoomId`, `SessionId`, `TurnTimer` |
| `src/models/room.ts` | `Player`, `Session`, `RoomSummary` |
| `src/models/uno.ts` | tipos do UNO (`UnoCard`, `UnoPublicState`, `UnoPrivatePlayerState`, `UnoPhase`, `Direction`, …) |
| `src/games/{meta,status,lifecycle}.ts` | contrato genérico de jogo: `GameMeta`, `GameStatus`, `LifecycleEvent` |
| `src/games/uno/events.ts` | união de eventos do UNO (`UnoGameEvent`) — viaja opaca em `GAME_EVENT { event: unknown }` |
| `src/protocol/messages.ts` | `Envelope`, `ClientMessage`, `ServerMessage` — o protocolo de fio; payloads de estado/evento são `unknown` (`{ gameId, state\|event: unknown }`) |

## Uso

Importado como `@party/shared` (workspace `file:`):

```ts
import type { ServerMessage, GameMeta } from '@party/shared';
```

Após editar, rode `npm run -w shared build` — os outros workspaces consomem
`dist/`. Verificação: `npm run -w shared lint` (`tsc --noEmit`).
