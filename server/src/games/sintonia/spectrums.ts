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
  ['Superstição', 'Ciência'],
  ['Falar', 'Escutar'],
  ['Planejar tudo', 'Improvisar tudo'],
  ['Reunião que podia ser email', 'Reunião que salvou o projeto'],
  ['Melhor na teoria', 'Melhor na prática'],
  ['Roupa confortável', 'Roupa bonita'],
  ['Filme pra ver sozinho', 'Filme pra ver com todo mundo'],
  ['Playlist de treino', 'Playlist de choro'],
  ['Assunto de primeiro encontro', 'Assunto pra nunca tocar'],
  ['Elogio sincero', 'Puxa-saquismo'],
  ['Firula', 'Essencial'],
  ['Hobby caro', 'Hobby de graça'],
  ['Nostálgico', 'Só datado'],
  ['Superpoder inútil', 'Superpoder dos sonhos'],
  ['Mico que vira piada', 'Mico que te persegue'],
  ['Rir alto', 'Rir por dentro'],
  ['Cheiro que dá fome', 'Cheiro que tira a fome'],
  ['Coisa de gente organizada', 'Coisa de gente bagunçada'],
  ['Vale pagar caro', 'Nunca vale pagar caro'],
  ['Bom pra dividir', 'Só pra você'],
  ['Presente de última hora', 'Presente pensado com carinho'],
  ['Melhor de manhã', 'Melhor de madrugada'],
  ['Trabalho de sonho', 'Trabalho de pesadelo'],
  ['Todo mundo faz e não admite', 'Ninguém admite fazer'],
  ['Cansa o corpo', 'Cansa a cabeça'],
  ['Dá pra maratonar', 'Um episódio já basta'],
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
  ['Cantada que funciona', 'Cantada que dá vergonha alheia'],
  ['Kink de boa', 'Kink pra não contar nem no divã'],
  ['Só um perrengue na cama', 'Nunca mais te procurou'],
  ['Peido discreto', 'Evacuação de emergência'],
  ['Bafo de ressaca', 'Bafo de necrotério'],
  ['Bebi demais', 'Lavaram meu estômago'],
  ['Ciúme meio fofo', 'Ciúme que dá boletim de ocorrência'],
  ['Só uma paquera', 'Corno com registro em vídeo'],
  ['Fiquei mal', 'Fiquei internado'],
  ['Segredo que conto bêbado', 'Segredo que levo pro caixão'],
  ['Piada no grupo da família', 'Piada que te tira do grupo da família'],
  ['Deu ruim no date', 'Rendeu boletim de ocorrência'],
  ['Menti no currículo', 'Falsidade ideológica'],
  ['Peguei escondido', 'Roubei mesmo'],
  ['Flerte no trabalho', 'O RH te chamou pra conversar'],
  ['Dívida no cartão', 'Agiota sabe onde você mora'],
  ['Textão pro ex às 3h', 'Ordem de restrição'],
  ['Bebi e chamei um Uber', 'Bebi e dirigi'],
  ['Só falei mal pelas costas', 'Difamação com processo'],
  ['Peguei um docinho do escritório', 'Desviei da vaquinha do amigo'],
  ['Nudes que envelheceram bem', 'Nudes que vazaram'],
  ['Fetiche que dá pra assumir', 'Fetiche que muda como te olham pra sempre'],
  ['Foi só uma noite', 'Virou pensão'],
  ['Ficou com o crush da amiga', 'Ficou com a mãe da amiga'],
  ['Vômito no táxi', 'Vômito no colo de alguém'],
  ['Álbum de figurinha do date', 'Perfil no Tinder aberto ainda'],
  ['Exagerei na happy hour', 'Falei tudo que pensava pro chefe'],
  ['Só rolou um perrengue financeiro', 'Estelionato'],
  ['Xixi na piscina', 'Cocô na piscina'],
  ['Fingi orgasmo', 'Fingi a relação inteira'],
  ['Terminou por mensagem', 'Terminou trocando a fechadura'],
  ['Vergonha de contar pro date', 'Vergonha de contar pro delegado'],
  ['Mancada com o sogro', 'Nunca mais pisou na casa da família'],
];

/** The spectrum pool for a given room content tier. `pesado` = both lists. */
export const sintoniaSpectrums = (tier: ContentTier | undefined): Spectrum[] =>
  tier === 'leve' ? [...SPECTRUMS_LEVE] : [...SPECTRUMS_LEVE, ...SPECTRUMS_PESADO];

export { SPECTRUMS_LEVE, SPECTRUMS_PESADO };
