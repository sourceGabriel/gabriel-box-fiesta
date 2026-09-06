# Revisão do repositório: lacunas em relação ao prompt mestre

_Atualizado em 2026-09-06 (branch `feature/coup-ou-coupa`, após PR A1+A2)._

## Resumo executivo
O MVP jogável do UNO (§53) está **completo e validado**: host mostra a mesa em tempo real, partida completa com cartas especiais, coringa com escolha de cor, UNO!, denúncia, placar acumulado entre rodadas, fim de partida, pausar/continuar, reconexão de jogador e transferência de owner. **27 testes de servidor verdes**; build dos 4 workspaces verde.

**Fase A (núcleo agnóstico, §52) em andamento:**
- ✅ **A1** — contrato genérico em `shared/` (`GameMeta`, `GameStatus`, `LifecycleEvent`, mensagens `GAME_ACTION`/`SELECT_GAME`/`GAME_CATALOG`).
- ✅ **A2** — `GamePlugin`/registry + `GameInstance` opaco + `Room` sem import de UNO no servidor; protocolo duplo. O **servidor** já satisfaz "adicionar jogo = `src/games/<id>/` + 1 linha no registry".
- 🔜 **A3/A4** — falta extrair o shell dos frontends (`host`/`mobile`), hoje 100% UNO.
- 🔜 **A5** — remover os 5 verbos UNO do fio; payloads `{ gameId, state }` genéricos.

## O que já existe (Fases 1–10 + polimento)
- Monorepo `server` / `shared` (types-only) / `host` / `mobile`.
- Servidor web local: WebSocket (`ws`) com protocolo tipado + `zod`, dedupe por `messageId`, rate-limit, `maxPayload` 16KB, logs estruturados (`pino`).
- Core: `Room` (players / owner / reconexão / kick / janela de graça de 30s), `SessionService` (token sha256 + TTL 6h), `RoomManager` (1 sala).
- Engine UNO (`server/src/games/uno/`, ~635 linhas): distribuição, todas as cartas (número, +2, bloqueio, inverte, coringa, +4), acúmulo +2, +4 sobre +2 (rejeita +2 sobre +4), reverse=skip com 2 jogadores, UNO call, denúncia com janela determinística de 2 turnos, pontuação por rodada, múltiplas rodadas, fim de partida por meta, reconstrução do monte, timeout autoritativo, pausa/retomada.
- Host: lobby com QR + código + URL; board de jogo (monte/descarte com arte, cor ativa, sentido, +N, destaque de turno, contagem de mãos, timer); overlay de resultado com placar; controles do owner (iniciar, próxima rodada, pausar, encerrar, expulsar); feed de eventos; animações da Fase 10 dirigidas por evento.
- Mobile: entrada com avatar + preview; sala de espera / pausa; retomada de sessão automática no reload; view de jogo (faixa da mesa, mão com destaque de jogável, seleção, modal de cor pós-jogada, botões jogar/comprar/UNO, denúncia); identidade visual "party" própria.
- Reconexão: token de sessão assinado, preserva identidade + mão; owner transfere só após a janela de graça; auto-reconnect com backoff nos dois clients.
- Testes: unitários de regras UNO + integração multiplayer (join/owner-transfer/reconexão, 8 jogadores, partida sustentada, mensagem duplicada). Raiz `npm test` verde.

## O que falta para o prompt mestre

### 1) Fase 12 / §52 — núcleo agnóstico de jogo (lacuna principal)
"Adicionar um jogo novo não deve exigir modificar o núcleo." Hoje o core nomeia o UNO em 4 lugares:
- `server/src/core/room.ts` — importa `UnoGame` concreto e `UnoAction`; `game: UnoGame | null`.
- `server/src/websocket/ws-server.ts` — monta objetos `UnoAction` inline a partir de `PLAY_CARD`/`DRAW_CARD`/`CHOOSE_COLOR`/`UNO_CALL`/`UNO_CHALLENGE`; lê `room.game.getState().hands` e `.timer` diretamente.
- `shared/src/protocol/messages.ts` — `GAME_STATE_PUBLIC`/`PLAYER_STATE_PRIVATE`/`GAME_EVENT` tipados com `UnoPublicState`/`UnoPrivatePlayerState`/`GameEvent`; a união de mensagens mistura verbos de shell e verbos UNO.
- `shared/src/events/game-events.ts` — importa `UnoCard`/`UnoColor`.
- `shared/src/models/common.ts` — `Phase` mistura genérico e `awaiting_color_choice` (puro UNO); `Direction` é só UNO.
A interface `Game<>` já existe e não é usada pelo core — a extração de um `GamePlugin`/registry é limitada e bem definida.

### 2) Frontend sem shell multi-jogo
`host/src/App.tsx` (~589 linhas) e `mobile/src/App.tsx` (~554 linhas) são componentes flat, 100% UNO, sem router nem separação shell/jogo. `cardArt.ts` está duplicado byte-a-byte entre host e mobile. Não há pacote de UI compartilhado; tokens de CSS duplicados com valores levemente diferentes. `host/src/index.css` ainda é o template do Vite (morto, conflitante).

### 3) Fase 11 — identidade visual completa + sons (§47)
Mobile já tem identidade "party" própria; host tem visual TV coeso. Falta: sistema de design compartilhado (`@party/ui`), sons (sintetizados via Web Audio, sem assets), e uma identidade de marca própria substituindo o nome "UNO" (adiado por decisão do usuário).

### 4) Menores
- Fluxo "jogar a carta que acabou de comprar" existe no engine (`playDrawnCardId`) mas não está exposto na UI do mobile.
- Seletor de interface de IP quando há múltiplas (§39) — hoje auto-escolhe IPv4 privado; há override por env.
- `shuffle` usa `Math.random` (não injetado) — gap de determinismo para testes reproduzíveis; será corrigido na Fase A via `GameContext.random`.
- `multiplayer.integration.test.ts` fixa `108` cartas (invariante legítimo do UNO).

## Não fazer agora (§54)
Múltiplas salas, espectadores, contas, banco, cloud — fora de escopo do MVP.

## Próximo passo
Executar a **Fase A** do plano `C:\Users\gabri\.claude\plans\antes-dos-proximos-passos-elegant-clover.md`: 5 PRs que tornam o core agnóstico (registry `GamePlugin`, `GameInstance` opaco, `Room` sem import de UNO, mensagem genérica `GAME_ACTION`, shell de frontend por papel + módulo `games/uno/`), mantendo o UNO idêntico e os 25 testes verdes. Depois: Fase B (catálogo/seleção de jogo), Fase C (design system + sons), Fase D (integrar o 2º jogo).
