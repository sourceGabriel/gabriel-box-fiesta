# @party/shared — contratos entre apps

O **único** ponto de acoplamento entre `server`, `host` e `mobile`.
**Somente tipos** — nenhum código de runtime, nenhuma dependência (nem `zod`).

## Conteúdo

| Arquivo | O que define |
|---|---|
| `src/models/common.ts` | genéricos: `PlayerId`, `RoomId`, `SessionId`, `TurnTimer` |
| `src/models/avatar.ts` | `AvatarSpec` (`{ gender, skin, hair, hairColor, eyes, shirt, hat, bg }` — ids de catálogo). Catálogos + renderer pixel + `sanitizeAvatar` ficam em `@party/ui` (`ui/src/avatar.ts` + `ui/src/avatar-assets/`). |
| `src/models/room.ts` | `Player` (inclui `avatar`), `Session`, `RoomSummary` |
| `src/models/uno.ts` | tipos do UNO (`UnoCard`, `UnoPublicState`, `UnoPrivatePlayerState`, `UnoPhase`, `Direction`, …) |
| `src/models/coup.ts` | tipos do Coup (`CoupPublicState`, `CoupPrivateState`, `CoupCharacter`, `CoupActionType`, `CoupPhase`, `CoupDecision`, …) — valores string iguais aos enums internos da engine |
| `src/games/{meta,status,lifecycle}.ts` | contrato genérico de jogo: `GameMeta`, `GameStatus`, `LifecycleEvent` |
| `src/games/uno/events.ts` · `src/games/coup/events.ts` | uniões de eventos por jogo (`UnoGameEvent` / `CoupGameEvent`) — viajam opacas em `GAME_EVENT { event: unknown }` |
| `src/protocol/messages.ts` | `Envelope`, `ClientMessage`, `ServerMessage` — o protocolo de fio; payloads de estado/evento são `unknown` (`{ gameId, state\|event: unknown }`). Inclui `SEND_REACTION`/`REACTION` (emoji genérico, agnóstico de jogo). `JOIN_ROOM.avatar?` + `ROOM_STATE.players[].avatar` + `PLAYER_JOINED.avatar` carregam o `AvatarSpec`. |

## Uso

Importado como `@party/shared` (workspace `file:`):

```ts
import type { ServerMessage, GameMeta } from '@party/shared';
```

Após editar, rode `npm run -w shared build` — os outros workspaces consomem
`dist/`. Verificação: `npm run -w shared lint` (`tsc --noEmit`).
