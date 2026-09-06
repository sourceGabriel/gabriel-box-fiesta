# Revisão do repositório: lacunas em relação ao prompt mestre

_Atualizado em 2026-09-06 (branch `feature/coup-ou-coupa`, após a Fase A completa (A1→A5) + Fase B)._

## Resumo executivo
O MVP jogável do UNO (§53) está **completo e validado**: host mostra a mesa em tempo real, partida completa com cartas especiais, coringa com escolha de cor, UNO!, denúncia, placar acumulado entre rodadas, fim de partida, pausar/continuar, reconexão de jogador e transferência de owner. **27 testes de servidor verdes**; build dos 4 workspaces verde.

**Fase A (núcleo agnóstico, §52) — COMPLETA:**
- ✅ **A1** — contrato genérico em `shared/` (`GameMeta`, `GameStatus`, `LifecycleEvent`, mensagens `GAME_ACTION`/`SELECT_GAME`/`GAME_CATALOG`).
- ✅ **A2** — `GamePlugin`/registry + `GameInstance` opaco + `Room` sem import de UNO no servidor. `server/src/core/game.ts` deletado.
- ✅ **A3** — `host` = shell agnóstico (`host/src/shell/`, `publicState`/`events` opacos) + `host/src/games/uno/` (`HOST_GAMES`) + `App.tsx` dispatcher fino.
- ✅ **A4** — `mobile` = shell agnóstico (`mobile/src/shell/`, `session.ts` extraído verbatim, `publicState`/`privateState` opacos) + `mobile/src/games/uno/` (`CONTROLLER_GAMES`) + `App.tsx` dispatcher fino.
- ✅ **A5** — protocolo genérico (quebra de fio): só `GAME_ACTION`; `GAME_STATE_PUBLIC`/`PLAYER_STATE_PRIVATE`/`GAME_EVENT` = `{ gameId, state|event: unknown }`; `GAME_STARTED` = `{ gameId }`; `ROOM_STATE` sem `handCount`. `events/game-events.ts` → `games/uno/events.ts`; `Direction`/`Phase` movidos pra `models/uno.ts`.

**§52 satisfeito:** adicionar um jogo = `GamePlugin` (TS puro) + `server/src/games/<id>/` + 1 linha em `GAMES` + 1 view de host + 1 view de controller + 1 linha em cada registry de frontend. Zero edições em `core/`, `ws-server.ts`, ou os shells.

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

### 1) §52 — núcleo agnóstico de jogo — ✅ RESOLVIDO (Fase A)
"Adicionar um jogo novo não deve exigir modificar o núcleo." Feito: `GamePlugin`/`GameInstance` opaco (`server/src/core/game-plugin.ts`), registry `GAMES`, `Room` sem import de UNO, `ws-server` só roteia `GAME_ACTION`, `messages.ts` com payloads `{ gameId, state|event: unknown }`, `UnoGameEvent` em `shared/src/games/uno/events.ts`, `common.ts` só genérico (`Direction`/`UnoPhase` em `models/uno.ts`). Único nome UNO que sobra no `shared`: `models/uno.ts` + `games/uno/events.ts` (ambos escopados) e `unoPlugin.meta.name` (§47, Fase C). Prova: um plugin stub entra tocando só `server/src/games/<id>/` + 1 linha em cada registry.

### 2) Frontend sem shell multi-jogo + seleção de jogo
**Resolvido em A3/A4 (shells) + Fase B (seleção):** os dois `App.tsx` são dispatchers finos; o host tem o fluxo de 3 telas `attract → catalog → lobby` (`AttractScreen`/`CatalogScreen`/`LobbyScreen`), arte de capa por jogo (`HOST_GAMES[id].Cover`, SVG inline), navegação teclado + clique; QR só no lobby; fim de jogo (`END_GAME`) → volta pro lobby do mesmo jogo; mobile volta pro waiting (`GAME_ENDED`, sessão mantida). **Ainda pendente (Fase C):** `cardArt.ts` duplicado entre host e mobile, sem pacote `@party/ui`, tokens de CSS duplicados.

### 3) Fase 11 — identidade visual completa + sons (§47)
Mobile já tem identidade "party" própria; host tem visual TV coeso. Falta: sistema de design compartilhado (`@party/ui`), sons (sintetizados via Web Audio, sem assets), e uma identidade de marca própria substituindo o nome "UNO" (adiado por decisão do usuário).

### 4) Menores
- Fluxo "jogar a carta que acabou de comprar" existe no engine (`playDrawnCardId`) mas não está exposto na UI do mobile.
- Seletor de interface de IP quando há múltiplas (§39) — hoje auto-escolhe IPv4 privado; há override por env.
- `shuffle` agora usa `GameContext.random` injetado (corrigido na Fase A/A2) — testes podem passar um RNG determinístico; `nanoid` de ids ainda não é injetado (baixa prioridade).
- `multiplayer.integration.test.ts` fixa `108` cartas (invariante legítimo do UNO).

## Não fazer agora (§54)
Múltiplas salas, espectadores, contas, banco, cloud — fora de escopo do MVP.

## Próximo passo
Executar a **Fase A** do plano `C:\Users\gabri\.claude\plans\antes-dos-proximos-passos-elegant-clover.md`: 5 PRs que tornam o core agnóstico (registry `GamePlugin`, `GameInstance` opaco, `Room` sem import de UNO, mensagem genérica `GAME_ACTION`, shell de frontend por papel + módulo `games/uno/`), mantendo o UNO idêntico e os 25 testes verdes. Depois: Fase B (catálogo/seleção de jogo), Fase C (design system + sons), Fase D (integrar o 2º jogo).
