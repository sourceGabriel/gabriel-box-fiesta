import type { ContentTier } from '@party/shared';
import type { DilemaCardType } from '@party/shared';

/**
 * Original PT-BR card bank for Dilema nos Trilhos. Written for this repo — NOT
 * lifted from *Trial by Trolley* (Skybound / Cyanide & Happiness), `rumpus`, or
 * any other deck. The mechanic is the trolley problem; the words are ours.
 *
 * Three piles:
 *  - `INNOCENTS` — someone/something on a track you would feel bad flattening.
 *    Played onto your OWN track to make the Maquinista spare you.
 *  - `GUILTY`    — someone the room would happily see flattened (a social type, a
 *    mania, an archetype — never a real named private person). Played onto the
 *    ENEMY track.
 *  - `MODIFIERS` — a clause stapled onto one specific card to twist its weight
 *    ("…mas todos são clones", "×10", "…e um deles é você").
 *
 * Two tiers, chosen by the room's `contentTier` (host toggle in the lobby):
 *  - `*_LEVE`   — absurd / mean-spirited, nothing graphic.
 *  - `*_PESADO` — the full deck: gore, sexo entre adultos, escatologia, humor de
 *    forca, drogas, tabu, sátira de figura pública como arquétipo.
 * `pesado` plays both lists; `leve` plays only the first.
 *
 * Guardrails (do not cross, even in `pesado`): never a protected group (raça,
 * religião — inclui crente —, orientação, deficiência) as the punchline; never a
 * real private person as the target; nothing involving minors as the victim for
 * laughs; no graphic sex about a named real person; no real specific atrocity
 * with real victims (Mariana/Brumadinho, 9/11, real named killers); nothing
 * written to defame a real named business. The group's own inside jokes go in
 * this file by hand.
 */

export type DilemaCardDef = { type: DilemaCardType; text: string };

// ─── INNOCENTS ───────────────────────────────────────────────────────────────

const INNOCENTS_LEVE: readonly string[] = [
  'um filhote de capivara que se perdeu da mãe',
  'a última pessoa viva que sabe consertar aquele eletrodoméstico',
  'um grupo de idosos no meio de uma partida de dominó',
  'o cachorro comunitário que todo mundo do bairro alimenta',
  'uma orquestra de amadores a caminho do primeiro show',
  'a bióloga que está a um dia de curar a calvície',
  'três pinguins que só queriam atravessar',
  'o entregador que tem avaliação 5 estrelas há seis anos',
  'uma noiva que já está atrasada pro próprio casamento',
  'o único padeiro da cidade que acerta o ponto do pão de queijo',
  'um casal de aposentados na viagem que economizaram a vida toda pra fazer',
  'a professora que pagou material escolar do próprio bolso a carreira inteira',
  'um golden retriever de colete laranja em dia de trabalho',
  'a enfermeira que ficou de plantão no Natal pra colega ver os filhos',
  'um grupo de escoteiros vendendo biscoito pra caridade',
  'o cara que devolveu a carteira cheia de dinheiro que achou na rua',
  'uma família de patos em fila indiana',
  'o voluntário que resgata gato de telhado de graça',
  'a senhora que faz sopa pra todo mundo do prédio quando alguém adoece',
  'um panda que finalmente ia se reproduzir em cativeiro',
  'o técnico de futebol infantil que nunca deixa ninguém no banco',
  'a moça que segura o elevador pra você todo santo dia',
  'um cavalo de terapia a caminho do hospital infantil',
  'o aposentado que rega as plantas da praça por conta própria',
  'a plateia inteira de um teatro de fantoches',
  'o motorista de van escolar com trinta anos sem uma multa',
  'uma tartaruga marinha voltando pro mar depois de vinte anos',
  'o rapaz que doa sangue toda vez que pode',
  'a bibliotecária que perdoou sua multa de livro atrasado',
  'um coral de igreja ensaiando pro fim de ano',
  'o casal que adota só cachorro velho que ninguém quer',
  'a equipe de resgate que ainda não tirou férias este ano',
];

