# Revisão do repositório: lacunas em relação ao prompt mestre

_Atualizado em 2026-09-08 (Lorota! + pack +18 + Sabe-Tudo + FDP + toggle Leve/Pesado mergeados; branch `feature/e-voce` — **jogo #7 "É Você!" COMPLETO**, 140 testes; 7 jogos no catálogo; branch `feature/catalog-coverflow` — menu de jogos vira coverflow 3-a-1 + personalidade por jogo, não mergeado)._

> **2026-09-08 — §47 SUSPENSO + easter egg "Gabsinto" (branch `feature/gabsinto`).** O dono derrubou a regra §47 "identidade visual própria" **e** a regra de som synth-only. Packs de assets públicos curados (arte + som por jogo) agora são permitidos — só licenças permissivas (CC0/CC-BY/OGA-BY/MIT-like), tudo empacotado (sem internet em runtime), `CREDITS.md` por pack, sem deps pesadas. `master-prompt.md` fica intocado; o override está no CLAUDE.md + CHANGELOG + changes-log. Junto: `AvatarSpec.preset?` (types-only) — um set de retratos escondido (`ui/src/avatar-presets/`, 8 retratos AI do dono via `tools/build-gabsinto.py`) que aparece no editor ("🕵️ Lendas") quando você digita o nome **"Gabsinto"** (destrava e persiste em `localStorage['party:legends']`). `<Avatar>` desenha o retrato `<img>` full-bleed. Schema do servidor ganha `preset` opcional (só forma). E2E vivo verde. Cameo do retrato nos overlays de vitória = **próxima fatia**. §52 intacto (mudança de plataforma, como avatares/reações).

> **2026-09-08 — Catálogo coverflow + personalidade por jogo (host, branch `feature/catalog-coverflow`).** A tela de escolha de jogo (`host/src/shell/CatalogScreen.tsx`) era uma grade plana de 7 cartas. Virou um **carrossel 3-a-1**: a carta focada fica grande e central com o brilho do seu accent, as duas vizinhas ladeiam menores e inclinadas (`rotateY` 3D), o resto fica fora do palco; ← → / ‹ › / clique na vizinha / dots giram o carrossel; wrap circular. Novo `GamePersonality { accent, vibe, blurb }` — um `host/src/games/<id>/personality.ts` por jogo (7), `HostGameEntry` ganha `personality`. O accent retinge o fundo + moldura + tag de "vibe" (RAIVA/TRAIÇÃO/EGO/MENTIRA/SOBERBA/SAFADEZA/AMIZADE) + a frase ácida (blurb) + o botão "▶ Iniciar" conforme rola. Sons: o catálogo passa a tocar os sons sintetizados do `@party/ui` (`select` ao girar, `special` ao escolher) — **nenhum arquivo de áudio** (a decisão §47 synth-only continua; packs externos de arte/áudio, ex. SpriteCook, ficaram de fora de propósito). §52 preservado — nada em `core/`, `ws-server`, `shared/`, mobile ou o fluxo do shell.

> **2026-09-07 — Avatares customizáveis (plataforma, agnóstico de jogo).** O "avatar" antigo era um único emoji colado no nome. Agora cada jogador monta um retrato pixel-art "foto 3x4" na tela de entrada: corpo (feminino/masculino), pele, cabelo (25 estilos) + cor, cor dos olhos, camisa, chapéu engraçado, fundo. Arte = subconjunto curado do Universal LPC Spritesheet Character Generator, extraído por `tools/build-avatars.py` para `ui/src/avatar-assets/` (69 PNGs, ~35 KB; fontes em `tools/lpc-source/`, nada fora do repo). Render híbrido: partes finitas assadas, cabelo recolorido em runtime num `<canvas>` 46×46. `AvatarSpec` (types-only em `shared`), catálogos + renderer + editor em `@party/ui`, `sanitizeAvatar` no cliente + validação estrutural no servidor. Aparece no join, sala de espera, roster do lobby (TV) e nos assentos/pills dentro de UNO e Coup. Créditos LPC em `ui/src/avatar-assets/CREDITS.md` + linha no join. **60 testes de servidor verdes.** §52 preservado — nenhuma edição em `core/`, `ws-server`, shells ou engines.

## Resumo executivo
O MVP jogável do UNO (§53) está **completo e validado**. **Coup entrou como jogo #2** (Fase D, regras clássicas): engine portada de `Jogos/Coup/src/engine/` (sem a expansão Reformation, sem bots), view de TV + controlador mobile, tela "Como jogar". **57 testes de servidor verdes**; build dos 4 workspaces verde. **Prova §52 confirmada na prática:** adicionar o Coup não tocou `core/`, `ws-server.ts`, os shells nem `shared/protocol` — a fatia D5 (reações emoji) é infra genérica de plataforma, não do jogo.

**Fase D (Coup) — v1 COMPLETA:**
- ✅ **D1** `shared/src/models/coup.ts` + `shared/src/games/coup/events.ts` (types-only).
- ✅ **D2** `server/src/games/coup/` (engine clássica portada; RNG/relógio injetados; timers via `TurnTimedGame`) + registry + 27 testes.
- ✅ **D3** `host/src/games/coup/` (TV) · ✅ **D4** `mobile/src/games/coup/` (controlador + "Como jogar").
- ✅ **D5** reações emoji genéricas (`SEND_REACTION`/`REACTION`).
- ✅ **D6a** arte real das cartas — 6 `.webp` (`coup_card_art/`) via `@party/ui/coup-cards` (espelha `uno-cards`); host + controlador + capa renderizam retratos. Emoji era placeholder.
- 🔜 **D6** restante: sons (`sound-map.ts`), animação de flip. **Descopado:** bots (decisão do usuário 2026-09-07 — não fazer). **Adiada:** expansão Reformation.

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
- Mobile: entrada com **editor de avatar pixel customizável** (`AvatarEditor` — corpo/pele/cabelo+cor/olhos/camisa/chapéu/fundo, "Surpresa", persistido em `localStorage`) + preview `<canvas>`; sala de espera / pausa; retomada de sessão automática no reload; view de jogo (faixa da mesa, mão com destaque de jogável, seleção, modal de cor pós-jogada, botões jogar/comprar/UNO, denúncia); identidade visual "party" própria.
- Reconexão: token de sessão assinado, preserva identidade + mão; owner transfere só após a janela de graça; auto-reconnect com backoff nos dois clients.
- Testes: unitários de regras UNO + integração multiplayer (join/owner-transfer/reconexão, 8 jogadores, partida sustentada, mensagem duplicada). Raiz `npm test` verde.

## O que falta para o prompt mestre

### 1) §52 — núcleo agnóstico de jogo — ✅ RESOLVIDO (Fase A)
"Adicionar um jogo novo não deve exigir modificar o núcleo." Feito: `GamePlugin`/`GameInstance` opaco (`server/src/core/game-plugin.ts`), registry `GAMES`, `Room` sem import de UNO, `ws-server` só roteia `GAME_ACTION`, `messages.ts` com payloads `{ gameId, state|event: unknown }`, `UnoGameEvent` em `shared/src/games/uno/events.ts`, `common.ts` só genérico (`Direction`/`UnoPhase` em `models/uno.ts`). Único nome UNO que sobra no `shared`: `models/uno.ts` + `games/uno/events.ts` (ambos escopados) e `unoPlugin.meta.name` (§47, Fase C). Prova: um plugin stub entra tocando só `server/src/games/<id>/` + 1 linha em cada registry.

### 2) Frontend sem shell multi-jogo + seleção de jogo
**Resolvido em A3/A4 (shells) + Fase B (seleção):** os dois `App.tsx` são dispatchers finos; o host tem o fluxo de 3 telas `attract → catalog → lobby` (`AttractScreen`/`CatalogScreen`/`LobbyScreen`), arte de capa por jogo (`HOST_GAMES[id].Cover`, SVG inline), navegação teclado + clique; QR só no lobby; fim de jogo (`END_GAME`) → volta pro lobby do mesmo jogo; mobile volta pro waiting (`GAME_ENDED`, sessão mantida). **Fase C (em andamento):** `@party/ui` com tokens unificados (C1 ✅) + componentes `BrandMark`/`Button`/`Panel`/`Overlay`/`Timer`/`QrPanel`/`PlayerRoster`, retrofit dos dois apps, ~116 linhas de CSS duplicado removidas (C2 ✅). sons sintetizados no host (`ui/src/sound.ts` + `sound-map.ts`, C3 ✅); `cardArt.ts` consolidado em `@party/ui/uno-cards` (C4 ✅). **Fase C completa.**

### 3) Fase 11 — identidade visual completa + sons (§47) — dobrada na Fase C
`@party/ui` criado (tokens + componentes, C1–C2); sons sintetizados via Web Audio no host, sem assets (C3). **Decisão do usuário:** manter o nome "UNO" por ora — `BrandMark.text` é o ponto único de rename; "Box Fiesta" já é a marca da plataforma. `cardArt.ts` consolidado (C4). Fase C fechada.

### 4) Menores
- Fluxo "jogar a carta que acabou de comprar" existe no engine (`playDrawnCardId`) mas não está exposto na UI do mobile.
- Seletor de interface de IP quando há múltiplas (§39) — hoje auto-escolhe IPv4 privado; há override por env.
- `shuffle` agora usa `GameContext.random` injetado (corrigido na Fase A/A2) — testes podem passar um RNG determinístico; `nanoid` de ids ainda não é injetado (baixa prioridade).
- `multiplayer.integration.test.ts` fixa `108` cartas (invariante legítimo do UNO).

## Não fazer agora (§54)
Múltiplas salas, espectadores, contas, banco, cloud — fora de escopo do MVP.
**+ Bots / adversários de IA / jogadores virtuais — DESCOPADOS** (decisão do usuário, 2026-09-07). Não é "adiado": nenhum jogo terá bot. Testar sozinho = várias abas. (A expansão **Reformation** do Coup continua *adiada*, não descopada.)

## Pendências conhecidas (não são gaps do MVP)
- **§47 — nome próprio / identidade visual.** "UNO"/"Coup" são literais; `BrandMark.text` é o ponto único de rename; "Box Fiesta" é a marca da plataforma. **Jogo #3 já batizado: "Zap!"** (`gameId: "zap"`) — só falta cravar o nome de "UNO"/"Coup" nos respectivos `BrandMark`.
- Coup **D6**: `sound-map.ts` + animação de flip na revelação.
- "Jogar a carta recém-comprada" (`playDrawnCardId`) não exposto na UI mobile.
- Seletor de interface de IP com múltiplas NICs (§39) — hoje auto-escolhe.

## UX polish (2026-09-08, branch `feature/quiplaxi`)
- **Reeditar avatar no lobby** — `UPDATE_AVATAR { avatar }` (msg de plataforma, como `SEND_REACTION`); `Room.setAvatar` só em `accepting_players`. `WaitingScreen` ganhou "✏️ Editar avatar" → `<AvatarEditor>` inline. Server 77 → 79 testes.
- **Popup de cor do UNO cancelável** — coringa agora escolhe a cor ANTES de jogar: "Jogar" abre um popup local com ✕ (cancelar mantém a carta selecionada, nada é enviado); a cor manda `play_card { cardId, chosenColor }` de uma vez. Sem mudança no engine — o modal `awaiting_color_choice` do servidor vira rede de segurança (timeout/reconexão).

## Jogo #3 — Zap! (estilo Quiplash) — EM ANDAMENTO (branch `feature/quiplaxi`)
Loop: `prompt → cada jogador escreve respostas no celular → TV mostra duelos 2-a-2 → sala vota duelo a duelo → placar → 3 rodadas (a 3ª = "Última Chance", 3× pontos) → final`. Mecânica: Quiplash real (duelos), **mín. 3 jogadores**, pareamento em círculo (`prompt_i → jogador_i + jogador_{i+1}`), 100/voto + bônus "ZAP!" (varre 100% dos votos). Referência de mecânica: `Jogos/rumpus/games/quiplash.js` (AGPL — reimplementar, não copiar). Depois: #4 Fibbage-like, #5 Trivia.
- ✅ **Z1** — contrato `shared` types-only: `shared/src/models/zap.ts` + `shared/src/games/zap/events.ts` (`ZapPublicState`/`ZapPrivateState`/`ZapPhase`/`ZapDuel`/`ZapAction`/`ZapGameEvent`). Autores das respostas ocultos no estado público durante `voting`; eventos sem texto de resposta/voto.
- ✅ **Z2** — `server/src/games/zap/` (`constants`, `prompts` 54 PT-BR, `pairing` puro, `zap-game` `implements PausableGame, TurnTimedGame`, `action-schema` zod, `plugin`) + 1 linha em `GAMES`. **Auto-avança** por um único deadline tickado pelo servidor (`answering`→`voting` duelo a duelo→`roundResults`→próxima rodada/`gameover`); brancos preenchidos, duelos 100% em branco descartados; 100/voto, ×3 na final, +50 bônus de varredura. `zap-game.test.ts` (16) + caminho no integration. **Testes de servidor 60 → 77.** §52 preservado (nada em `core/`, `ws-server`, shells, `shared/protocol`).
- ✅ **Z3** — `host/src/games/zap/` (`ZapHostView` orientado por `pub.phase` — `answering`/`voting` (`DuelBoard`)/`roundResults`/`gameover`; painel lateral = placar ao vivo + feed `describeEvent` + pausar/encerrar; `ZapCover` SVG inline; `zap-host.css` todo escopado em `.zap-host`) + 2 imports +1 entrada em `HOST_GAMES`. Smoke ao vivo: catálogo → Iniciar → `answering` renderiza com estado real, loop auto-avança rodadas 1→2→3 (Última Chance), 0 erros de console.
- ✅ **Z4** — `@party/ui` `TextAnswerInput` (prompt + textarea + contador + enviar; "✓ enviado"/"Atualizar"; **reutilizável pelo Fibbage #4**) + `mobile/src/games/zap/` (`ZapControllerView` orientado por `pub.phase`/`priv.pendingDecision` — `answering` = 1 `TextAnswerInput` por assignment; `voting` = cédula toca-pra-votar que trava; `roundResults`/`gameover` resumos; placar + reações + `HowToPlay`) + 1 linha em `CONTROLLER_GAMES`. **Smoke completo ao vivo**: partida de 3 rodadas com TV + 3 celulares — gate de 3 jogadores, prompts por celular, auto-avanço, cédulas por duelo, `DuelBoard` com reveal + anel do vencedor + ⚡ZAP +50, rodada 3 Última Chance duelo de N respostas ×3, overlay de `gameover` + rank por celular. 0 erros de console nos controllers.
- ✅ **Z5** — `host/src/games/zap/sound-map.ts` (`soundForEvent`, espelha uno) + toggle "🔊 Som" no `ZapHostView` (1º jogo não-UNO com som); animações `prefers-reduced-motion`-guarded (host: `zap-winner-pop` na resposta vencedora + `zap-foot-in` no reveal; controller: cheer `⚡ +N ⚡` no roundResults + `zap-chosen-pop` no voto). Smoke: partida completa até gameover, som + pop renderizam, 0 erros.

**Zap! (jogo #3) COMPLETO** (Z1–Z5). §52 preservado o tempo todo: o jogo inteiro = `shared/{models,games}/zap`, `server/src/games/zap/`, `host/src/games/zap/`, `mobile/src/games/zap/`, 1 componente `@party/ui` (`TextAnswerInput`), +1 linha em cada um dos 3 registries.

## Jogo #4 — Lorota! (estilo Fibbage) — COMPLETO (branch `feature/fibbage`)
`gameId: "lorota"`, §47 nome próprio **"Lorota!"** (gíria PT-BR de mentira/peta). Loop: `fato com lacuna → cada um inventa uma mentira → servidor embaralha mentiras + verdade → todos caçam a verdade`. +1000 achar a verdade, +500 por jogador enganado, rodada 3 = "Lorota Final" ×2, 3 rodadas, mín. 3 jogadores. Referência: `Jogos/rumpus/games/fibbage.js` (AGPL — reimplementado).
- `shared/src/models/lorota.ts` + `shared/src/games/lorota/events.ts` (types-only); autoria/palpites ocultos até `reveal`, eventos sem texto.
- `server/src/games/lorota/` (`constants`, `questions` 45 PT-BR originais, `lorota-game` `implements PausableGame, TurnTimedGame`, `action-schema` zod, `plugin`) + 1 linha em `GAMES`. `normalize` ignora caixa/espaço/pontuação/**acento**: mentira == verdade é devolvida sem toast (flag `lieWasTheTruth`), mentiras idênticas colapsam creditando todos os autores.
- `host/src/games/lorota/` (`LorotaHostView` orientado por fase, `LorotaCover` SVG, `describeEvent`, `sound-map`, css escopado `.lorota-host`) +2 imports +1 entrada em `HOST_GAMES`.
- `mobile/src/games/lorota/` (`LorotaControllerView` reusando `@party/ui TextAnswerInput`, `HowToPlay`, css) +1 linha em `CONTROLLER_GAMES`.
- `lorota-game.test.ts` (14) + caminho no integration. **Testes de servidor 79 → 94.** §52 preservado. Smoke completo ao vivo (3 rodadas, host + 4 controllers, colapso de mentiras idênticas, placar, Lorota Final ×2, 0 erros).

## Jogo #5 — Sabe-Tudo (trivia de múltipla escolha) — COMPLETO (branch `feature/sabetudo`)
`gameId: "sabetudo"`, §47 nome próprio **"Sabe-Tudo"**. Loop: `pergunta com 4 alternativas na TV → cada jogador toca uma no celular → acerto vale base + bônus de velocidade + bônus de sequência → reveal → 8 perguntas → ranking`. mín. 2 jogadores.
- `shared/src/models/sabetudo.ts` + `shared/src/games/sabetudo/events.ts` (types-only); `correctIndex`/`optionResults` ocultos até `reveal`, eventos sem a alternativa escolhida.
- `server/src/games/sabetudo/` (`constants`, `questions` 59 PT-BR originais incl. um **PACK PICANTE (+18)**, `sabetudo-game` `implements PausableGame, TurnTimedGame` self-advancing `question`→`reveal`, alternativas embaralhadas por pergunta, `action-schema` zod, `plugin`) + 1 linha em `GAMES`. Pontuação: 500 base + até 500 de velocidade (decai linear) + sequência (+100/acerto seguido, teto 5).
- `host/src/games/sabetudo/` (`SabeTudoHostView` orientado por fase, `SabeTudoCover` SVG, `describeEvent`, `sound-map`, css escopado `.sabetudo-host`) +2 imports +1 entrada em `HOST_GAMES`.
- `mobile/src/games/sabetudo/` (`SabeTudoControllerView` grade A/B/C/D toca-pra-responder que trava, `HowToPlay`, css) +1 linha em `CONTROLLER_GAMES`.
- `sabetudo-game.test.ts` (11) + caminho no integration. **Testes de servidor 94 → 106.** §52 preservado. Smoke completo ao vivo (host + 2 controllers: question/reveal/pause/resume, bônus de velocidade + sequência 🔥2, pack picante em rotação, END_GAME → lobby, 0 erros de console).

## Jogo #6 — FDP — Foi De Propósito (estilo Cards Against Humanity, +18) — COMPLETO (branch `feature/fdp`)
`gameId: "fdp"`, §47 nome próprio **"FDP — Foi De Propósito"** (BrandMark in-game = "FDP"). Loop: `frase com lacuna na TV → cada jogador escreve UMA resposta → TV mostra tudo embaralhado e anônimo → todos votam na melhor (menos a própria) → +100/voto + 150 de bônus se varrer → 5 rodadas, a última "Final FDP" ×2`. mín. 3.
- É o jogo que o usuário pediu pra ser +18 de verdade — humor negro, sexo, escatologia, mórbido. Guardrails: sem grupo protegido como punchline, sem pessoa real privada, nada sexual com menor.
- `shared/src/models/fdp.ts` + `shared/src/games/fdp/events.ts` (types-only); autoria/votos ocultos até `roundResults`.
- `server/src/games/fdp/` (`constants`, `prompts` 58 PT-BR +18 originais, `fdp-game` `implements PausableGame, TurnTimedGame` self-advancing `writing`→`voting`→`roundResults`, respostas anonimizadas, pula o voto se ninguém escreveu, bônus de varredura, vencedor null em empate, `action-schema` zod, `plugin`) + 1 linha em `GAMES`.
- `host/src/games/fdp/` (`FdpHostView` por fase, `FdpCover` SVG, `describeEvent`, `sound-map`, css `.fdp-host`) +2 imports +1 entrada em `HOST_GAMES`.
- `mobile/src/games/fdp/` (`FdpControllerView` reusa `@party/ui TextAnswerInput`, `HowToPlay`, css) +1 linha em `CONTROLLER_GAMES`.
- `fdp-game.test.ts` (13) + integration. **Testes de servidor 106 → 120.** §52 preservado. Smoke ao vivo completo (host + 3 controllers: writing/voting/results, anonimato, +100/voto + varredura Bia +350, 👑 vencedor da rodada, placar carrega, END_GAME → lobby, 0 erros).

## Toggle "Leve / Pesado" (intensidade de conteúdo) — COMPLETO (branch `feature/modo-pesado`)
Setting de sala que o host vira no lobby, pros jogos de texto (Zap!/Lorota!/Sabe-Tudo/FDP). Feature de plataforma (como reactions/avatars).
- `shared/src/games/content-tier.ts` (`ContentTier`, default `pesado`) + `SET_CONTENT_TIER` msg + `contentTier` no `GAME_CATALOG` + zod.
- `Room.contentTier` + `setContentTier` (lobby-only) → `GameContext.contentTier?` → cada engine escolhe qual array embaralhar (`<jogo>Prompts(tier)` / `<jogo>Questions(tier)`).
- `ws-server` handler owner-gated. Host `LobbyScreen` toggle (😇 Leve / 🔞 Pesado) + hint; mobile `WaitingScreen` tag "Modo leve/pesado".
- Bancos divididos leve/pesado + **packs pesados bem maiores** (Zap +34, Lorota +16, Sabe-Tudo +11, FDP reestruturado 38 leve / 62 pesado com ~40 novos). Guardrails escritos no header de cada arquivo de conteúdo: sem grupo protegido como punchline, sem pessoa real privada, sem menor, sem sexo gráfico de pessoa real com nome, sem tragédia real específica com vítimas reais, sem difamar negócio real com nome.
- `content-tier.test.ts` (5) + `room.test.ts` +1 + integration +1. **Testes de servidor 120 → 127.** Smoke ao vivo: FDP em Leve só serviu prompts leves; toggle roundtrip + persiste na troca de jogo; 0 erros de console.
- §52: nenhuma *regra* de jogo mudou; toca protocol/ws-server/Room/GameContext/shells como qualquer feature de plataforma.

## Jogo #7 — É Você! (inspirado no *That's You!* da PlayStation) — COMPLETO (branch `feature/e-voce`)
`gameId: "evoce"`, §47 nome próprio **"É Você!"**. Jogo de "o quanto vocês se conhecem". 6 rodadas fixas: `enquete → legenda → rabisco → enquete → legenda → final` (a última "A Obra-Prima" vale ×2). Sem câmera — rosto = avatar pixel, desenho = **lista de traços** num quadrado 0–1000 (não bitmap).
- Mecânicas novas de plataforma: **votar num jogador** (enquete, pontos por consenso: 250 por outro que votou igual) + **Curinga** (2 por jogador, dobra os pontos da enquete se seu voto bateu com o da galera) + **desenho**.
- `shared/src/models/evoce.ts` + `games/evoce/events.ts` (types-only).
- `server/src/games/evoce/` (`constants`, `prompts` 4 bancos PT-BR split leve/pesado, `evoce-game` `implements PausableGame, TurnTimedGame` self-advancing, `action-schema` zod com schema de traço limitado, `plugin`) + 1 linha em `GAMES`.
- `@party/ui` **`DrawingCanvas`** (paint → lista de traços) + **`DrawingView`** (SVG read-only) — reutilizáveis.
- `host/src/games/evoce/` (`EvoceHostView` por fase×tipo, `EvoceCover` SVG, `describeEvent`, `sound-map`, css `.evoce-host`) +2 imports +1 entrada em `HOST_GAMES`. `mobile/src/games/evoce/` +1 linha em `CONTROLLER_GAMES`. `evoce` nos dois tiered-games sets.
- `evoce-game.test.ts` (11) + integration + content-tier. **Testes de servidor 127 → 140.** §52 preservado. Smoke ao vivo completo (6 rodadas, host + 3 controllers, DrawingCanvas→DrawingView, Curinga, final ×2, gameover, 0 erros).

**7 jogos no catálogo: UNO, Coup, Zap!, Lorota!, Sabe-Tudo, FDP, É Você!**
Plano: `C:\Users\gabri\.claude\plans\quiplax-e-proximos-jogos.md`.
