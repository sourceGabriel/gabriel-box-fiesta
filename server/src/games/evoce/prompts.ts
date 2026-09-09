import type { ContentTier } from '@party/shared';

/**
 * Original PT-BR prompt banks for É Você!. Written for this repo — not lifted from
 * *That's You!*, Jackbox, `rumpus`, or any other deck.
 *
 * `[NOME]` is replaced by the round's target player name (legenda / rabisco).
 * `___` marks where a player types (legenda) — rabisco / final have no blank, the
 * prompt itself is the drawing brief.
 *
 * Each bank is split by the room's `contentTier` (host toggle in the lobby):
 * `leve` plays only the leve list; `pesado` plays both.
 *
 * Guardrails on the `pesado` lists (do not cross): never a protected group (raça,
 * religião, orientação, deficiência) as the butt of the joke; the prompts are
 * about the people in the room by consent — keep it teasing, not cruel; nothing
 * sexual involving minors; no real outside private people.
 */

// ─────────────────────────────── ENQUETE ────────────────────────────────────
// "Quem de vocês…" — everyone taps a player.

const ENQUETE_LEVE: readonly string[] = [
  'Quem de vocês sobreviveria mais tempo sozinho numa ilha deserta?',
  'Quem seria o pior cozinheiro num programa de TV?',
  'Quem tem mais chance de virar milionário do nada?',
  'Quem choraria vendo um comercial de margarina?',
  'Quem seria o primeiro a ser expulso de um reality show?',
  'Quem esconde um talento secreto que ninguém aqui conhece?',
  'Quem largaria tudo pra virar mochileiro amanhã?',
  'Quem tem mais chance de adotar sete gatos?',
  'Quem seria o melhor líder numa zumbi-apocalipse?',
  'Quem daria o pior conselho amoroso?',
  'Quem provavelmente já falou sozinho no espelho ensaiando uma discussão?',
  'Quem chegaria atrasado até no próprio casamento?',
  'Quem tem a playlist mais vergonhosa no celular?',
  'Quem seria preso primeiro num rolê que deu errado?',
  'Quem gastaria a herança inteira em besteira?',
  'Quem tem mais chance de aparecer num documentário true crime — como testemunha?',
  'Quem seria o melhor pra esconder um corpo (hipoteticamente)?',
  'Quem aqui secretamente adora uma fofoca?',
  'Quem passaria vergonha num karaokê e nem perceberia?',
  'Quem tem mais chance de acreditar numa teoria da conspiração maluca?',
  'Quem seria o primeiro a entrar em pânico num voo com turbulência?',
  'Quem contaria uma mentira que cresce sozinha até virar impossível?',
  'Quem tem mais chance de virar influencer de um nicho bizarro?',
  'Quem daria o melhor discurso improvisado num velório?',
  'Quem já dormiu no ônibus e passou do ponto?',
  'Quem aqui não sabe dar um nó de gravata?',
  'Quem seria o melhor de vocês num debate acalorado no grupo da família?',
  'Quem tem mais chance de deixar o fogão ligado e sair de casa?',
  'Quem faria mais falta se sumisse por um mês?',
  'Quem tem a memória mais seletiva quando é conveniente?',
  'Quem seria o melhor pra convencer um segurança a deixar todo mundo entrar?',
  'Quem provavelmente já fingiu que conhecia uma música pra não passar vergonha?',
  'Quem tem mais chance de comprar algo caro só porque estava em promoção?',
  'Quem seria o pior parceiro num trabalho em grupo?',
  'Quem daria o melhor conselho num momento de crise real?',
];

const ENQUETE_PESADO: readonly string[] = [
  'Quem de vocês tem o histórico de navegador mais assustador?',
  'Quem já mandou mensagem pesada pra pessoa errada?',
  'Quem tem mais chance de ficar com alguém numa festa e esquecer o nome no dia seguinte?',
  'Quem seria o primeiro a vazar um nude sem querer no grupo da firma?',
  'Quem tem a pasta de fotos mais comprometedora?',
  'Quem já fingiu orgasmo e contou pra alguém depois?',
  'Quem tem mais chance de chorar bêbado e ligar pro ex?',
  'Quem provavelmente já mijou na piscina e sorriu pra você em seguida?',
  'Quem tem o fetiche mais estranho que jamais admitiria aqui?',
  'Quem seria o pior de vocês numa audiência de divórcio?',
  'Quem já passou mal de tanto beber e culpou a comida?',
  'Quem tem mais chance de ter um perfil secreto num app de pegação?',
  'Quem daria o pior depoimento pra polícia depois de uma noite caótica?',
  'Quem já traiu alguém e nunca contou pra ninguém?',
  'Quem tem mais chance de acabar pelado numa foto que vaza no futuro?',
  'Quem esconde o vício mais caro?',
  'Quem já fez xixi na cama depois dos 18 e negou até a morte?',
  'Quem seria o primeiro a ser cancelado por um tweet antigo?',
  'Quem tem mais chance de mandar áudio de 9 minutos falando mal de alguém que está no grupo?',
  'Quem já roubou algo de um hotel e ainda usa em casa?',
];