const INNOCENTS_PESADO: readonly string[] = [
  'um doador de órgãos com match perfeito pra fila inteira do hospital',
  'a única testemunha que ia derrubar o esquema de corrupção da cidade',
  'um hospício inteiro em dia de visita da família',
  'o cientista que tava a uma semana de acabar com a fome mundial',
  'uma van de doação de medula a caminho do transplante',
  'o médico legista que sabe onde os corpos estão enterrados — literalmente',
  'a mulher grávida de trigêmeos já em trabalho de parto',
  'um albergue lotado numa noite de -2 graus',
  'o cara que ia entregar o antídoto antes de todo mundo passar mal',
  'a assistente social que carrega a região inteira nas costas',
  'um ônibus de doadores voltando do hemocentro',
  'o bombeiro que já tirou mais de cem pessoas do fogo',
  'uma clínica de reabilitação no dia da alta coletiva',
  'o único intérprete de Libras da comarca inteira',
  'a professora que tá levando os alunos pra primeira ida ao museu da vida deles',
  'um grupo de sobreviventes voltando da terapia em grupo',
  'o motorista de ambulância que fez três partos no trânsito esse ano',
  'a psicóloga que atende de graça quem tá na pior',
  'um casal que tentou engravidar por doze anos e conseguiu ontem',
  'o rapaz que ia doar o rim pro irmão amanhã de manhã',
  'uma equipe de paliativos indo dar a última visita de alguém',
  'o veterinário que opera bicho de rua no fim de semana de graça',
  'a merendeira que é a única refeição quente de metade da escola',
  'um grupo de apoio a luto perinatal no primeiro encontro',
  'o cara que decorou a senha do cofre que alimenta a folha de pagamento da cidade',
];

// ─── GUILTY ──────────────────────────────────────────────────────────────────

const GUILTY_LEVE: readonly string[] = [
  'quem estaciona ocupando duas vagas de propósito',
  'o cara que responde "bom dia" com áudio de quatro minutos',
  'quem fura a fila do caixa preferencial sem precisar',
  'o vizinho que faz obra às sete da manhã de domingo',
  'quem para na saída da escada rolante pra pensar na vida',
  'o influencer que chama seguidor de "família" e vende curso de pirâmide',
  'quem devolve o carrinho do mercado no meio da vaga',
  'o sujeito que fala no cinema achando que ninguém ouve',
  'quem manda "oi" e fica cinco horas pra dizer o que quer',
  'o motorista que liga a seta depois de já ter virado',
  'quem esquenta peixe no micro-ondas do trabalho',
  'o cara que dá spoiler de série "sem querer" de propósito',
  'quem coloca a mochila no banco do busão lotado',
  'o palestrante que diz "vou ser breve" e fala uma hora',
  'quem responde a todos num email que era pra uma pessoa',
  'o vizinho de cima que anda de salto em piso de madeira à meia-noite',
  'quem tira foto do prato de todo mundo antes de deixar comer',
  'o guichê que fecha na sua vez depois de duas horas de fila',
  'quem usa o celular no volume máximo no transporte público',
  'o chefe que marca reunião às seis da tarde de sexta',
  'quem para o carro na faixa de pedestre e olha pro outro lado',
  'o parente que pergunta do salário e de namoro no almoço de família',
  'quem come o lanche que não é dele da geladeira compartilhada',
  'o cara que aplaude quando o avião pousa',
  'quem manda corrente dizendo que dá azar não repassar',
  'o síndico que gasta o condomínio inteiro em plantinha na portaria',
  'quem responde "kk" pra desabafo de meia página',
  'o motoboy do próprio prédio que buzina em vez de subir',
  'quem fala alto no viva-voz na sala de espera',
  'o colega que rouba sua ideia na reunião e apresenta como dele',
];

