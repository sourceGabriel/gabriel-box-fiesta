import type { ContentTier } from '@party/shared';

/**
 * Original PT-BR spectrum bank for Sintonia. Written for this repo — NOT lifted
 * from *Wavelength* (CMYK / Palm Court) or any other deck. The mechanic is the
 * hidden-dial guess; the word pairs are ours.
 *
 * Each entry is `[left pole, right pole]`. A good pair is a single fuzzy axis
 * everyone can argue about — not true opposites, not a quiz. The médium sees a
 * point on it and has to describe that point in one clue.
 *
 * Two tiers, chosen by the room's `contentTier` (host toggle in the lobby):
 *  - `*_LEVE`   — dinner-table safe, still debatable.
 *  - `*_PESADO` — the extra pack: crude, taboo, morally grey, adults-only framing.
 * `pesado` plays LEVE + PESADO; `leve` plays only LEVE (so LEVE is a strict prefix
 * of the pesado list — the content-tier test relies on that).
 *
 * Guardrails (do not cross, even in `pesado`): never a protected group (raça,
 * religião — inclui crente —, orientação, deficiência) as the butt of the axis;
 * never a real private person; nothing sexualising minors; no real specific
 * atrocity with real victims. The group's own inside jokes go in this file by hand.
 */

export type Spectrum = readonly [left: string, right: string];

const SPECTRUMS_LEVE: readonly Spectrum[] = [
  ['Chato', 'Divertido'],
  ['Superestimado', 'Subestimado'],
  ['Arte', 'Lixo'],
  ['Herói', 'Vilão'],
  ['Inofensivo', 'Perigoso'],
  ['Comida de rico', 'Comida de pobre'],
  ['Fácil de fingir', 'Impossível de fingir'],
  ['Guilty pleasure', 'Orgulho assumir'],
  ['Mania irritante', 'Charme'],
  ['Cafona', 'Estiloso'],
  ['Coisa de criança', 'Coisa de adulto'],
  ['Vale a fila', 'Nunca vale a fila'],
  ['Melhor quente', 'Melhor gelado'],
  ['Presente furada', 'Presente dos sonhos'],
  ['Trabalho fácil', 'Trabalho brutal'],
  ['Esporte de verdade', 'Só passatempo'],
  ['Sorte', 'Habilidade'],
  ['Melhor sozinho', 'Melhor em grupo'],
  ['Toc', 'Relaxado demais'],
  ['Fofo', 'Assustador'],
  ['Barato', 'Caríssimo'],
  ['Passageiro', 'Marca pra vida'],
  ['Cheiro bom', 'Cheiro horrível'],
  ['Água', 'Fogo'],
  ['Perda de tempo', 'Tempo bem gasto'],
  ['Casual', 'Formal'],
  ['Todo mundo sabe fazer', 'Quase ninguém sabe fazer'],
  ['Melhor no livro', 'Melhor no filme'],
  ['Bicho de estimação normal', 'Bicho de estimação esquisito'],
  ['Frescura', 'Necessidade'],
  ['Silencioso', 'Barulhento'],
  ['Envelhece mal', 'Envelhece bem'],
  ['Roubada', 'Negócio da China'],
  ['Café da manhã', 'Sobremesa'],
  ['Coragem', 'Burrice'],
  ['Educado demais', 'Sincero demais'],
  ['Feriado tranquilo', 'Feriado caótico'],
  ['Comprar novo', 'Consertar o velho'],
  ['Segredo bobo', 'Segredo pesado'],
  ['Amigo de festa', 'Amigo de crise'],
];

const SPECTRUMS_PESADO: readonly Spectrum[] = [
  ['Crime bobo', 'Crime sério'],
  ['Mentira que pega bem', 'Mentira imperdoável'],
  ['Vergonha alheia', 'Crime contra a humanidade'],
  ['Sofrível na cama', 'Lenda na cama'],
  ['Ressaca leve', 'Quase morri'],
  ['Traição perdoável', 'Traição imperdoável'],
  ['Fetiche comum', 'Fetiche que assusta'],
  ['Só um perrengue', 'Trauma pra terapia'],
  ['Bêbado engraçado', 'Bêbado problema'],
  ['Cringe', 'Motivo pra sumir do país'],
  ['Cheiro de banheiro de bar', 'Arma química'],
  ['Piada de mau gosto', 'Cancelamento merecido'],
  ['Golpe esperto', 'Golpe nojento'],
  ['Dívida administrável', 'Fuja do país'],
  ['Ex de boa', 'Ex que dá medida protetiva'],
  ['Segredo de família', 'Assunto de novela mexicana'],
  ['Só falta de higiene', 'Perigo à saúde pública'],
  ['Manda nudes', 'Nunca em hipótese alguma'],
  ['Herança justa', 'Motivo de rompimento eterno'],
  ['Tóxico mas engraçado', 'Só tóxico'],
  ['Cochilo no trabalho', 'Demissão por justa causa'],
  ['Bêbado no casamento', 'Arruinou o casamento'],
  ['Fofoca inofensiva', 'Fofoca que destrói vidas'],
  ['Furou a dieta', 'Furou a cadeia'],
  ['Só constrangeu a mesa', 'Nunca mais foi convidado'],
  ['Vacilo de novato', 'Processo trabalhista'],
];

/** The spectrum pool for a given room content tier. `pesado` = both lists. */
export const sintoniaSpectrums = (tier: ContentTier | undefined): Spectrum[] =>
  tier === 'leve' ? [...SPECTRUMS_LEVE] : [...SPECTRUMS_LEVE, ...SPECTRUMS_PESADO];

export { SPECTRUMS_LEVE, SPECTRUMS_PESADO };