// ─────────────────────────────── LEGENDA ────────────────────────────────────
// A sentence about [NOME] with one blank. Everyone types the funniest completion.

const LEGENDA_LEVE: readonly string[] = [
  'A primeira coisa que [NOME] faz ao chegar numa festa é ___.',
  'Se [NOME] escrevesse um livro de autoajuda, o título seria "___".',
  'O maior medo secreto de [NOME] é ___.',
  'Se [NOME] fosse um item de supermercado, seria ___.',
  'A tatuagem que [NOME] faria bêbado(a) diz "___".',
  'No grupo da família, [NOME] é conhecido(a) por ___.',
  'A desculpa favorita de [NOME] pra sair mais cedo do trabalho é ___.',
  'Se [NOME] virasse um super-herói, o poder inútil dele(a) seria ___.',
  'O que [NOME] mais busca no Google escondido é ___.',
  'A profissão que [NOME] teria num universo paralelo é ___.',
  'Se [NOME] tivesse um programa de TV, o nome seria "___".',
  'O objeto mais estranho na mochila de [NOME] agora mesmo é ___.',
  'A frase que [NOME] fala toda hora sem perceber é "___".',
  'Se [NOME] fosse um cheiro, seria ___.',
  '[NOME] jamais admitiria, mas secretamente adora ___.',
  'O apelido que [NOME] merecia de verdade é "___".',
  'Se [NOME] fosse uma placa de trânsito, seria "___".',
  'O talento inútil de [NOME] é ___.',
  'A pior forma de acordar [NOME] é ___.',
  'Se [NOME] entrasse num reality, seria eliminado(a) por ___.',
  'O que [NOME] faria com uma hora de invisibilidade é ___.',
  'Se [NOME] fosse um emoji, seria ___.',
  'O tópico que faz [NOME] falar por 40 minutos sem parar é ___.',
  'Se [NOME] pudesse mandar uma lei nova, seria "___".',
];

const LEGENDA_PESADO: readonly string[] = [
  'O que a mãe de [NOME] descobriria vasculhando o quarto dele(a) é ___.',
  'A mensagem que [NOME] apagaria na hora se alguém pegasse o celular é ___.',
  'O que [NOME] gritaria sem querer no meio do sexo é "___".',
  'O motivo real do último término de [NOME] foi ___.',
  'A fantasia sexual que [NOME] fingiria não ter é ___.',
  'O que [NOME] fez na despedida de solteiro(a) e jurou nunca contar é ___.',
  'O que o(a) ex de [NOME] falaria sobre ele(a) numa terapia é ___.',
  'A parte do corpo que [NOME] tatuaria por uma aposta perdida é ___.',
  'O que [NOME] esconde embaixo da cama é ___.',
  'A pior coisa pra encontrar no quarto de [NOME] é ___.',
  'O que [NOME] faria por dinheiro que nunca admitiria aqui é ___.',
  'O vício secreto de [NOME] é ___.',
  'A busca em aba anônima mais recente de [NOME] foi "___".',
  'O que [NOME] postaria por engano no story e apagaria em 3 segundos é ___.',
];

// ─────────────────────────────── RABISCO ────────────────────────────────────
// Every player (except the model) draws [NOME] as the thing described.

const RABISCO_LEVE: readonly string[] = [
  'Desenhe [NOME] como um lutador de sumô.',
  'Desenhe [NOME] daqui a 40 anos.',
  'Desenhe [NOME] como um vilão de novela mexicana.',
  'Desenhe [NOME] no dia mais feliz da vida dele(a).',
  'Desenhe [NOME] como uma estátua de praça.',
  'Desenhe [NOME] chefiando uma seita.',
  'Desenhe [NOME] como um personagem de desenho animado dos anos 90.',
  'Desenhe [NOME] tentando parecer legal e falhando.',
  'Desenhe [NOME] como o rei/rainha de um reino muito pequeno.',
  'Desenhe [NOME] pego(a) fazendo algo que jurou que não fazia.',
  'Desenhe [NOME] como um monstro de filme B.',
  'Desenhe [NOME] no auge da fama, aos 60 anos.',
  'Desenhe [NOME] como um super-herói de orçamento baixo.',
  'Desenhe [NOME] acordando de ressaca.',
  'Desenhe [NOME] como o(a) protagonista de um comercial de remédio.',
  'Desenhe [NOME] como um animal que combina com a personalidade dele(a).',
  'Desenhe [NOME] tentando montar um móvel sozinho(a).',
  'Desenhe [NOME] como um quadro renascentista.',
  'Desenhe [NOME] na foto do documento que ele(a) mais odeia.',
  'Desenhe [NOME] correndo de algo invisível.',
];

