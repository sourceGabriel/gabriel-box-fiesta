# Gabriel Box Fiesta — Fase 1 (Arquitetura do MVP)

Este repositório inicia a **plataforma de party games multiplayer local** com o primeiro jogo inspirado em UNO.

> Escopo desta entrega: **somente Fase 1 (arquitetura e plano técnico)**, sem implementação completa das fases seguintes.

## 1) Arquitetura recomendada

- **Monolito modular TypeScript** (sem microsserviços no MVP).
- **Servidor autoritativo** para regras, estado, turnos, timer, validação e eventos.
- **Clientes React separados por papel**:
  - `host`: tela principal + administração;
  - `mobile`: controle do jogador.
- **Camada `shared`** com tipos/protocolo/eventos compartilhados.
- **Estado em memória** com interfaces preparadas para persistência futura.

## 2) Diagrama de componentes

```text
            ┌─────────────────────────────┐
            │          HOST (React)       │
            │  Tela principal + Admin UI  │
            └──────────────┬──────────────┘
                           │ WebSocket
┌──────────────────────────┴──────────────────────────┐
│              SERVER (Node + TypeScript)             │
│                                                      │
│  ┌──────────────┐   ┌─────────────────────────────┐ │
│  │ WS Gateway   │──▶│ Room/Application Services   │ │
│  │ (entrada)    │   │ Sessions, Owner, Lifecycle  │ │
│  └──────────────┘   └──────────────┬──────────────┘ │
│                                     │                │
│                         ┌───────────▼───────────┐    │
│                         │      Game Engine      │    │
│                         │ (Game interface)      │    │
│                         └───────────┬───────────┘    │
│                                     │                │
│                           ┌─────────▼─────────┐      │
│                           │     UnoGame       │      │
│                           │ rules/state/events│      │
│                           └───────────────────┘      │
└──────────────────────────┬───────────────────────────┘
                           │ WebSocket
            ┌──────────────▼──────────────┐
            │       MOBILE (React)        │
            │ Controle + mão privada      │
            └─────────────────────────────┘
```

## 3) Responsabilidades por componente

- **WS Gateway**: autenticação de sessão, parsing/validação de mensagens, rate limiting básico, roteamento de ações.
- **Room Service**: uma sala ativa por servidor, entrada/saída, owner, reconexão, broadcast segmentado.
- **Session Service**: emissão/validação de session token, vínculo player↔sessão↔conexão.
- **Game Engine Core**: contrato comum entre jogos.
- **UnoGame**: regras e transições de estado de UNO-like.
- **Host Client**: render público e animações orientadas a eventos.
- **Mobile Client**: render privado do jogador e envio de ações.

## 4) Modelo de domínio (alto nível)

- `Room`: `id`, `code`, `ownerPlayerId`, `players`, `game`, `connections`, `status`.
- `Player`: `id`, `name`, `connected`, `seat`, `sessionId`.
- `Session`: `id`, `playerId`, `tokenHash`, `expiresAt`, `lastSeenAt`.
- `Game` (abstração): estado e transições.
- `UnoState`: baralho, descarte, mãos, cor atual, jogador da vez, direção, penalidade pendente, placar, rodada, timer.

## 5) Game Engine (contrato)

```ts
interface Game<TState, TAction, TEvent> {
  start(): void;
  handleAction(action: TAction): TEvent[];
  getState(): TState;
  getPublicState(): unknown;
  getPrivateState(playerId: string): unknown;
  getEvents(): TEvent[];
}
```

UNO será uma implementação isolada desse contrato, executável sem navegador.

## 6) Máquina de estados do UNO

Estados principais:

- `waiting_players`
- `ready`
- `round_active`
- `awaiting_color_choice`
- `round_finished`
- `game_finished`
- `paused`

Transições dirigidas por ações validadas no servidor (`PLAY_CARD`, `DRAW_CARD`, `CHOOSE_COLOR`, `UNO_CALL`, `UNO_CHALLENGE`, `TIMEOUT`, etc.).

## 7) Ciclo de vida da partida

1. Criar sala e código.
2. Entrar jogadores (2–8).
3. Owner inicia.
4. Embaralhar/distribuir (7 cartas).
5. Turnos com timer.
6. Encerrar rodada ao jogador zerar mão.
7. Calcular pontuação e iniciar nova rodada.
8. Encerrar jogo por condição definida.

## 8) Ciclo de vida da sala

1. `room_created`
2. `accepting_players`
3. `in_game`
4. `paused` (opcional)
5. `ended`/`reset`

Com transferência automática de owner em desconexão.

## 9) Estratégia de WebSocket

