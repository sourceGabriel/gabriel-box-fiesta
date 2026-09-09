# Mobile art prompt

The phone controller is portrait, with text fields and buttons. So the background
is **illustrated in the top third, fading to near-solid dark** for the panels
below. One image, shared by the join + waiting screens (per-game accent is CSS).

Source: `gabriel-source/mobile-bg.png` → `tools/build-screen-bg.py mobile-bg`
→ `mobile/src/shell/mobile-bg.webp` (capped 720 px wide). Wired in
`mobile/src/index.css` (`body` background) with frosted `.join-panel` /
`.waiting-panel` / `.players-panel` so the art reads softly behind them.

Attach a lobby render or `mock-poster-wide.png` as a style reference. Ask for
portrait 1080×2160 (1:2).

```
Ilustração de fundo para a tela de um controle de celular do app de festa "Box Fiesta".
Formato retrato alto, 1080×2160. Mesmo universo das referências anexadas: loft à noite,
neon teal e magenta, pisca-pisca, traço de pôster/HQ, leve granulado.

• TERÇO SUPERIOR (0–35% da altura): a única parte ilustrada. Uma mão segurando um
  celular que brilha como um controle, a TV de tubo acesa desfocada ao fundo, plantas
  e luzes de neon nas bordas. O letreiro "BOX FIESTA" pincelado no topo, pequeno.
• A imagem faz um DEGRADÊ pra um preto-azulado quase sólido (#0b0f17) por volta de
  40% da altura.
• 40–100% DA ALTURA: praticamente chapado nesse preto, com um leve grão/textura e um
  brilho de neon magenta bem sutil só na beirada de baixo. Nada de detalhe que
  concorra com campos de formulário.
• Sem texto além do letreiro; sem moldura de UI; sem barra de status de celular;
  sem rosto de pessoa real; sem logo de marca real.
```

## Refinement notes (2026-09-09)
- The join screen's panel (with the avatar editor) is very tall, so the art shows
  mostly as a side/top ambient band there. It reads better on the shorter waiting
  screen and in-game.
- `background-position: center 4.5vh` nudges the painted "BOX FIESTA" clear of the
  sticky header into the header↔panel gap.
- Panels at `color-mix(var(--panel) 86%, transparent)` + `blur(16px)`.
