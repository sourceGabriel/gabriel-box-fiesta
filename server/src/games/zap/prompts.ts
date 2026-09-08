import type { ContentTier } from '@party/shared';

/**
 * Original PT-BR prompt bank for Zap!. Written for this repo — not lifted from
 * Quiplash, Jackbox, `rumpus`, or any other deck. Keep them short and open-ended:
 * the funny part is whatever the players type.
 *
 * Two tiers, chosen by the room's `contentTier` (host toggle in the lobby):
 *  - `ZAP_PROMPTS_LEVE`   — crude at most, nothing explicit.
 *  - `ZAP_PROMPTS_PESADO` — the +18 pack: explicit sex, palavrão, escatologia,
 *    humor de forca, drogas, tabu, sátira de figura pública como arquétipo.
 * `pesado` mode plays both lists; `leve` mode plays only the first.
 *
 * Guardrails on the +18 pack (do not cross, even here): never a protected group
 * (raça, religião, orientação, deficiência) as the punchline; never a real private
 * person; nothing sexual involving minors; no graphic sex about a named real
 * person; no real specific atrocity with real victims; nothing written to defame
 * a real named business. `beco torto`-style inside jokes about real venues are
 * for the group to add by hand to this file.
 */

export const ZAP_PROMPTS_LEVE: readonly string[] = [
  'O pior nome possível para um pet',
  'Uma matéria escolar que ninguém pediu',
  'O verdadeiro motivo de o Wi-Fi ter caído',
  'Algo que você NÃO quer ouvir do piloto do avião',
  'A pior frase para começar uma entrevista de emprego',
  'Um superpoder decepcionante',
  'O nome de uma banda de forró tecnológico',
  'Algo que a sua mãe jamais mandaria no grupo da família',
  'Uma regra nova e polêmica para o futebol',
  'O pior brinde possível num casamento',
  'Uma desculpa ruim para chegar atrasado no trabalho',
  'O que os pombos estão planejando',
  'Um sabor de refrigerante que foi cancelado',
  'A pior coisa para encontrar dentro de um pão de queijo',
  'Um feriado nacional que deveria existir',
  'O slogan de uma academia que ninguém quer frequentar',
  'Algo que você diria para um alien tentando impressionar a humanidade',
  'O pior nome para um navio de cruzeiro',
  'Uma habilidade inútil para colocar no currículo',
  'O que realmente acontece quando a luz da geladeira apaga',
  'Um aplicativo que ninguém deveria ter inventado',
  'A pior surpresa de aniversário',
  'Um conselho terrível para quem vai se casar amanhã',
  'O que o seu vizinho faz às 3 da manhã',
  'Uma placa de trânsito que faltou inventar',
  'O pior tema para uma festa infantil',
  'Algo que estraga qualquer churrasco',
  'Uma frase que soa bem até você pensar dois segundos',
  'O nome de um perfume que ninguém compraria',
  'A pior maneira de terminar um namoro',
  'Um novo esporte olímpico duvidoso',
  'O que o cachorro está pensando enquanto te encara',
  'Uma pergunta perigosa para fazer no primeiro encontro',
  'O pior recheio para um bolo de casamento',
  'Uma tradição de família que precisa acabar',
  'O que estava escrito no bilhete que o professor rasgou',
  'Um motivo ridículo para chamar o síndico',
  'A pior frase para vir dentro de um biscoito da sorte',
  'Algo que você encontraria na mochila de um vilão',
  'Um nome de fantasia para o pessoal do RH',
  'O pior presente de amigo secreto de R$ 20',
  'Uma manchete de jornal que ninguém quer ler no domingo',
  'O que o motorista de app comenta assim que você fecha a porta',
  'Uma atualização de celular que ninguém aprovou',
  'A pior forma de acordar alguém',
  'Um novo imposto absurdo',
  'O que a estátua da praça faria se pudesse andar por uma hora',
  'Uma frase de para-choque de caminhão que deu errado',
  'O pior lugar para guardar as chaves de casa',
  'Algo que você diria para escapar de uma reunião',
  'Um cheiro que deveria ser proibido no transporte público',
  'O nome do próximo furacão brasileiro',
  'Uma promessa de político que daria pra cumprir de verdade',
  'O que o elevador diria se estivesse cansado',
];

