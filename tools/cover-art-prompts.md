# Catalog cover prompts

The catalog coverflow (`host/src/shell/CatalogScreen.tsx`) shows one 3:2 cover per
game — big + centred for the focused game, small + tilted for its neighbours.
Today each is an inline SVG (`host/src/games/<id>/<Id>Cover.tsx`); these prompts
generate raster replacements to bake to `host/src/games/<id>/cover.webp`.

Generate all 8 in one session for a consistent set. **Attach a lobby render
(`host/src/games/<id>/lobby-bg.webp` source) or `gabriel-source/mock-poster-wide.png`
as a style reference.** Ask for **3:2 landscape**, ~1200×800 (baked down to webp).

The UI overlays a small "vibe" chip in the **top-left** and an optional sticker
in the **top-right** — keep those two corners free of critical detail. The card
has its own rounded frame + accent glow, so no border needed in the art.

---

## Master prompt

```
Arte de capa (key art) para um jogo de festa da coleção "Box Fiesta", num
coverflow tipo Netflix. Proporção 3:2 landscape. Mesmo universo das imagens de
referência anexadas: ilustração pintada, noite, luz de neon teal e magenta, leve
granulado, traço de pôster/HQ, clima de loft bagunçado — mas aqui COMPACTO e
PUNCHY, legível a 300px de largura.

• UM motivo dominante, centralizado, ocupando o miolo: {{MOTIVO}}.
• O nome "{{JOGO}}" grande e estiloso (pincel/grafite), integrado à arte —
  base ou terço inferior.
• Cor de destaque: {{COR}} — domina os brilhos de neon, o contorno do motivo e
  o lettering. Fundo escuro, alto contraste.
• Cantos superior-esquerdo e superior-direito relativamente limpos (a UI põe um
  selo em cada). Sem moldura/borda (o app já desenha).
• Vinheta suave nas bordas pra o conjunto de 8 parecer uma coleção.

NÃO FAZER: logo de marca real (ex.: o logotipo real do UNO); rostos de pessoas
reais; texto além do nome do jogo; marca d'água; barra de UI.
```

---

## Per-game fields

| Jogo (`id`) | `{{COR}}` | `{{JOGO}}` | `{{MOTIVO}}` |
|---|---|---|---|
| `uno` | `#ef4444` | UNO | um leque de cartas coloridas explodindo do centro, uma carta "+4" em destaque na frente |
| `coup` | `#e0b13c` | COUP | duas cartas de personagem viradas para baixo cruzadas, uma adaga e moedas de ouro caindo, uma máscara de teatro atrás |
| `zap` | `#ff3caf` | ZAP! | um balão de fala gigante de quadrinho com um raio elétrico dentro, faíscas ao redor |
| `lorota` | `#2ee6a6` | LOROTA! | um rosto sorrindo de canto com um nariz de Pinóquio comprido saindo, pontos de interrogação flutuando |
| `sabetudo` | `#a78bfa` | SABE-TUDO | um cérebro estilizado feito de tubos de neon com um ponto de interrogação aceso no meio, quatro pastilhas "A B C D" orbitando |
| `fdp` | `#fb7185` | FDP | uma carta de papel com uma tarja preta de censura no meio, respingos de tinta, um "18" pequeno de neon num canto interno |
| `evoce` | `#c4b5fd` | É VOCÊ! | uma mão apontando o dedo para frente, três polaroids de rostos genéricos (silhuetas) presas atrás com fita |
| `dilema` | `#f97316` | DILEMA NOS TRILHOS | um bonde/trólebus visto de frente descendo um trilho que se bifurca em Y, uma alavanca grande em primeiro plano |

Baked output: `host/src/games/<id>/cover.webp` via a `cover-<id>` key in
`tools/build-screen-bg.py` (to be added when the renders land).
