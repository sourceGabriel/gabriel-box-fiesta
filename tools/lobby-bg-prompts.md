# Lobby background prompts

The 8 per-game lobby renders (`gabriel-source/backgrounds/*.png` → baked by
`tools/build-screen-bg.py lobby-<id>` → `host/src/games/<id>/lobby-bg.webp`) were
all generated from **one prompt** so they share the exact panel geometry the
shell measures against (`.lobby-slot-*` in `host/src/shell/shell.css`).

Regenerate one by pasting the master prompt below into an image model (ChatGPT /
gpt-image-1), filling the `{{ }}` fields from the table, and **attaching
`gabriel-source/mock-poster-wide.png` + an existing `backgrounds/*.png` as style
references**. Ask for 16:9 (1672×941 is ideal — no crop). Painted text can come
out slightly garbled; iterate or accept.

Live zones the shell draws over — the art must leave these dark/clean (measured
% of the 1672×941 stage):

| element        | left  | top   | w     | h     |
|----------------|-------|-------|-------|-------|
| QR             | 14.4% | 36.8% | 11.5% | 20.6% |
| room code box  | 12%   | 58.5% | 16%   | 9%    |
| player grid    | 30%   | 28.5% | 41%   | 42%   |
| start button   | 37.5% | 74%   | 25%   | 13%   |

Painted by the art only: the `BOX FIESTA` + game wordmark (top centre), the
`ENTRE PELO SEU CELULAR` panel frame + a blank white QR square, the empty centre
panel frame, the `COMO JOGAR?` panel with 3 numbered steps (right), a `COMEÇAR X`
pill (centre, under the panel) and a 3-stat strip (bottom centre).

---

## Master prompt

```
Ilustração digital pintada, proporção 16:9, para a tela de "sala de espera" de um
jogo de festa local chamado Box Fiesta. Mesmo universo visual das imagens de
referência anexadas: um loft/galpão à noite, janelas do piso ao teto com skyline
roxa-e-rosa ao fundo, pisca-pisca, placas de neon, plantas penduradas, TV de tubo,
caixas de pizza, um gato preto, bagunça aconchegante; luz teal e magenta, leve
granulado, traço de pôster/HQ. Cor de destaque deste jogo: {{COR}} — use nos
brilhos de neon, nas molduras dos painéis e no botão.

COMPOSIÇÃO — mantenha EXATAMENTE estas áreas como descrito; a interface do app é
desenhada por cima da arte:

• Topo central (0%–25% da altura): letreiro "BOX FIESTA" pequeno em cima e o nome
  "{{JOGO}}" grande e estiloso logo abaixo, com a tagline curta. Estilo pincel/grafite.

• Coluna esquerda, centro vertical (largura 7%–26%, altura 30%–74%): painel vertical
  estreito com moldura brilhante em {{COR}}, título "ENTRE PELO SEU CELULAR", e DENTRO
  um quadrado claro liso e vazio no lugar de um QR code (NÃO desenhe um QR de verdade).
  Abaixo, espaço escuro vazio para um código de sala.

• Centro (largura 29%–71%, altura 26%–72%): um painel largo grande, moldura brilhante
  em {{COR}}, INTERIOR TOTALMENTE VAZIO e escuro (vidro fosco). Sem texto, sem
  conteúdo — é onde os cartões dos jogadores vão aparecer.

• Logo abaixo do painel central (largura 37%–63%, altura 78%–89%): um botão pintado
  em forma de pílula, cor sólida {{COR}}, escrito "{{BOTAO}}" com um ícone de play e
  traços de impacto ao redor.

• Rodapé central (largura 34%–66%, altura 90%–97%): uma tira fina com três estatísticas
  e ícones minúsculos: "{{STATS}}".

• Coluna direita, centro vertical (largura 73%–95%, altura 26%–72%): painel intitulado
  "COMO JOGAR?" com 3 passos numerados (círculos 1, 2, 3 em {{COR}}):
    1. {{PASSO_1}}
    2. {{PASSO_2}}
    3. {{PASSO_3}}
  Pode ter um adesivo/post-it decorativo pendurado.

NÃO FAZER: rostos de pessoas reais; logos de marcas reais; QR code real; qualquer
conteúdo dentro dos painéis esquerdo e central (só a moldura vazia); marca d'água;
barra de status de celular; moldura de UI. Deixe os elementos importantes dentro de
uma área central 16:9 com margem de ~8% para permitir recorte.
```

---

## Per-game fields

| Jogo (`id`) | `{{COR}}` | `{{JOGO}}` | `{{PASSO_1}}` / `{{PASSO_2}}` / `{{PASSO_3}}` | `{{STATS}}` | `{{BOTAO}}` |
|---|---|---|---|---|---|
| `uno` | `#ef4444` | UNO | Combine cor ou número / Solte cartas de ação / Grite "UNO!" na penúltima carta | 2–8 jogadores · ~15 min · Caos médio | COMEÇAR UNO |
| `coup` | `#e0b13c` | COUP | Você tem 2 personagens secretos / Declare ações e blefe / Desafie quem mente — sobra 1 | 2–6 jogadores · ~15 min · Frieza total | COMEÇAR COUP |
| `zap` | `#ff3caf` | ZAP! | O celular te dá os prompts / Responda com a piada mais afiada / A sala vota cada duelo | 3–8 jogadores · ~10 min · Zoeira alta | COMEÇAR ZAP! |
| `lorota` | `#2ee6a6` | LOROTA! | Leia o fato com a lacuna / Invente uma mentira convincente / Ache a verdade no meio | 3–8 jogadores · ~10 min · Caos alto | COMEÇAR A MENTIRA |
| `sabetudo` | `#a78bfa` | SABE-TUDO | Pergunta de 4 alternativas na TV / Responda no celular / Rapidez e sequência dão bônus | 2–8 jogadores · ~15 min · Climão saudável | COMEÇAR SABE-TUDO |
| `fdp` | `#fb7185` | FDP — FOI DE PROPÓSITO | Leia a frase incompleta / Complete com a resposta mais podre / Voto anônimo elege a pior | 3–8 jogadores · ~20 min · Sem limite (+18) | COMEÇAR FDP |
| `evoce` | `#c4b5fd` | É VOCÊ! | Perguntas sobre a galera / Vote, legende e desenhe / 6 rodadas, placar no fim | 3–8 jogadores · ~20 min · Caos afetivo | COMEÇAR É VOCÊ! |
| `dilema` | `#f97316` | DILEMA NOS TRILHOS | Um Maquinista é sorteado / Encha seu trilho de inocentes, o do rival de culpados / A alavanca decide — trilho poupado pontua | 3–10 jogadores · ~15 min · Consciência pesada | COMEÇAR DILEMA |

Source-file names (`gabriel-source/backgrounds/`): `uno.png`, `coup.png`,
`zap.png`, `lorota.png`, `sabe-tudo.png`, `fdp.png`, `ehvoce.png`, `dilema.png`.

### Known imperfections in the current set
- `dilema.png` wordmark reads "TRIILHOS" (double i).
- `fdp.png` came out nearly the same pink as `zap.png` (`#fb7185` renders hot).
- Accents match `host/src/games/<id>/personality.ts`.