export const ZAP_PROMPTS_PESADO: readonly string[] = [
  'A pior hora para o preservativo estourar',
  'Uma frase que mata o clima na cama na hora',
  'O nome de um puteiro temático que daria certo',
  'Algo que você NÃO quer que o crush descubra no seu histórico',
  'A desculpa mais esfarrapada para não usar camisinha',
  'O pior lugar do corpo para tatuar o nome da ex',
  'Uma fantasia sexual que ninguém tem coragem de admitir no grupo',
  'O que realmente estava naquele vídeo que você mandou sem querer no grupo da família',
  'A pior coisa para o médico dizer segurando o resultado do exame',
  'Um motivo constrangedor para ter ido parar no pronto-socorro',
  'O último pensamento de alguém antes de fazer uma burrada fatal',
  'Uma cláusula estranha para colocar no próprio testamento',
  'O pior elogio possível durante o sexo',
  'Algo que você grita sem querer no meio de um orgasmo e se arrepende',
  'Uma placa que faltava na porta do banheiro do bar',
  'O nome de um aplicativo de pegação que seria banido no primeiro dia',
  'A pior forma de descobrir que foi corno',
  'Um brinde sincero demais para um velório',
  'O que o motorista de app ouviu você fazer no banco de trás',
  'Uma matéria que deveriam ensinar na escola mas dá cadeia',
  'O pior nome artístico para um ator pornô brasileiro',
  'Algo que fica muito pior quando dito pela sua avó',
  'A verdadeira razão de o padre ter pedido para conversar depois da missa',
  'Um fetiche que você fingiu ter para não decepcionar alguém',
  'O que estava escrito no bilhete que veio junto com a herança',
  'A pior coisa para encontrar no quarto dos seus pais',
  'Uma frase para terminar um relacionamento por mensagem de voz',
  'O motivo real de você ter sido demitido, mas na versão honesta',
  'Algo que só parece crime porque você explicou mal',
  'O que o urologista anotou no prontuário e não te contou',
  'Uma tradição de Natal que acaba sempre em briga de família e polícia',
  'O pior momento para o vibrador ligar sozinho na bolsa',
  'O que rolou no after que ninguém pode contar pra namorada de ninguém',
  'O nome do drink da promoção de quarta que ninguém sabe o que leva dentro',
  'O que o político genérico prometeu no palanque e ninguém cobrou depois',
  'O que a popstar internacional joga pra plateia em vez de rosas',
  'A letra verdadeira do hit do momento se fosse honesta',
  'A pior coisa para sentir o gosto no meio de um oral',
  'O que o cachorro comeu escondido no quintal e devolveu no seu tapete',
  'A frase de Tinder que garante que você vai morrer sozinho',
  'O que exatamente tinha no cigarro que te ofereceram na festa',
  'A desculpa que você deu pro RH depois que o vídeo vazou',
  'O que o urologista viu na consulta e nunca vai conseguir desver',
  'O último Stories da pessoa antes de ela sumir do mapa',
  'A fantasia que o casal tentou uma vez e nunca mais tocou no assunto',
  'O que o coveiro comenta baixinho enquanto trabalha',
  'A pior coisa para descobrir sobre o seu affair no meio da transa',
  'O que a vovó guardava no criado-mudo e a família fingiu não ver',
  'O motivo pelo qual o seu plano de saúde te cancelou',
  'A frase que o padre não esperava ouvir do outro lado do confessionário',
  'O que o entregador flagrou pela janela ao deixar o pedido',
  'A verdadeira composição da linguiça daquele espetinho de esquina',
  'O que o cara mandou de nude e devia ter pensado mais dez minutos',
  'O plano de aposentadoria de quem nunca fez plano de aposentadoria',
  'O que sai do subwoofer do vizinho às 4 da manhã',
  'A frase que encerra a terapia de casal já na primeira sessão',
  'O que o segurança da balada revistou e preferiu devolver na hora',
  'A pior herança que um parente distante pode te deixar',
  'O que a inteligência artificial vai fazer com a nossa pasta de fotos',
  'A pergunta que você NÃO faz durante um teste de DST',
  'O que o enfermeiro do plantão de sábado já viu chegar entalado',
  'A verdade sobre o que aconteceu na despedida de solteiro',
  'O que você faria com uma mala de dinheiro e nenhuma câmera por perto',
  'A real função daquele cômodo sempre trancado na casa dos sogros',
  'O que o motorista de app fingiu não escutar no banco de trás',
];

/** The prompt bank for a given room content tier. `pesado` = both lists. */
export const zapPrompts = (tier: ContentTier | undefined): string[] =>
  tier === 'leve' ? [...ZAP_PROMPTS_LEVE] : [...ZAP_PROMPTS_LEVE, ...ZAP_PROMPTS_PESADO];

/** @deprecated kept for any external reference — use `zapPrompts(tier)`. */
export const ZAP_PROMPTS: readonly string[] = [...ZAP_PROMPTS_LEVE, ...ZAP_PROMPTS_PESADO];
