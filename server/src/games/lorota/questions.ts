import type { ContentTier } from '@party/shared';

/**
 * Original PT-BR "fato com lacuna" bank for Lorota!. Written for this repo — not
 * lifted from Fibbage, Jackbox, `rumpus`, or any other deck.
 *
 * `text` contains a single `___` blank. `answer` is the real answer; `alt` lists
 * other spellings that should count as the truth (the engine normalises casing,
 * spacing, trailing punctuation and accents on its own). Keep answers short.
 *
 * `tier: 'pesado'` marks a +18 entry (gross / sexual / morbid). Still a genuinely
 * verifiable fact (or a clearly-labelled myth) so the truth-hunt keeps working.
 * The room's `contentTier` decides whether those are dealt: `leve` skips them,
 * `pesado` deals everything.
 *
 * The engine shuffles the resulting list per match and reshuffles when it runs out.
 */
export type LorotaQuestion = { text: string; answer: string; alt?: string[]; tier?: 'pesado' };

export const LOROTA_QUESTIONS: readonly LorotaQuestion[] = [
  { text: 'O animal terrestre mais rápido do mundo é o ___.', answer: 'guepardo', alt: ['chita', 'cheetah'] },
  { text: 'A capital da Austrália é ___.', answer: 'Camberra', alt: ['Canberra'] },
  { text: 'O osso mais longo do corpo humano é o ___.', answer: 'fêmur' },
  { text: 'O planeta com o dia mais longo do Sistema Solar é ___.', answer: 'Vênus' },
  { text: 'O maior órgão do corpo humano é a ___.', answer: 'pele' },
  { text: 'A Torre Eiffel fica mais alta no verão porque o metal se ___.', answer: 'dilata', alt: ['expande'] },
  { text: 'O único metal líquido à temperatura ambiente é o ___.', answer: 'mercúrio' },
  { text: 'O primeiro país a dar o direito de voto às mulheres foi a ___.', answer: 'Nova Zelândia' },
  { text: 'A palavra "robô" vem de uma peça de teatro escrita em ___.', answer: 'tcheco' },
  { text: 'O mel nunca estraga porque tem quase nenhuma ___.', answer: 'água' },
  { text: 'O maior deserto do mundo é a ___.', answer: 'Antártida', alt: ['Antartica', 'Antártica'] },
  { text: 'Um grupo de flamingos é chamado de ___.', answer: 'flamboiã', alt: ['flamboyance'] },
  { text: 'O coração de um camarão fica na ___ dele.', answer: 'cabeça' },
  { text: 'A Grande Muralha da China NÃO pode ser vista da Lua a olho ___.', answer: 'nu' },
  { text: 'O país com mais fusos horários no mundo é a ___.', answer: 'França' },
  { text: 'A cor da luz do Sol vista do espaço, sem atmosfera, é ___.', answer: 'branca' },
  { text: 'O inventor do telefone que patenteou primeiro foi ___.', answer: 'Alexander Graham Bell', alt: ['Graham Bell', 'Bell'] },
  { text: 'A fruta que é tecnicamente uma baga, mas a morango não é, é a ___.', answer: 'banana' },
  { text: 'O menor país do mundo em área é o ___.', answer: 'Vaticano' },
  { text: 'O gás mais abundante na atmosfera da Terra é o ___.', answer: 'nitrogênio', alt: ['azoto'] },
  { text: 'A lula-gigante tem os maiores ___ do reino animal.', answer: 'olhos' },
  { text: 'O nome científico do urso-panda-gigante significa "pé de ___".', answer: 'gato' },
  { text: 'O primeiro produto com código de barras vendido numa loja foi um pacote de ___.', answer: 'chiclete', alt: ['goma de mascar'] },
  { text: 'O Rio Amazonas não tem nenhuma ___ cruzando seu leito principal.', answer: 'ponte' },
  { text: 'A pessoa que ganhou dois prêmios Nobel em ciências diferentes foi ___.', answer: 'Marie Curie', alt: ['Curie'] },
  { text: 'O oposto de "sobremesa" no início da refeição, na França, chama-se ___.', answer: 'entrada', alt: ['entrée'] },
  { text: 'A velocidade da luz é de aproximadamente 300 mil ___ por segundo.', answer: 'quilômetros', alt: ['km'] },
  { text: 'O material mais duro produzido naturalmente pelo corpo humano é o ___ do dente.', answer: 'esmalte' },
  { text: 'A capital do Canadá é ___.', answer: 'Ottawa', alt: ['Otava'] },
  { text: 'Os polvos têm ___ corações.', answer: 'três' },
  { text: 'O instrumento musical com mais peças móveis é o ___.', answer: 'piano' },
  { text: 'A única letra que não aparece em nenhum nome de estado dos EUA é o ___.', answer: 'Q' },
  { text: 'O maior número que se pode contar usando só os dedos de uma mão, em binário, é ___.', answer: '31' },
  { text: 'O som que o pato faz, segundo o mito, não produz ___.', answer: 'eco' },
  { text: 'A bandeira que tem mais de quatro cores e é uma das poucas não retangulares é a do ___.', answer: 'Nepal' },
  { text: 'O sabor que a língua humana detecta além de doce, salgado, azedo e amargo é o ___.', answer: 'umami' },
  { text: 'A rainha da Inglaterra tecnicamente é dona de todos os ___ sem dono no Reino Unido.', answer: 'cisnes' },
  { text: 'O metal usado para fazer a maior parte de uma lata de "alumínio" reciclada volta às prateleiras em cerca de 60 ___.', answer: 'dias' },
  { text: 'A cidade mais ao sul do mundo com mais de um milhão de habitantes fica no ___.', answer: 'Chile' },
  { text: 'O nome da fobia de palavras longas é, ironicamente, hipopotomonstrosesquipedaliofobia, com ___ letras.', answer: '44' },
  { text: 'O maior lago de água doce do mundo em volume é o Lago ___.', answer: 'Baikal', alt: ['Baical'] },
  { text: 'A parte do olho que dá a cor a ele se chama ___.', answer: 'íris' },
  { text: 'Uma colher de chá de estrela de nêutrons pesaria cerca de um ___ de toneladas.', answer: 'bilhão' },
  { text: 'O país que consome mais chocolate por pessoa é a ___.', answer: 'Suíça' },
  { text: 'A Mona Lisa não tem ___.', answer: 'sobrancelhas' },

  // ─── Taylor Swift ─────────────────────────────────────────────────────────
  { text: 'O álbum "1989" da Taylor Swift tem esse nome porque é o ___ dela.', answer: 'ano de nascimento', alt: ['ano que nasceu', 'ano de nascimento dela'] },
  { text: 'A Taylor Swift começou a carreira cantando ___.', answer: 'country', alt: ['música country'] },
  { text: 'A Taylor regravou os próprios discos como "(Taylor\'s Version)" porque perdeu os direitos das ___ originais.', answer: 'gravações', alt: ['masters', 'gravacoes'] },
  { text: 'Em 2020 a Taylor lançou de surpresa os álbuns Folklore e ___.', answer: 'Evermore' },
  { text: 'A The Eras Tour se tornou a turnê de maior ___ de todos os tempos.', answer: 'arrecadação', alt: ['bilheteria', 'faturamento', 'arrecadacao'] },
  { text: 'O número da sorte da Taylor Swift é o ___.', answer: '13', alt: ['treze'] },
  { text: 'A Taylor Swift cresceu numa fazenda de árvores de ___ na Pensilvânia.', answer: 'Natal', alt: ['natal'] },

  // ─── PACK PESADO (+18) — fatos reais, do tipo nojento / sexual / mórbido ────
  { tier: 'pesado', text: 'A palavra "orquídea" vem do grego antigo para ___.', answer: 'testículo', alt: ['testiculos', 'testículos', 'testiculo'] },
  { tier: 'pesado', text: 'A palavra "vagina" vem do latim para ___.', answer: 'bainha', alt: ['bainha de espada'] },
  { tier: 'pesado', text: 'A palavra "esperma" vem do grego para ___.', answer: 'semente' },
  { tier: 'pesado', text: 'O pênis do pato-macho tem o formato de ___.', answer: 'espiral', alt: ['saca-rolha', 'saca rolha', 'saca-rolhas'] },
  { tier: 'pesado', text: 'A equidna, mamífero australiano, tem um pênis com ___ cabeças.', answer: 'quatro' },
  { tier: 'pesado', text: 'O animal com o maior pênis do mundo em proporção ao corpo é a ___.', answer: 'craca', alt: ['cracas', 'barnacle'] },
  { tier: 'pesado', text: 'O zangão (abelha-macho) literalmente ___ e morre logo depois de acasalar com a rainha.', answer: 'explode', alt: ['estoura', 'arrebenta'] },
  { tier: 'pesado', text: 'Os testículos ficam do lado de fora do corpo porque o esperma precisa de uma temperatura mais ___ que a corporal.', answer: 'baixa', alt: ['fria'] },
  { tier: 'pesado', text: 'Estudos recentes contaram cerca de ___ mil terminações nervosas no clitóris.', answer: 'dez', alt: ['10'] },
  { tier: 'pesado', text: 'O composto químico que dá o cheiro característico do sêmen chama-se ___.', answer: 'espermina' },
  { tier: 'pesado', text: 'O hormônio liberado no orgasmo que aumenta o apego entre o casal é a ___.', answer: 'ocitocina', alt: ['oxitocina'] },
  { tier: 'pesado', text: 'A ejaculação masculina pode sair a uma velocidade de até ___ km/h.', answer: '45', alt: ['quarenta e cinco'] },
  { tier: 'pesado', text: 'A pílula anticoncepcional tem uma semana de placebo só para a mulher ___ e o método ser aceito pela Igreja.', answer: 'menstruar', alt: ['sangrar'] },
  { tier: 'pesado', text: 'No Egito Antigo, um método anticoncepcional era um pessário feito com ___ de crocodilo.', answer: 'fezes', alt: ['esterco', 'cocô', 'coco', 'bosta'] },
  { tier: 'pesado', text: 'Segundo a lenda, Cleópatra usava uma cabaça cheia de ___ como um dos primeiros vibradores.', answer: 'abelhas' },
  { tier: 'pesado', text: 'Antes dos testes modernos, injetava-se a urina da mulher numa ___ para descobrir se ela estava grávida.', answer: 'rã', alt: ['sapo', 'ra'] },
  { tier: 'pesado', text: 'A gonorreia ganhou no Brasil o apelido popular de "___" por causa da ardência ao urinar.', answer: 'esquentamento', alt: ['esquentamento venéreo'] },
  { tier: 'pesado', text: 'A cocaína fazia parte da fórmula original da ___ até 1903.', answer: 'Coca-Cola', alt: ['coca cola', 'coca'] },
  { tier: 'pesado', text: 'Os vitorianos vendiam ___ radioativo como creme de beleza e "tônico de vigor".', answer: 'rádio', alt: ['radium'] },
  { tier: 'pesado', text: 'A lobotomia mais comum era feita enfiando um picador de gelo pela órbita do olho até o lobo ___.', answer: 'frontal' },
  { tier: 'pesado', text: 'O sangue azul do ___ é usado até hoje para testar contaminação bacteriana em vacinas e remédios.', answer: 'caranguejo-ferradura', alt: ['límulo', 'caranguejo ferradura', 'horseshoe crab'] },
  { tier: 'pesado', text: 'Rir forte demais pode, em casos raros, causar uma parada ___.', answer: 'cardíaca', alt: ['do coração', 'cardiaca'] },
  { tier: 'pesado', text: 'Os antigos romanos limpavam a bunda no banheiro público com uma ___ compartilhada presa num cabo.', answer: 'esponja' },
  { tier: 'pesado', text: 'Os romanos usavam ___ humana como enxaguante para clarear os dentes.', answer: 'urina', alt: ['xixi', 'mijo', 'chico'] },
  { tier: 'pesado', text: 'Numa carta famosa, Napoleão pediu que Josefina não ___ nas semanas até ele voltar.', answer: 'tomasse banho', alt: ['se lavasse', 'lavasse'] },
  { tier: 'pesado', text: 'Charles Darwin tinha o hábito de ___ os animais exóticos que descobria.', answer: 'comer', alt: ['comê-los', 'devorar'] },
  { tier: 'pesado', text: 'Fazer muita força sentado no vaso pode parar o coração — essa força chama-se manobra de ___.', answer: 'Valsalva' },
  { tier: 'pesado', text: 'Uma pessoa solta gases, em média, cerca de ___ vezes por dia.', answer: 'quatorze', alt: ['14', 'catorze'] },
  { tier: 'pesado', text: 'O peido pega fogo porque, além de metano, contém ___.', answer: 'hidrogênio', alt: ['gás hidrogênio', 'hidrogenio'] },
  { tier: 'pesado', text: 'O cheiro de ovo podre do peido vem de um gás chamado ___.', answer: 'sulfeto de hidrogênio', alt: ['gás sulfídrico', 'ácido sulfídrico', 'gas sulfidrico', 'acido sulfidrico'] },
  { tier: 'pesado', text: 'A ressaca dá dor de cabeça em parte porque o álcool te faz ___ demais e desidrata.', answer: 'urinar', alt: ['mijar'] },
  { tier: 'pesado', text: 'Um beijo de língua de dez segundos transfere cerca de ___ milhões de bactérias entre as duas bocas.', answer: 'oitenta', alt: ['80'] },
  { tier: 'pesado', text: 'O hipopótamo espalha as próprias fezes girando o ___ como uma hélice.', answer: 'rabo', alt: ['cauda'] },
  { tier: 'pesado', text: 'Os dois compostos que dão o cheiro de cadáver em decomposição são a putrescina e a ___.', answer: 'cadaverina' },
  { tier: 'pesado', text: 'Os gases da decomposição podem inflar o corpo a ponto de ele ___ dentro do caixão.', answer: 'explodir', alt: ['estourar', 'arrebentar'] },
  { tier: 'pesado', text: 'Unhas e cabelo parecem crescer depois da morte só porque a ___ resseca e encolhe.', answer: 'pele' },
  { tier: 'pesado', text: 'O filme pornô mais antigo que se tem registro tem mais de ___ anos.', answer: 'cem', alt: ['100'] },
  { tier: 'pesado', text: 'Segundo o mito popular (que é falso), o homem pensa em sexo a cada ___ segundos.', answer: 'sete', alt: ['7'] },
];

/** The question bank for a given room content tier. `pesado` = every entry. */
export const lorotaQuestions = (tier: ContentTier | undefined): LorotaQuestion[] =>
  tier === 'leve' ? LOROTA_QUESTIONS.filter((q) => q.tier !== 'pesado') : [...LOROTA_QUESTIONS];
