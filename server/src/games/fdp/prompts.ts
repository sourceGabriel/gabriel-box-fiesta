import type { ContentTier } from '@party/shared';

/**
 * Original PT-BR prompt bank for FDP — Foi De Propósito. Written for this repo —
 * NOT lifted from Cards Against Humanity (whose text is non-commercial), Quiplash,
 * `rumpus`, or any other deck.
 *
 * FDP is a +18 game by design. It still has two tiers, chosen by the room's
 * `contentTier` (host toggle in the lobby):
 *  - `FDP_PROMPTS_LEVE`   — awkward / suggestive, nothing explicit.
 *  - `FDP_PROMPTS_PESADO` — the full deck: explicit sex, escatologia, gore, humor
 *    de forca, drogas, tabu, sátira de figura pública como arquétipo.
 * `pesado` mode plays both lists; `leve` mode plays only the first.
 *
 * `___` marks where the player's answer drops in; a prompt with no `___` is a
 * straight question. The engine shuffles the resulting list per match.
 */

export const FDP_PROMPTS_LEVE: readonly string[] = [
  'Meu terapeuta parou de me atender no dia em que contei sobre ___.',
  'O verdadeiro motivo do meu último término foi ___.',
  '___: foi assim que estraguei o Natal da família inteira.',
  'Meu grupo da família explodiu depois que a titia mandou ___.',
  'O que eu procuro em aba anônima: ___.',
  'Meu currículo tem uma lacuna de dois anos por causa de ___.',
  'O que eu realmente penso durante um minuto de silêncio: ___.',
  '___: a nova disciplina obrigatória do ensino médio.',
  'A tatuagem que eu fiz bêbado diz ___.',
  'O que eu faria com uma hora de invisibilidade: ___.',
  'Meu Tinder bombou depois que troquei a foto por ___.',
  '___ foi o motivo alegado no meu boletim de ocorrência.',
  'Toda família tem aquele tio que só fala sobre ___.',
  'O que eu escondo embaixo da cama: ___.',
  'Fui demitido por e-mail com o assunto "___".',
  'Passei a virada do ano chorando por causa de ___.',
  'A pior lembrancinha de festa infantil é ___.',
  'Meu histórico do navegador é 90% ___.',
  'O que eu grito quando bato o dedinho do pé no móvel: ___.',
  'A propaganda de remédio termina listando ___ entre os efeitos colaterais.',
  'Meu ex me bloqueou depois que eu mandei ___ às 3 da manhã.',
  'O que a inteligência artificial vai usar contra nós: ___.',
  'Vovó descobriu o WhatsApp e agora todo dia manda ___.',
  'O motivo real do meu atestado médico foi ___.',
  'A gente terminou porque ele roncava e também por causa de ___.',
  'Meu maior arrependimento da faculdade é ___.',
  'O que eu levaria pra uma ilha deserta em vez de comida: ___.',
  'A plaquinha no meu túmulo vai dizer ___.',
  'O que eu penso quando o dentista pergunta se está doendo: ___.',
  'Minha busca no Google mais vergonhosa deste mês foi "___".',
  'O grupo de pais da escola pegou fogo por causa de ___.',
  'O que faz um churrasco de família virar tragédia: ___.',
  'Aceitei os termos de uso sem ler e agora eles são donos de ___.',
  'A pior coisa pra encontrar no bolso de um casaco emprestado é ___.',
  'O que eu faço quando ninguém está olhando: ___.',
  'O que eu diria pra Deus na porta do céu pra tentar me safar: ___.',
  'O que eu realmente quis dizer com "vamos ver um filme lá em casa": ___.',
  'A frase que o boy acha que é charme e mata qualquer clima: ___.',
];