const RABISCO_PESADO: readonly string[] = [
  'Desenhe [NOME] explicando pro RH por que o vídeo vazou.',
  'Desenhe [NOME] na cena do crime de uma burrada épica.',
  'Desenhe [NOME] fazendo a pior escolha da vida em tempo real.',
  'Desenhe [NOME] como aparece na imaginação do(a) ex dele(a).',
  'Desenhe [NOME] no pronto-socorro contando uma história muito mal contada.',
  'Desenhe [NOME] como o(a) protagonista de um vídeo de "reaja e comente".',
  'Desenhe [NOME] pego(a) no flagra pelo(a) crush.',
  'Desenhe [NOME] no dia seguinte à festa que ninguém pode comentar.',
  'Desenhe [NOME] tentando disfarçar no velório de alguém que odiava.',
  'Desenhe [NOME] como o vilão de um documentário true crime.',
];

// ─────────────────────────────── FINAL ──────────────────────────────────────
// "A Obra-Prima" — every player draws THEMSELVES from the prompt. Worth double.

const FINAL_LEVE: readonly string[] = [
  'Se desenhe como o super-herói que você seria.',
  'Se desenhe daqui a 30 anos, exatamente como você acha que vai estar.',
  'Se desenhe como o vilão que você daria um ótimo.',
  'Se desenhe no seu melhor dia possível.',
  'Se desenhe como um animal que é a sua cara.',
  'Se desenhe como você acha que os outros te veem.',
  'Se desenhe realizando o sonho mais bobo que você tem.',
  'Se desenhe como um personagem de videogame.',
  'Se desenhe como uma carta de tarô chamada "___".',
  'Se desenhe no auge da fama.',
  'Se desenhe como a versão mais dramática de você.',
  'Se desenhe fazendo a coisa que te deixa mais feliz no mundo.',
  'Se desenhe como um monstro fofo.',
  'Se desenhe como você era aos 12 anos.',
];

const FINAL_PESADO: readonly string[] = [
  'Se desenhe do jeito que você fica depois de três dias de festa.',
  'Se desenhe como você aparece nos pesadelos do(a) seu(sua) ex.',
  'Se desenhe fazendo a pior decisão da sua vida com um sorriso.',
  'Se desenhe explicando pra polícia que "não é o que parece".',
  'Se desenhe como o(a) protagonista de um escândalo.',
  'Se desenhe no seu pior momento, mas orgulhoso(a).',
  'Se desenhe como você seria se largasse tudo e virasse um problema.',
  'Se desenhe daqui a 20 anos, se nenhuma das suas escolhas mudar.',
];

// ─────────────────────────────── selectors ──────────────────────────────────

const pick = (leve: readonly string[], pesado: readonly string[], tier: ContentTier | undefined): string[] =>
  tier === 'leve' ? [...leve] : [...leve, ...pesado];

export const enquetePrompts = (tier: ContentTier | undefined) => pick(ENQUETE_LEVE, ENQUETE_PESADO, tier);
export const legendaPrompts = (tier: ContentTier | undefined) => pick(LEGENDA_LEVE, LEGENDA_PESADO, tier);
export const rabiscoPrompts = (tier: ContentTier | undefined) => pick(RABISCO_LEVE, RABISCO_PESADO, tier);
export const finalPrompts = (tier: ContentTier | undefined) => pick(FINAL_LEVE, FINAL_PESADO, tier);

/** @deprecated for tests / external reference. */
export const EVOCE_BANKS = {
  enquete: { leve: ENQUETE_LEVE, pesado: ENQUETE_PESADO },
  legenda: { leve: LEGENDA_LEVE, pesado: LEGENDA_PESADO },
  rabisco: { leve: RABISCO_LEVE, pesado: RABISCO_PESADO },
  final: { leve: FINAL_LEVE, pesado: FINAL_PESADO },
} as const;