const GUILTY_PESADO: readonly string[] = [
  'o golpista que limpa a poupança de aposentado pelo telefone',
  'quem dá cavalo de pau na frente da escola na hora da saída',
  'o patrão que não paga hora extra e chama o time de "família"',
  'quem abandona cachorro na estrada quando muda de cidade',
  'o cara que dirige bêbado toda sexta e se gaba disso',
  'quem manda nude sem ninguém pedir',
  'o corretor de cripto que sumiu com o dinheiro do grupo',
  'quem xinga garçom pra parecer importante no encontro',
  'o político que cortou a merenda pra reformar o próprio gabinete',
  'quem fila a herança e some do velório antes do caixão descer',
  'o médico que atende plano de saúde em trinta segundos e cobra por fora',
  'quem espalha boato de que o vizinho é ladrão sem nenhuma prova',
  'o cara que grava briga alheia na rua em vez de chamar ajuda',
  'quem passa a perna no sócio e fica com a empresa inteira',
  'o motorista de app que cancela na chuva depois de te ver esperando',
  'quem cola o carro na traseira e dá farol alto no túnel',
  'o senhorio que corta a água pra forçar o inquilino a sair',
  'quem denuncia o food truck do concorrente com processo inventado',
  'o cara que mente que fez faculdade de medicina e atende gente',
  'quem deixa o hidrômetro do prédio no nome de outro pra não pagar',
  'o chefe que passa cantada em estagiária e segura a promoção dela',
  'quem furou a fila da vacina fingindo comorbidade',
  'o influenciador que fez rifa de carro, sacou o dinheiro e travou o perfil',
  'quem envenena a comida do gato do vizinho porque "mia demais"',
  'o cara que dá calote no pintor e ainda avalia mal o serviço',
];

// ─── MODIFIERS ───────────────────────────────────────────────────────────────
// Written to read as a clause stapled onto another card. The UI shows them as
// "＋ …" chips on the base card.

const MODIFIERS_LEVE: readonly string[] = [
  '…só que são dez vezes mais',
  '…e um deles é você',
  '…mas na verdade tá tudo fingindo',
  '…e todos estão dormindo e não vão sentir nada',
  '…só que são todos clones e tem backup',
  '…e é o aniversário deles hoje',
  '…mas eles votaram em quem você odeia',
  '…e estão ao vivo pra cidade inteira assistir',
  '…só que já estavam de saída mesmo',
  '…e um deles tem a senha do seu banco',
  '…mas eles acabaram de te xingar',
  '…e a mãe deles está assistindo',
  '…só que são robôs muito convincentes',
  '…e você vai ter que explicar isso no jantar de domingo',
];

const MODIFIERS_PESADO: readonly string[] = [
  '…e a câmera de segurança pega tudo do seu ângulo',
  '…mas um deles ia te processar amanhã',
  '…e todos assinaram doação de órgãos',
  '…só que já estão com morte cerebral',
  '…e o trolebus é você quem vai ter que dirigir',
  '…mas eles sabem onde você mora',
  '…e um deles é seu ex com o print daquela mensagem',
  '…só que são todos golpistas disfarçados de inocente',
  '…e o seguro paga em dobro se acontecer',
  '…mas você prometeu no velório da sua avó que não faria isso',
  '…e um deles é o juiz do seu processo',
  '…só que eles trocaram de trilho no último segundo de sacanagem',
];

// ─── assembly ────────────────────────────────────────────────────────────────

const build = (
  innocents: readonly string[],
  guilty: readonly string[],
  modifiers: readonly string[],
): { innocents: DilemaCardDef[]; guilty: DilemaCardDef[]; modifiers: DilemaCardDef[] } => ({
  innocents: innocents.map((text) => ({ type: 'innocent' as const, text })),
  guilty: guilty.map((text) => ({ type: 'guilty' as const, text })),
  modifiers: modifiers.map((text) => ({ type: 'modifier' as const, text })),
});

/** The three card piles for a given room content tier. `pesado` = both lists. */
export const dilemaCards = (
  tier: ContentTier | undefined,
): { innocents: DilemaCardDef[]; guilty: DilemaCardDef[]; modifiers: DilemaCardDef[] } =>
  tier === 'leve'
    ? build(INNOCENTS_LEVE, GUILTY_LEVE, MODIFIERS_LEVE)
    : build(
        [...INNOCENTS_LEVE, ...INNOCENTS_PESADO],
        [...GUILTY_LEVE, ...GUILTY_PESADO],
        [...MODIFIERS_LEVE, ...MODIFIERS_PESADO],
      );