export const FDP_PROMPTS_PESADO: readonly string[] = [
  'Nada arruína uma primeira transa como ___.',
  'A pior coisa para sussurrar no ouvido de alguém durante o sexo é ___.',
  '___ é a razão de eu não poder mais entrar naquele McDonald\'s.',
  'Meu plano pra ficar rico envolve ___ e nenhuma testemunha.',
  'A herança da vovó veio com um bilhete dizendo ___.',
  'O que encontraram no meu histórico depois que eu morri: ___.',
  'Cancelei o convite de casamento depois de ver ___ na despedida de solteiro.',
  'Meu Deus interior grita ___ toda vez que alguém fala em política no almoço.',
  'Meu Tinder bombou depois que troquei a bio por ___.',
  'Meu maior fetiche, que eu jamais admitiria sóbrio, é ___.',
  'O que realmente rola no banheiro do escritório: ___.',
  '___: a causa da morte que a família preferiu não divulgar.',
  'O padre me chamou pra conversar depois da missa por causa de ___.',
  'Meu histórico do navegador é 90% ___.',
  'A pior maneira de descobrir que você é corno é ___.',
  'O que o urologista anotou no prontuário e não te contou: ___.',
  'A pior coisa para encontrar no quarto dos seus pais é ___.',
  'Um fetiche que você fingiu ter para não decepcionar alguém: ___.',
  'Descobriram ___ no porão do vizinho silencioso.',
  'O motivo real do meu atestado médico, mas na versão honesta: ___.',
  'A verdadeira razão de o padre ter trancado o confessionário foi ___.',
  '___: o motivo pelo qual não sou mais bem-vindo no grupo da igreja.',
  'O pior momento para o vibrador ligar sozinho na bolsa é ___.',
  'A pior coisa pra sentir o gosto no meio de um oral: ___.',
  'O que eu gritei no meio do sexo que encerrou o relacionamento: ___.',
  'O que sobrou na cama depois da noite mais lendária da minha vida: ___.',
  'O que o urologista tirou de mim e guardou num potinho pra mostrar aos residentes: ___.',
  'A pior coisa pra ouvir com a calça já no tornozelo: ___.',
  'A pior surpresa de encontrar no lençol de um motel: ___.',
  'O que o motoboy viu quando eu abri a porta de cueca: ___.',
  'O que o Uber Pool testemunhou e nunca mais foi o mesmo: ___.',
  'O que sai do banheiro do ônibus interestadual às 3h da manhã: ___.',
  'O que sai de mim quando eu tusso desde a festa de sábado: ___.',
  'O motivo pelo qual eu não posso mais doar sangue: ___.',
  'O motivo pelo qual o meu plano de saúde me cancelou: ___.',
  'O que o coveiro cochichou quando abaixou o caixão: ___.',
  '___ foi o que o legista escreveu como "causa provável".',
  'O que o político genérico soltou no debate e ninguém teve coragem de cortar: ___.',
  'O que a popstar internacional pediu no camarim e o roadie teve que arrumar: ___.',
  'A verdadeira letra do hit do momento, se fosse honesta: ___.',
  'O que a IA generativa aprendeu comigo e agora faz melhor: ___.',
  'O que a IA vai fazer com a pasta "não abrir" do meu computador: ___.',
  'O que eu misturei na festa e passei três dias sem lembrar do meu nome: ___.',
  'O que exatamente tinha no cigarro que me ofereceram no rolê: ___.',
  'O que o segurança da balada achou na minha bolsa e devolveu na moral: ___.',
  'O que o tio bêbado confessou no Natal antes de a polícia chegar: ___.',
  'O que rola no grupo do WhatsApp da diretoria depois das 22h: ___.',
  'A fantasia que eu impus ao meu ex e por isso ele é o ex agora: ___.',
  'O que a vovó tem no navegador e a família jurou nunca comentar: ___.',
  'O último Stories da pessoa antes de ela entrar pra uma seita: ___.',
  'A verdadeira composição do "combo da promoção" do bar de esquina: ___.',
  'O apelido que o bar mais caído da minha cidade merecia de verdade: ___.',
  'O nome do after que só abre depois das 5h e ninguém lembra de ter ido: ___.',
  'O que eu inventei pro RH quando o print vazou no grupo errado: ___.',
  'O plano de negócios que só funciona se ninguém pagar imposto e ninguém morrer: ___.',
  'O que o enfermeiro do plantão de domingo já viu chegar entalado onde não devia: ___.',
  'A verdade sobre a despedida de solteiro que ninguém pode contar pro noivo: ___.',
  'O que eu faria com poder absoluto por 24 horas e imunidade garantida: ___.',
  'A parte do meu corpo que eu não deixo ninguém tocar, e o porquê: ___.',
  'O que a minha busca em aba anônima revela sobre quem eu sou de verdade: ___.',
  'O que o padre confiscou de mim no acampamento da igreja: ___.',
  'O que eu faço no banheiro do trabalho e lanço na agenda como "reunião": ___.',
];

/** The prompt bank for a given room content tier. `pesado` = both lists. */
export const fdpPrompts = (tier: ContentTier | undefined): string[] =>
  tier === 'leve' ? [...FDP_PROMPTS_LEVE] : [...FDP_PROMPTS_LEVE, ...FDP_PROMPTS_PESADO];

/** @deprecated kept for any external reference — use `fdpPrompts(tier)`. */
export const FDP_PROMPTS: readonly string[] = [...FDP_PROMPTS_LEVE, ...FDP_PROMPTS_PESADO];