- Comunicação full-duplex com mensagens tipadas/versionadas.
- Envelope comum: `messageId`, `clientSeq`, `type`, `payload`, `sentAt`, `protocolVersion`.
- ACK opcional e idempotência por `messageId` para lidar com duplicidade/reenvio.

## 10) Estratégia de reconexão

- Sessão emitida no `JOIN_ROOM` bem-sucedido.
- Token assinado/aleatório (armazenado no cliente), validado no reconnect.
- Reconexão reaproveita `playerId` e mão existente.
- Timeout de presença apenas marca desconectado; estado do jogador é preservado.

## 11) Protocolo de mensagens (base)

Cliente → servidor:
- `JOIN_ROOM`, `RECONNECT_SESSION`, `START_GAME`, `PLAY_CARD`, `DRAW_CARD`, `CHOOSE_COLOR`, `UNO_CALL`, `UNO_CHALLENGE`, `PAUSE_GAME`, `RESUME_GAME`, `KICK_PLAYER`

Servidor → clientes:
- `ROOM_JOINED`, `ROOM_STATE`, `PLAYER_JOINED`, `PLAYER_RECONNECTED`, `OWNER_CHANGED`
- `GAME_STARTED`, `GAME_STATE_PUBLIC`, `PLAYER_STATE_PRIVATE`
- `CARD_PLAYED`, `CARD_DRAWN`, `COLOR_CHANGED`, `DIRECTION_CHANGED`, `TURN_STARTED`, `TURN_ENDED`
- `UNO_CALLED`, `UNO_PENALTY_APPLIED`, `ROUND_FINISHED`, `SCORE_UPDATED`, `ERROR`

## 12) Privacidade das cartas

- `getPublicState()` nunca inclui mãos completas.
- `getPrivateState(playerId)` retorna apenas a mão do jogador autenticado.
- Host recebe apenas agregados públicos (topo descarte, contagem de cartas por jogador, turnos, eventos).

## 13) Estratégia de timer

- Timer autoritativo no servidor por turno (default 30s, configurável).
- Expiração gera `TIMEOUT` interno:
  - compra automática ou ação válida conforme estado;
  - garante progresso e evita travamento.

## 14) Estratégia de sincronização (estado + animação)

- Servidor aplica ação, gera eventos semânticos e publica snapshot/version.
- Host executa animações por evento.
- Clientes reconciliam por `stateVersion` (descartando snapshots antigos).

## 15) Estrutura inicial de diretórios

```text
party-game/
├── server/
│   ├── core/
│   ├── games/uno/
│   ├── websocket/
│   └── app/
├── shared/
│   ├── protocol/
│   ├── events/
│   └── models/
├── host/
│   └── src/
└── mobile/
    └── src/
```

## 16) Dependências necessárias (MVP)

- Backend: `node`, `typescript`, `ws` (ou `socket.io`), `zod` (validação), `nanoid` (ids), `pino` (logs), `qrcode` (QR).
- Frontend (host/mobile): `react`, `react-dom`, `vite`, `typescript`.
- Testes: `vitest` (engine e regras).

> Recomendação: usar `ws` para simplicidade e controle fino no MVP.

## 17) Riscos técnicos

- Reconexão segura sem banco.
- Tratamento de ordem/duplicidade em rede instável.
- Regras especiais (+2/+4 acumulando com regra customizada).
- Sincronização de animação no host sem impactar autoridade do servidor.
- Descoberta de IP correta em múltiplas interfaces.

## 18) Decisões em aberto

- Biblioteca final de WebSocket (`ws` vs `socket.io`).
- Política exata de expiração de sessão no modo local.
- Regra de pontuação final por partida (limite de pontos/rodadas).
- Política de desempate e UX de denúncia UNO em janela de 2 rodadas.
- Estratégia UX para escolha de interface de IP quando houver múltiplas.

## 19) Roadmap por fases

1. **Fase 1 (atual)**: arquitetura, domínio, protocolo.
2. **Fase 2**: core (Room/Player/Session/GameState).
3. **Fase 3**: engine UNO + testes de regras.
4. **Fase 4**: WebSocket e validações.
5. **Fase 5**: host funcional.
6. **Fase 6**: mobile funcional.
7. **Fase 7**: reconexão completa.
8. **Fase 8**: testes multiplayer 2–8.
9. **Fase 9–11**: UX, animações, polimento party game.
10. **Fase 12**: consolidação de plataforma multi-jogos.

## Execução local (planejada para próximas fases)

Após bootstrap do monorepo:

```bash
# exemplo futuro
pnpm install
pnpm -r dev
```

## Validação desta fase

- A arquitetura está documentada e cobre os 19 tópicos solicitados.
- Nenhuma implementação de fases seguintes foi iniciada nesta entrega.