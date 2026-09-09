<!--
  ┌─────────────────────────────────────────────────────────────────────┐
  │  Personalize à vontade (o "fru-fru"):                                │
  │  • Badges → troque texto/cor nos links img.shields.io abaixo.        │
  │  • Cor de destaque do projeto: #f97316 (laranja). Busque e troque.   │
  │  • Emojis de cada jogo ficam na tabela "O catálogo".                 │
  │  • Um print/GIF da TV + celular cai muito bem em "Como funciona".    │
  └─────────────────────────────────────────────────────────────────────┘
-->

<div align="center">

# 🎉 Box Fiesta

### Plataforma de _party games_ para jogar na sala — TV + celulares, tudo na rede local

<br>

![status](https://img.shields.io/badge/status-MVP%20jog%C3%A1vel-success)
![jogos](https://img.shields.io/badge/jogos-8-blueviolet)
![testes](https://img.shields.io/badge/testes-167%20passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Node](https://img.shields.io/badge/Node-%E2%89%A5%2020-5FA04E?logo=nodedotjs&logoColor=white)
![license](https://img.shields.io/badge/licen%C3%A7a-ISC-yellow)
![PRs](https://img.shields.io/badge/PRs-bem--vindos-ff69b4)

<br>

**Uma TV compartilhada** mostra o jogo · **cada pessoa usa o próprio celular** como controle · **um servidor autoritativo** manda em tudo.
Sem internet, sem contas, sem banco de dados — sobe, lê o QR code, joga.

</div>

---

## ✨ Destaques

- **8 jogos** num catálogo só, do baralho clássico ao debate filosófico com bonde desgovernado.
- **Zero configuração de rede** — o servidor imprime uma URL da LAN; o celular abre por QR code.
- **Servidor autoritativo de verdade** — toda regra, turno, timer e validação vivem no servidor; os clientes só desenham.
- **Núcleo agnóstico de jogo** — adicionar um jogo novo é ~6 arquivos numa pasta e **1 linha em cada registry**. O núcleo nunca muda.
- **Reconexão sem dor** — derrubou o celular? Recarrega a aba e volta pro mesmo lugar. Dono caiu? A sala transfere sozinha.
- **Modo Leve / Pesado** — um botão no lobby troca a intensidade do conteúdo dos jogos de texto.
- **TypeScript estrito** ponta a ponta, monorepo com _workspaces_, **167 testes** de servidor.

---

## 🕹️ O catálogo

| # | Jogo | Vibe | Como é |
|---|------|------|--------|
| 1 | **Cartas** 🎨 | `RAIVA` | Combine cor ou número, solte cartas de ação e grite na penúltima carta. |
| 2 | **Blefe** 🎭 | `TRAIÇÃO` | Cada um tem 2 personagens secretos. Declare ações, minta e desafie até sobrar só você com influência. |
| 3 | **Zap!** ⚡ | `EGO` | O celular te dá _prompts_; responda com a piada mais afiada. A sala vota o vencedor de cada duelo. |
| 4 | **Lorota!** 🤥 | `MENTIRA` | Um fato com uma lacuna. Cada um inventa uma resposta falsa e depois caça a verdadeira no meio das mentiras. |
| 5 | **Sabe-Tudo** 🧠 | `SOBERBA` | Pergunta com 4 alternativas na TV, resposta no celular. Acerto + velocidade + sequência valem pontos. |
| 6 | **FDP** 🔞 | `SAFADEZA` | Complete a frase com a resposta mais podre que conseguir. Voto anônimo elege a melhor. _(+18)_ |
| 7 | **É Você!** 🫂 | `AMIZADE` | Perguntas sobre a própria galera: vote em quem combina, escreva legendas e desenhe. 6 rodadas. |
| 8 | **Dilema nos Trilhos** 🚋 | `DILEMA` | Cada time enche o próprio trilho de inocentes e o do inimigo de culpados. O Maquinista puxa a alavanca — o trilho poupado marca ponto. |

> Jogos de texto trazem bancos de _prompts_ originais em PT-BR, divididos em **leve** e **pesado**.

---

## 🚀 Começando

**Pré-requisitos:** Node.js ≥ 20 e npm.

```bash
git clone <url-do-repo> box-fiesta
cd box-fiesta
npm install
npm run dev
```

`npm run dev` sobe os três processos:

```bash
npm run -w server dev
```
```bash
npm run -w host dev
```
```bash
npm run -w mobile dev
```
| Processo | Porta | O quê |
|---|---|---|
| **server** | `3001` | servidor autoritativo (WebSocket + estado em memória) |
| **host** | `5173` | a tela da TV — abra num navegador ligado na TV/projetor |
| **mobile** | `5174` | o controle — cada jogador abre no próprio celular |

No terminal o servidor imprime algo como `http://192.168.0.10:5174/join/ABCD`.
Abra a **host** na TV, aponte a câmera do celular pro **QR code** que aparece, e pronto.

> Todos os aparelhos precisam estar na **mesma rede Wi-Fi**. Nada sai pra internet.

---

## 🧩 Como funciona

```text
        ┌──────────────────────────┐
        │        HOST (TV)         │   render público + animações
        │     React · :5173        │   dirigidas por eventos
        └────────────┬─────────────┘
                     │  WebSocket
        ┌────────────┴─────────────┐
        │   SERVER · Node · :3001  │   ── fonte única da verdade ──
        │                          │
        │  Gateway WS  →  Sala      │   sessões · dono · reconexão
        │       │         (Room)    │   · ciclo de vida
        │       ▼                   │
        │  Motor do jogo (plugin)   │   regras · turnos · timer
        │  uno · coup · zap · …     │   · validação · eventos
        └────────────┬─────────────┘
                     │  WebSocket
        ┌────────────┴─────────────┐
        │     MOBILE (celular)     │   render privado (sua mão)
        │     React · :5174        │   + envio de ações
        └──────────────────────────┘
```

- **O servidor decide tudo.** Host e mobile nunca aplicam regra — só mandam ações e desenham o estado que volta.
- **`shared/`** é o único contrato entre as pontas, e é **só tipos** (sem runtime).
- **`@party/ui`** é o _design system_ compartilhado: _tokens_, componentes, sons (pacotes de áudio CC0) — consumido como código-fonte pelos dois apps.
- Estado **em memória**, uma sala por servidor. Sem DB, sem Redis, sem nuvem.

<details>
<summary><b>Estrutura do repositório</b></summary>

```text
box-fiesta/
├── server/    Node + ws + zod — gateway, Sala, sessões, motores de jogo, testes
│   └── src/games/<id>/     um motor de jogo por pasta (TS puro)
├── shared/    tipos do protocolo e dos modelos de jogo (sem runtime)
├── ui/        @party/ui — tokens, componentes, sons, arte de cartas
├── host/      app da TV (React + Vite) — shell + host/src/games/<id>/
├── mobile/    app do celular (React + Vite) — shell + mobile/src/games/<id>/
└── docs/      CHANGELOG e revisão de lacunas
```
</details>

---

## ➕ Adicionar um jogo

O núcleo é **agnóstico de jogo**. Um jogo novo é uma pasta em cada camada e **uma linha em cada _registry_** — nada em `core/`, no gateway ou nos _shells_:

```text
shared/src/models/<id>.ts          tipos do estado público/privado
shared/src/games/<id>/events.ts    tipos dos eventos de domínio
server/src/games/<id>/             motor (implementa GamePlugin) + zod + banco de conteúdo
  └── + 1 linha em server/src/games/registry.ts
host/src/games/<id>/               View + Cover + personality + sons
  └── + 1 linha em host/src/games/registry.ts
mobile/src/games/<id>/             ControllerView + "Como jogar"
  └── + 1 linha em mobile/src/games/registry.ts
```

O motor recebe um relógio e um RNG injetados (partidas reproduzíveis), roda um timer que o servidor "tica", e projeta um estado público + um estado privado por jogador. O resto da plataforma trata tudo como opaco.

---

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | **TypeScript** (estrito, ponta a ponta) |
| Servidor | **Node** · `ws` (WebSocket cru) · `zod` (validação de borda) |
| Front | **React 19** · **Vite** · um _shell_ por papel + jogos como módulos |
| Design system | `@party/ui` — _tokens_ CSS + componentes + Web Audio |
| Testes | **Vitest** — motores, Sala e integração multiplayer |
| Monorepo | npm _workspaces_ (`server` · `shared` · `ui` · `host` · `mobile`) |

---

## ✅ Qualidade

```bash
npm run -w server test     # 167 testes (motores + Sala + integração)
npm run -w server lint     # tsc --noEmit
npm run -w host lint       # oxlint
npm run -w mobile lint     # oxlint
npm run build              # os 5 workspaces
```

Cada _pull request_ mantém o app rodável, os testes e o _build_ verdes, e os documentos de acompanhamento (`docs/CHANGELOG.md`, `docs/repository-gap-review.md`) atualizados no mesmo lote.

---

## 🎨 Assets

Arte e som usam pacotes de domínio público / licença permissiva (CC0 / CC-BY / OGA-BY), empacotados no repositório com um `CREDITS.md` por pacote. Nada é baixado em tempo de execução. Coberturas inline em SVG e sons sintetizados via Web Audio são o _fallback_ padrão.

---

## 📄 Licença

ISC — veja [`LICENSE`](LICENSE).
