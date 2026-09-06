# Gabriel Box Fiesta — Plataforma Party Games (MVP Local)

Este repositório implementa um **MVP local de plataforma de party games multiplayer** com o primeiro jogo inspirado em UNO.

> Escopo atual: MVP do UNO completo e validado (Fases 1–10). Próximo: núcleo agnóstico de jogo (§52) para plugar um 2º jogo. Ver `docs/CHANGELOG.md` e `docs/repository-gap-review.md`.

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

## Implementação atual (incremental)

_Atualizado em 2026-09-06. Detalhe por mudança em `docs/CHANGELOG.md`._

- ✅ **Fase 2** — Core (`Room`, `Session`, `RoomManager`, interface `Game`, janela de graça de 30s na desconexão).
- ✅ **Fase 3** — Engine UNO completo: todas as cartas, acúmulo de +2, +4 sobre +2, denúncia com janela determinística, múltiplas rodadas + placar, fim de partida por meta, pausa/retomada, timeout autoritativo.
- ✅ **Fase 4** — Servidor WebSocket com protocolo tipado + `zod`, dedupe por `messageId`, rate-limit, logs estruturados.
- ✅ **Fase 5** — Host: board de jogo real (monte/descarte com arte, cor, sentido, +N, turno, timer, placar), controles do owner.
- ✅ **Fase 6** — Mobile: entrada com avatar, faixa da mesa, mão com destaque de jogável, modal de cor pós-jogada, denúncia, retomada de sessão no reload; identidade visual "party" própria.
- ✅ **Fase 7** — Reconexão por token de sessão assinado + transferência automática de owner + auto-reconnect com backoff nos dois clients.
- ✅ **Fase 8** — Testes de integração multiplayer (join/owner/reconexão, 8 jogadores, partida sustentada, mensagem duplicada).
- ✅ **Fase 9–10** — UX + animações dirigidas por evento no host (cartas voando, flash de cor, burst de UNO/vitória; respeita `prefers-reduced-motion`).
- 🚧 **Fase A (núcleo agnóstico, §52)** — em andamento na branch `feature/coup-ou-coupa`. Extrair `GamePlugin`/registry para adicionar um 2º jogo sem tocar no núcleo. Plano: `.claude/plans/antes-dos-proximos-passos-elegant-clover.md`. Feito **antes** da Fase 11 por decisão (2º jogo pronto e travado na abstração).
  - ✅ A1 — contrato genérico em `shared/` (`GameMeta`, `GameStatus`, `LifecycleEvent`, `GAME_ACTION`/`SELECT_GAME`/`GAME_CATALOG`), não quebra nada.
  - ✅ A2 — registry de plugins + `GameInstance` opaco + `Room` agnóstico no servidor; protocolo duplo (verbos UNO antigos + `GAME_ACTION`). 27 testes verdes.
  - 🔜 A3/A4 — extrair shell dos frontends (`host`/`mobile`) + módulo `games/uno/`.
  - 🔜 A5 — remover verbos UNO do fio; payloads `{ gameId, state }` genéricos.
- 🔜 **Fase 11 (§47)** — identidade visual completa + sons; dobrada na Fase C do plano (design system `@party/ui`).

## Como rodar a aplicação (rede local)

Pré-requisito: **Node.js 20+**.

**Primeira vez / após puxar mudanças:**

```bash
npm install
```

**Subir os 3 serviços (um terminal cada, na raiz do repo):**

```bash
npm run -w server dev    # servidor autoritativo — porta 3001
```
```bash
npm run -w host dev      # tela da TV/PC — porta 5173
```
```bash
npm run -w mobile dev    # controle do celular — porta 5174
```

**Jogar:**

1. Abra a tela do host no PC/TV: `http://localhost:5173`. Ele mostra o **código da sala** e um **QR code**.
2. Cada jogador abre no celular (na mesma rede Wi-Fi) `http://<IP-DO-PC>:5174/join/<CÓDIGO>` — ou escaneia o QR. O IP aparece no log do servidor ao subir.
3. Digite o nome, escolha um avatar, entre. O **primeiro** jogador vira o **owner** e vê o botão "Iniciar partida" (o host também pode iniciar).
4. 2–8 jogadores. Owner inicia; o jogo roda; owner pode pausar/continuar/expulsar/encerrar e iniciar a próxima rodada.

**Configuração opcional (`.env` em `host/` e `mobile/`):**

- `VITE_SERVER_ORIGIN` — se o servidor não estiver em `http://<mesmo-host>:3001` (ex.: `http://192.168.0.10:3001`).

**Firewall:** em rede real, libere a porta `3001` (servidor) e `5174` (mobile) no sistema operacional. Em máquina com várias interfaces (Wi-Fi/Ethernet/VPN/Docker) o IP mostrado pode não ser o certo — use `PARTY_PUBLIC_URL=http://<ip>:5174` no ambiente do servidor para forçar.

## Como validar

```bash
npm run -w server test    # ~27 testes (regras UNO + integração multiplayer)
npm run -w server lint    # tsc --noEmit
npm run -w host lint      # oxlint
npm run -w mobile lint    # oxlint
npm run build             # build dos 4 workspaces
```

Ou tudo de uma vez a partir da raiz: `npm test && npm run lint && npm run build`.

**Smoke manual:** suba os 3 serviços, abra o host + 2 celulares (ou 2 abas do navegador em `/join/<código>`), jogue uma rodada completa, pause/continue, recarregue uma aba de celular (a sessão deve retomar), feche a aba do owner (o owner deve transferir após ~30s).

## Problemas conhecidos e rede local

- Em rede local real, firewalls podem bloquear acesso externo à porta `3001`.
- É necessário liberar a porta do servidor no sistema operacional.
- Em ambientes com múltiplas interfaces (Wi-Fi/Ethernet/VPN/Docker), o IP exibido pode não ser o ideal; a seleção atual prioriza IPv4 privado.