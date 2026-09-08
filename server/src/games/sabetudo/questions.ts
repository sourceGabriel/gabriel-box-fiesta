import type { ContentTier } from '@party/shared';

/**
 * Original PT-BR multiple-choice bank for Sabe-Tudo. Written for this repo — not
 * lifted from any quiz deck.
 *
 * `options[correct]` is the right answer AS WRITTEN HERE; the engine shuffles the
 * four options per question per match, so the position does not matter. Keep every
 * question to exactly four options.
 *
 * `tier: 'pesado'` marks a +18 entry (morbid / crude / drugs / sex / história-macabra).
 * Still a genuinely verifiable fact so the quiz rewards knowing the answer. The
 * room's `contentTier` decides whether those are dealt: `leve` skips them, `pesado`
 * deals everything.
 *
 * The engine shuffles the resulting list per match and reshuffles when it runs out.
 */
export type SabeTudoQuestion = {
  text: string;
  options: readonly [string, string, string, string];
  /** Index into `options` of the correct answer, as written here. */
  correct: number;
  category: string;
  tier?: 'pesado';
};

export const SABETUDO_QUESTIONS: readonly SabeTudoQuestion[] = [
  // ─── Geral ────────────────────────────────────────────────────────────────
  { text: 'Qual é o maior planeta do Sistema Solar?', options: ['Júpiter', 'Saturno', 'Netuno', 'Terra'], correct: 0, category: 'Ciência' },
  { text: 'Quantos ossos tem, em média, o corpo humano adulto?', options: ['206', '152', '300', '246'], correct: 0, category: 'Corpo humano' },
  { text: 'Qual país tem o território com formato parecido a uma bota?', options: ['Itália', 'Grécia', 'Portugal', 'Croácia'], correct: 0, category: 'Geografia' },
  { text: 'Quem pintou o teto da Capela Sistina?', options: ['Michelangelo', 'Leonardo da Vinci', 'Rafael', 'Caravaggio'], correct: 0, category: 'Arte' },
  { text: 'Qual é o menor país do mundo em área?', options: ['Vaticano', 'Mônaco', 'Nauru', 'San Marino'], correct: 0, category: 'Geografia' },
  { text: 'Qual gás as plantas absorvem do ar na fotossíntese?', options: ['Gás carbônico', 'Oxigênio', 'Nitrogênio', 'Hidrogênio'], correct: 0, category: 'Ciência' },
  { text: 'Em que ano um ser humano pisou na Lua pela primeira vez?', options: ['1969', '1961', '1972', '1959'], correct: 0, category: 'História' },
  { text: 'Qual é o rio mais extenso do Brasil?', options: ['Amazonas', 'São Francisco', 'Paraná', 'Tocantins'], correct: 0, category: 'Geografia' },
  { text: 'Quantos jogadores de cada time ficam em quadra no vôlei?', options: ['6', '5', '7', '11'], correct: 0, category: 'Esporte' },
  { text: 'Qual metal é líquido à temperatura ambiente?', options: ['Mercúrio', 'Chumbo', 'Ferro', 'Alumínio'], correct: 0, category: 'Ciência' },
  { text: 'Qual é a capital da Austrália?', options: ['Camberra', 'Sydney', 'Melbourne', 'Perth'], correct: 0, category: 'Geografia' },
  { text: 'Quem escreveu "Dom Casmurro"?', options: ['Machado de Assis', 'José de Alencar', 'Jorge Amado', 'Graciliano Ramos'], correct: 0, category: 'Literatura' },
  { text: 'Qual planeta é conhecido como Planeta Vermelho?', options: ['Marte', 'Vênus', 'Júpiter', 'Mercúrio'], correct: 0, category: 'Ciência' },
  { text: 'Quantos lados tem um hexágono?', options: ['6', '5', '7', '8'], correct: 0, category: 'Matemática' },
  { text: 'Qual é o maior oceano da Terra?', options: ['Pacífico', 'Atlântico', 'Índico', 'Ártico'], correct: 0, category: 'Geografia' },
  { text: 'Qual animal é o símbolo da ONG WWF?', options: ['Panda', 'Tigre', 'Elefante', 'Golfinho'], correct: 0, category: 'Cultura' },
  { text: 'Qual é a moeda oficial do Japão?', options: ['Iene', 'Won', 'Yuan', 'Baht'], correct: 0, category: 'Mundo' },
  { text: 'Quem foi o primeiro presidente do Brasil?', options: ['Deodoro da Fonseca', 'Getúlio Vargas', 'Prudente de Morais', 'Floriano Peixoto'], correct: 0, category: 'História' },
  { text: 'Qual instrumento musical tem 88 teclas?', options: ['Piano', 'Acordeão', 'Órgão de tubos', 'Cravo'], correct: 0, category: 'Música' },
  { text: 'Qual é o osso mais longo do corpo humano?', options: ['Fêmur', 'Tíbia', 'Úmero', 'Rádio'], correct: 0, category: 'Corpo humano' },
  { text: 'Qual continente é o mais populoso?', options: ['Ásia', 'África', 'Europa', 'América'], correct: 0, category: 'Geografia' },
  { text: 'Quantos corações tem um polvo?', options: ['3', '1', '2', '8'], correct: 0, category: 'Ciência' },
  { text: 'Qual é a velocidade aproximada da luz no vácuo?', options: ['300 mil km/s', '30 mil km/s', '3 milhões km/s', '300 km/s'], correct: 0, category: 'Ciência' },
  { text: 'Qual pintor famoso cortou parte da própria orelha?', options: ['Van Gogh', 'Picasso', 'Monet', 'Dalí'], correct: 0, category: 'Arte' },
  { text: 'Qual é o maior deserto quente do mundo?', options: ['Saara', 'Gobi', 'Atacama', 'Kalahari'], correct: 0, category: 'Geografia' },
  { text: 'Qual seleção masculina tem mais títulos de Copa do Mundo?', options: ['Brasil', 'Alemanha', 'Itália', 'Argentina'], correct: 0, category: 'Esporte' },
  { text: 'Qual elemento químico tem o símbolo "O"?', options: ['Oxigênio', 'Ouro', 'Ósmio', 'Oganessônio'], correct: 0, category: 'Ciência' },
  { text: 'Quantos minutos tem o tempo normal de uma partida de futebol?', options: ['90', '80', '100', '120'], correct: 0, category: 'Esporte' },
  { text: 'Qual é a língua com mais falantes nativos no mundo?', options: ['Mandarim', 'Inglês', 'Espanhol', 'Hindi'], correct: 0, category: 'Mundo' },
  { text: 'Qual planeta tem o sistema de anéis mais visível?', options: ['Saturno', 'Júpiter', 'Urano', 'Netuno'], correct: 0, category: 'Ciência' },
  { text: 'Quem formulou a Teoria da Relatividade?', options: ['Albert Einstein', 'Isaac Newton', 'Niels Bohr', 'Galileu Galilei'], correct: 0, category: 'Ciência' },
  { text: 'Qual é o maior animal que já existiu na Terra?', options: ['Baleia-azul', 'Elefante-africano', 'Cachalote', 'Argentinossauro'], correct: 0, category: 'Ciência' },
  { text: 'Em qual cidade fica a Torre Eiffel?', options: ['Paris', 'Londres', 'Roma', 'Berlim'], correct: 0, category: 'Geografia' },
  { text: 'Qual vitamina o corpo produz ao tomar sol?', options: ['Vitamina D', 'Vitamina C', 'Vitamina A', 'Vitamina B12'], correct: 0, category: 'Corpo humano' },
  { text: 'Quantas casas tem um tabuleiro de xadrez?', options: ['64', '81', '100', '49'], correct: 0, category: 'Jogos' },
  { text: 'Qual é o planeta mais próximo do Sol?', options: ['Mercúrio', 'Vênus', 'Terra', 'Marte'], correct: 0, category: 'Ciência' },
  { text: 'Quem escreveu "Romeu e Julieta"?', options: ['William Shakespeare', 'Molière', 'Goethe', 'Dante Alighieri'], correct: 0, category: 'Literatura' },
  { text: 'Qual órgão do corpo humano produz a urina filtrando o sangue?', options: ['Rim', 'Fígado', 'Baço', 'Pâncreas'], correct: 0, category: 'Corpo humano' },
  { text: 'Qual é a capital do Canadá?', options: ['Ottawa', 'Toronto', 'Montreal', 'Vancouver'], correct: 0, category: 'Geografia' },
  { text: 'Quantas cordas tem um violão comum?', options: ['6', '4', '7', '12'], correct: 0, category: 'Música' },
  { text: 'Qual é o maior estado do Brasil em área?', options: ['Amazonas', 'Pará', 'Mato Grosso', 'Bahia'], correct: 0, category: 'Geografia' },
  { text: 'Qual é o único mamífero capaz de voar de verdade?', options: ['Morcego', 'Esquilo-voador', 'Colugo', 'Bugio'], correct: 0, category: 'Ciência' },

  // ─── PACK PESADO (+18) — fatos reais, do tipo mórbido / nojento / sexo / drogas ──
  { tier: 'pesado', text: 'Qual bactéria causou a Peste Negra que dizimou a Europa medieval?', options: ['Yersinia pestis', 'Escherichia coli', 'Vibrio cholerae', 'Clostridium tetani'], correct: 0, category: 'História macabra' },
  { tier: 'pesado', text: 'O que os antigos romanos usavam como enxaguante bucal para clarear os dentes?', options: ['Urina', 'Vinagre de vinho', 'Cinza de madeira', 'Mel diluído'], correct: 0, category: 'Nojeira histórica' },
  { tier: 'pesado', text: 'Qual droga a Bayer vendeu como xarope para tosse (inclusive infantil) no fim do século 19?', options: ['Heroína', 'Cocaína', 'Morfina', 'Ópio'], correct: 0, category: 'Drogas' },
  { tier: 'pesado', text: 'Qual animal tem o maior pênis do mundo em proporção ao próprio corpo?', options: ['Craca', 'Baleia-azul', 'Elefante-africano', 'Pato-selvagem'], correct: 0, category: 'Bizarrices animais' },
  { tier: 'pesado', text: 'No embalsamamento egípcio, por onde o cérebro era retirado do corpo?', options: ['Pelo nariz', 'Pela boca', 'Por um corte no crânio', 'Pelos ouvidos'], correct: 0, category: 'História macabra' },
  { tier: 'pesado', text: 'Qual método de execução foi usado pela última vez na França em 1977?', options: ['Guilhotina', 'Cadeira elétrica', 'Enforcamento', 'Fuzilamento'], correct: 0, category: 'História macabra' },
  { tier: 'pesado', text: 'Quais dois compostos dão o cheiro característico de um corpo em decomposição?', options: ['Putrescina e cadaverina', 'Amônia e cloro', 'Metano e etanol', 'Ácido láctico e ureia'], correct: 0, category: 'Ciência mórbida' },
  { tier: 'pesado', text: 'Qual bebida alcoólica era distribuída todo dia aos marinheiros da Marinha Real Britânica até 1970?', options: ['Rum', 'Uísque', 'Gim', 'Conhaque'], correct: 0, category: 'História' },
  { tier: 'pesado', text: 'Qual inseto costuma ser o primeiro a colonizar um cadáver e ajuda a estimar a hora da morte?', options: ['Mosca-varejeira', 'Barata', 'Formiga-lava-pés', 'Besouro-rola-bosta'], correct: 0, category: 'Ciência mórbida' },
  { tier: 'pesado', text: 'O que os romanos compartilhavam num banheiro público para se limpar depois de cagar?', options: ['Uma esponja presa num cabo', 'Folhas de figueira', 'Panos de linho', 'Apenas água corrente'], correct: 0, category: 'Nojeira histórica' },
  { tier: 'pesado', text: 'Qual órgão uma pessoa viva pode doar e continuar vivendo normalmente?', options: ['Um dos rins', 'O coração', 'O fígado inteiro', 'Os dois pulmões'], correct: 0, category: 'Corpo humano' },
  { tier: 'pesado', text: 'Qual infecção sexualmente transmissível voltou a assustar por criar cepas resistentes a quase todos os antibióticos?', options: ['Gonorreia', 'Herpes genital', 'HPV', 'Sífilis'], correct: 0, category: 'Saúde +18' },
  { tier: 'pesado', text: 'No Egito Antigo, que material entrava na receita de um dos primeiros métodos anticoncepcionais?', options: ['Fezes de crocodilo', 'Pó de ouro', 'Leite de cabra', 'Cera de abelha'], correct: 0, category: 'Sexo & história' },
  { tier: 'pesado', text: 'Qual rei francês, o "Rei-Sol", tinha fama de tomar banho pouquíssimas vezes na vida?', options: ['Luís XIV', 'Luís XVI', 'Henrique IV', 'Francisco I'], correct: 0, category: 'História' },
  { tier: 'pesado', text: 'Antes dos testes de farmácia, a urina da mulher era injetada em qual animal para diagnosticar gravidez?', options: ['Rã', 'Coelho branco', 'Rato', 'Galinha'], correct: 0, category: 'Ciência bizarra' },
  { tier: 'pesado', text: 'A palavra "orquídea" vem do grego antigo para qual parte do corpo?', options: ['Testículo', 'Coração', 'Olho', 'Língua'], correct: 0, category: 'Curiosidades +18' },
  { tier: 'pesado', text: 'Qual veneno foi usado por espiões e assassinatos famosos por caber na ponta de um guarda-chuva?', options: ['Ricina', 'Cianeto', 'Arsênico', 'Estricnina'], correct: 0, category: 'História macabra' },
  { tier: 'pesado', text: 'Qual parte do tubarão-da-groenlândia é comida fermentada na Islândia, apesar de cheirar a amônia (mijo)?', options: ['A carne (hákarl)', 'As brânquias', 'O fígado', 'A cartilagem'], correct: 0, category: 'Comida nojenta' },
  { tier: 'pesado', text: 'A cocaína fazia parte da fórmula original de qual refrigerante até 1903?', options: ['Coca-Cola', 'Guaraná Antarctica', 'Pepsi', 'Fanta'], correct: 0, category: 'Drogas' },
  { tier: 'pesado', text: 'De onde vem a palavra "vagina", no latim?', options: ['Bainha (de espada)', 'Flor', 'Caverna', 'Fonte'], correct: 0, category: 'Curiosidades +18' },
  { tier: 'pesado', text: 'O que acontece com o zangão (abelha-macho) logo depois de acasalar com a rainha?', options: ['O órgão sexual se rompe e ele morre', 'Ele vira operário', 'Ele produz mel', 'Ele hiberna'], correct: 0, category: 'Bizarrices animais' },
  { tier: 'pesado', text: 'Quantas terminações nervosas estudos recentes contaram no clitóris?', options: ['Cerca de 10 mil', 'Cerca de 800', 'Cerca de 2 mil', 'Cerca de 50 mil'], correct: 0, category: 'Corpo humano' },
  { tier: 'pesado', text: 'A pílula anticoncepcional tem uma semana de placebo principalmente para quê?', options: ['A mulher menstruar e o método ser aceito pela Igreja', 'Dar uma folga ao fígado', 'Aumentar a fertilidade depois', 'Reduzir o custo'], correct: 0, category: 'Sexo & história' },
  { tier: 'pesado', text: 'Os vitorianos vendiam qual material radioativo como creme de beleza e tônico de "vigor"?', options: ['Rádio', 'Urânio', 'Plutônio', 'Tório'], correct: 0, category: 'História macabra' },
  { tier: 'pesado', text: 'O sangue azul de qual animal é usado até hoje para testar contaminação em vacinas?', options: ['Caranguejo-ferradura', 'Polvo', 'Lula', 'Água-viva'], correct: 0, category: 'Ciência bizarra' },
  { tier: 'pesado', text: 'A lobotomia transorbital era feita enfiando um picador de gelo pela órbita do olho até qual parte do cérebro?', options: ['O lobo frontal', 'O cerebelo', 'O tronco encefálico', 'O lobo occipital'], correct: 0, category: 'História macabra' },
  { tier: 'pesado', text: 'Além do metano, qual gás inflamável está presente no peido humano?', options: ['Hidrogênio', 'Hélio', 'Oxigênio', 'Nitrogênio'], correct: 0, category: 'Corpo humano' },
  { tier: 'pesado', text: 'Qual apelido popular a gonorreia ganhou no Brasil por causa da ardência ao urinar?', options: ['Esquentamento', 'Fogo selvagem', 'Corrimento frio', 'Cistite brava'], correct: 0, category: 'Saúde +18' },
  { tier: 'pesado', text: 'A que velocidade pode sair a ejaculação masculina?', options: ['Até uns 45 km/h', 'Até uns 5 km/h', 'Até uns 150 km/h', 'Até uns 300 km/h'], correct: 0, category: 'Curiosidades +18' },
];

/** The question bank for a given room content tier. `pesado` = every entry. */
export const sabeTudoQuestions = (tier: ContentTier | undefined): SabeTudoQuestion[] =>
  tier === 'leve' ? SABETUDO_QUESTIONS.filter((q) => q.tier !== 'pesado') : [...SABETUDO_QUESTIONS];
