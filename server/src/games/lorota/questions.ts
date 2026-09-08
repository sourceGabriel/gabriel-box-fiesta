/**
 * Original PT-BR "fato com lacuna" bank for Lorota!. Written for this repo — not
 * lifted from Fibbage, Jackbox, `rumpus`, or any other deck.
 *
 * `text` contains a single `___` blank. `answer` is the real answer; `alt` lists
 * other spellings that should count as the truth (the engine normalises casing,
 * spacing and trailing punctuation on its own). Keep answers short — one or two
 * words is easiest to bluff around.
 *
 * Two sections: the general bank and the PACK ADULTO (+18) — real facts, but the
 * gross/sexual/morbid kind. Every +18 entry is a genuinely verifiable fact (or a
 * clearly-labelled myth); players still hunt the real answer.
 *
 * The engine shuffles this list per match and reshuffles when it runs out.
 */
export type LorotaQuestion = { text: string; answer: string; alt?: string[] };

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

  // ─── PACK ADULTO (+18) ──────────────────────────────────────────────────────
  { text: 'A palavra "orquídea" vem do grego antigo para ___.', answer: 'testículo', alt: ['testiculos', 'testículos', 'testiculo'] },
  { text: 'A palavra "vagina" vem do latim para ___.', answer: 'bainha', alt: ['bainha de espada'] },
  { text: 'O pênis do pato-macho tem o formato de ___.', answer: 'espiral', alt: ['saca-rolha', 'saca rolha', 'saca-rolhas'] },
  { text: 'A equidna, mamífero australiano, tem um pênis com ___ cabeças.', answer: 'quatro' },
  { text: 'O animal com o maior pênis do mundo em proporção ao corpo é a ___.', answer: 'craca', alt: ['cracas', 'barnacle'] },
  { text: 'Os testículos ficam do lado de fora do corpo porque o esperma precisa de uma temperatura mais ___ que a corporal.', answer: 'baixa', alt: ['fria'] },
  { text: 'Estudos recentes contaram cerca de ___ mil terminações nervosas no clitóris.', answer: 'dez', alt: ['10'] },
  { text: 'O composto químico que dá o cheiro característico do sêmen chama-se ___.', answer: 'espermina' },
  { text: 'No Egito Antigo, um método anticoncepcional era um pessário feito com ___ de crocodilo.', answer: 'fezes', alt: ['esterco', 'cocô', 'coco', 'bosta'] },
  { text: 'Antes dos testes modernos, injetava-se a urina da mulher numa ___ para descobrir se ela estava grávida.', answer: 'rã', alt: ['sapo', 'ra'] },
  { text: 'Os antigos romanos limpavam a bunda no banheiro público com uma ___ compartilhada presa num cabo.', answer: 'esponja' },
  { text: 'Os romanos usavam ___ humana como enxaguante para clarear os dentes.', answer: 'urina', alt: ['xixi', 'mijo', 'chico'] },
  { text: 'Os romanos tinham uma deusa que protegia a rede de esgotos, chamada ___.', answer: 'Cloacina', alt: ['Cloaca'] },
  { text: 'Numa carta famosa, Napoleão pediu que Josefina não ___ nas semanas até ele voltar.', answer: 'tomasse banho', alt: ['se lavasse', 'tomasse banho ', 'lavasse'] },
  { text: 'Charles Darwin tinha o hábito de ___ os animais exóticos que descobria.', answer: 'comer', alt: ['comê-los', 'devorar'] },
  { text: 'Fazer muita força sentado no vaso pode parar o coração — essa força chama-se manobra de ___.', answer: 'Valsalva' },
  { text: 'Uma pessoa solta gases, em média, cerca de ___ vezes por dia.', answer: 'quatorze', alt: ['14', 'catorze'] },
  { text: 'O cheiro de ovo podre do peido vem de um gás chamado ___.', answer: 'sulfeto de hidrogênio', alt: ['gás sulfídrico', 'acido sulfidrico', 'ácido sulfídrico', 'gas sulfidrico'] },
  { text: 'Um beijo de língua de dez segundos transfere cerca de ___ milhões de bactérias entre as duas bocas.', answer: 'oitenta', alt: ['80'] },
  { text: 'O hipopótamo espalha as próprias fezes girando o ___ como uma hélice.', answer: 'rabo', alt: ['cauda'] },
  { text: 'Os dois compostos que dão o cheiro de cadáver em decomposição são a putrescina e a ___.', answer: 'cadaverina' },
  { text: 'Unhas e cabelo parecem crescer depois da morte só porque a ___ resseca e encolhe.', answer: 'pele' },
  { text: 'Segundo o mito popular (que é falso), o homem pensa em sexo a cada ___ segundos.', answer: 'sete', alt: ['7'] },
];
