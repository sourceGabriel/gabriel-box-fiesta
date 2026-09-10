# PROMPT MESTRE — PLATAFORMA DE PARTY GAMES MULTIPLAYER LOCAL

Quero desenvolver uma plataforma de party games multiplayer inspirada na experiência de jogos como Jackbox Party Pack.

O primeiro jogo da plataforma será um jogo de cartas inspirado diretamente nas regras do UNO, utilizado como MVP para validar toda a infraestrutura multiplayer.

O projeto deve nascer com uma arquitetura que permita posteriormente adicionar diversos outros party games sem precisar reconstruir o sistema de salas, jogadores, comunicação em tempo real, sessões, reconexão e infraestrutura.

---

# 1. SEU PAPEL

Atue como uma equipe completa de desenvolvimento composta por:

* Software Architect
* Senior Full Stack Developer
* Backend Developer
* Frontend Developer
* Game Developer
* Multiplayer/Realtime Systems Engineer
* UX/UI Designer
* QA Engineer
* DevOps Engineer
* Security Engineer

Você deve tomar decisões técnicas como um profissional experiente, mas sempre priorizando:

1. simplicidade;
2. código limpo;
3. baixo acoplamento;
4. facilidade de manutenção;
5. facilidade para adicionar novos jogos;
6. funcionamento local sem internet;
7. baixa latência;
8. segurança;
9. testes automatizados;
10. possibilidade de evolução futura para internet/cloud.

Não introduza complexidade prematuramente.

Não utilize microsserviços no MVP.

Não utilize Kubernetes no MVP.

Não utilize Kafka no MVP.

Não utilize Redis no MVP.

Não utilize banco de dados no MVP.

O estado da partida inicialmente deve permanecer em memória.

A arquitetura deve permitir adicionar essas tecnologias futuramente caso sejam necessárias.

---

# 2. OBJETIVO DO PRODUTO

Quero criar uma experiência em que:

* um computador funciona como servidor e tela principal do jogo;
* a tela do computador pode ser conectada a uma TV;
* os jogadores utilizam seus celulares como controles;
* os celulares acessam uma aplicação web;
* os jogadores entram na sala através de QR Code ou código;
* o servidor mantém o estado oficial da partida;
* o servidor sincroniza os jogadores e a tela principal através de comunicação em tempo real;
* cada jogador recebe somente as informações privadas que pode visualizar;
* a tela principal recebe informações suficientes para apresentar a partida;
* as animações são executadas pelo cliente da tela principal;
* o jogador nunca pode alterar diretamente o estado do jogo;
* toda ação enviada pelo celular deve ser validada pelo servidor.

Inicialmente o sistema funcionará SOMENTE em rede local.

Não depender de internet.

Deve funcionar através de:

* Wi-Fi convencional;
* hotspot criado pelo computador.

Posteriormente poderá existir uma versão online.

---

# 3. STACK TECNOLÓGICA

Utilize inicialmente:

## Backend

* Node.js
* TypeScript

## Frontend

* React
* TypeScript

## Comunicação

* WebSocket

Pode utilizar uma biblioteca madura para WebSocket caso isso simplifique significativamente o projeto.

Analise e escolha uma biblioteca apropriada, mas não complique a arquitetura.

## Host

O HOST é uma aplicação web React executada no computador.

Ela funciona como:

* tela principal;
* console administrativo;
* interface da partida.

## Mobile

A interface dos jogadores também será uma aplicação React responsiva.

Inicialmente não criar aplicativo nativo.

Os jogadores acessam pelo navegador do celular.

## Build

Utilizar ferramentas modernas e simples para desenvolvimento TypeScript/React.

Escolha uma estrutura que permita compartilhar tipos entre backend, host e mobile.

---

# 4. PRINCÍPIO ARQUITETURAL FUNDAMENTAL

O servidor é a autoridade absoluta da partida.

Nunca confiar no cliente.

O celular NÃO decide:

* se uma carta é válida;
* quem é o próximo jogador;
* qual é a pontuação;
* qual é a cor atual;
* quantas cartas o jogador possui;
* se uma ação pode ser realizada;
* quando uma rodada termina.

O servidor decide tudo.

Fluxo:

```text
MOBILE
   |
   | Action
   v
SERVER
   |
   | valida ação
   |
   | altera GameState
   |
   | gera eventos
   v
HOST + MOBILE
```

---

# 5. ARQUITETURA GERAL

Estruture o sistema conceitualmente assim:

```text
party-game/
│
├── server/
│
│   ├── core/
│   │   ├── Room
│   │   ├── Player
│   │   ├── Session
│   │   ├── Connection
│   │   ├── Game
│   │   ├── GameState
│   │   ├── Events
│   │   └── Timer
│   │
│   ├── games/
│   │   └── uno/
│   │       ├── UnoGame
│   │       ├── UnoState
│   │       ├── UnoRules
│   │       ├── UnoCard
│   │       ├── UnoEvents
│   │       └── UnoActions
│   │
│   ├── websocket/
│   └── server/
│
├── shared/
│   ├── events/
│   ├── models/
│   └── protocol/
│
├── host/
│   ├── screens/
│   ├── components/
│   └── animations/
│
└── mobile/
    ├── screens/
    ├── components/
    └── controls/
```

A estrutura pode ser modificada se você encontrar uma organização melhor.

Explique qualquer alteração importante.

---

# 6. CONCEITO DE GAME ENGINE

Crie uma abstração de jogo que permita:

```text
Game
 ├── start()
 ├── handleAction()
 ├── getState()
 ├── getPublicState()
 ├── getPrivateState(playerId)
 └── getEvents()
```

O UNO deve ser apenas uma implementação dessa abstração.

Futuramente poderemos ter:

```text
games/
├── uno/
├── quiz/
├── drawing/
├── voting/
├── word/
└── future-game/
```

O sistema de salas, jogadores, WebSocket e reconexão não deve depender das regras específicas do UNO.

---

# 7. SALAS

Cada computador terá inicialmente somente UMA sala ativa.

A sala possuirá:

* roomId;
* código curto;
* jogadores;
* owner;
* estado da partida;
* game;
* conexões;
* informações necessárias para reconexão.

Exemplo:

```text
Room
 ├── id
 ├── code
 ├── ownerPlayerId
 ├── players[]
 ├── game
 └── connections
```

---

# 8. ENTRADA NA SALA

O HOST deve mostrar:

```text
========================

          UNO

         AB7K

       [ QR CODE ]

Escaneie para entrar

========================
```

O QR Code deve apontar para o endereço local do computador.

Exemplo:

```text
http://192.168.0.10:3000/join/AB7K
```

Não assumir que esse IP é fixo.

O sistema deve descobrir/usar o endereço local apropriado.

O jogador também poderá inserir manualmente o código.

---

# 9. JOGADORES

Entre 2 e 8 jogadores.

> **Revisado pelo dono em 2026-09-10.** "2–8" era o range do MVP de UNO. Hoje
> cada jogo declara o próprio `minPlayers`/`maxPlayers` no plugin (Coup e Dilema
> já vão a 10). Não trate 8 como teto da plataforma.

Inicialmente não haverá contas.

O jogador informa apenas:

```text
Nome
[ Gabriel ]

[ ENTRAR ]
```

O nome identifica o jogador durante a sessão.

Evitar dois jogadores simultaneamente com o mesmo nome.

---

# 10. OWNER

O primeiro jogador que entrar na sala será o OWNER.

O owner poderá:

* iniciar a partida;
* pausar;
* continuar;
* reiniciar;
* encerrar;
* expulsar jogadores.

O computador também terá acesso aos controles administrativos.

Se o owner desconectar:

* escolher automaticamente outro jogador conectado;
* transferir o ownership;
* preservar a partida.

---

# 11. RECONEXÃO

A reconexão é requisito obrigatório.

Se um jogador perder a conexão:

* não remover imediatamente seu estado;
* manter sua mão;
* manter sua identidade;
* permitir reconexão;
* restaurar seu estado privado;
* permitir continuar jogando.

Se o jogador retornar durante a mesma partida utilizando o mesmo nome/sessão válida, deve recuperar:

* sua identidade;
* suas cartas;
* sua posição;
* seu estado.

Não criar uma nova mão.

Não permitir que outro jogador se passe por ele.

Projetar um mecanismo de session token adequado.

Não utilizar somente o nickname como mecanismo de autenticação real.

---

# 12. HOST

O HOST é uma conexão especial.

Ele não é um jogador.

O HOST:

* exibe o jogo;
* exibe jogadores;
* exibe cartas públicas;
* executa animações;
* exibe mensagens;
* possui controles administrativos;
* pode reiniciar/encerrar a partida.

A tela deve funcionar em:

* navegador de PC;
* monitor;
* TV conectada ao PC.

Aspect ratio principal:

16:9.

Resolução de referência:

1920x1080.

---

# 13. MOBILE

Cada jogador utiliza seu celular como controle.

O celular deve mostrar somente informações permitidas para aquele jogador.

Exemplo:

```text
====================

      SUA VEZ

🟥7 🟥2 🟦5 🟩9
🟨3 🟨8 🟦+2

Carta selecionada:
🟥7

[ JOGAR ]

[ COMPRAR ]

====================
```

Quando não for a vez do jogador:

* cartas continuam visíveis;
* cartas não podem ser clicadas;
* interface mostra que o jogador está aguardando.

---

# 14. SELEÇÃO DE CARTAS

Ao tocar em uma carta:

* selecionar visualmente;
* destacar a carta;
* permitir tocar novamente para desmarcar;
* mostrar botão JOGAR.

Não jogar automaticamente.

O jogador deve:

```text
selecionar carta
       ↓
[ JOGAR ]
       ↓
servidor
```

Também permitir arrastar cartas caso isso seja útil para UX.

---

# 15. COMPRA

Durante a vez:

```text
[ COMPRAR ]
```

Ao comprar:

* servidor retira carta do monte;
* adiciona à mão privada;
* atualiza estado;
* envia a nova carta ao jogador;
* HOST mostra uma animação de compra;
* a carta NÃO deve ser revelada na tela principal;
* apenas o jogador deve conhecer a carta.

Se a carta comprada for válida:

* jogador pode decidir jogá-la imediatamente.

Se não for válida:

* turno termina.

---

# 16. REGRAS DO UNO

Utilizar as regras tradicionais do UNO como base.

Quantidade inicial:

7 cartas por jogador.

Número de jogadores:

2–8.

Objetivo:

ser o primeiro jogador a ficar sem cartas.

Utilizar:

* cartas numéricas;
* +2;
* Bloqueio;
* Inverter;
* Coringa;
* +4.

A ordem inicial deve ser determinada aleatoriamente.

A direção inicial será horário.

---

# 17. CARTAS

Modele as cartas como entidades, e não como componentes visuais.

Uma carta deve possuir informações como:

```text
Card
 ├── id
 ├── color
 ├── type
 └── value
```

O baralho deve ser gerado programaticamente seguindo a estrutura de um baralho tradicional de UNO.

Não é necessário armazenar fisicamente 108 objetos hardcoded.

---

# 18. MONTE

Ao iniciar:

* gerar baralho;
* embaralhar;
* distribuir 7 cartas para cada jogador;
* criar monte;
* criar descarte.

Quando o monte acabar:

* manter a carta superior do descarte;
* embaralhar as demais cartas do descarte;
* criar novo monte.

---

# 19. DESCARTE

A tela principal deve mostrar claramente:

```text
MONTE          DESCARTE

 🃏              🔴7
```

O descarte deve mostrar a carta atual.

---

# 20. VALIDAÇÃO DE CARTAS

Uma carta pode ser jogada se:

* tiver a mesma cor;
* tiver o mesmo número;
* tiver o mesmo tipo de ação;
* for coringa;
* for +4 respeitando as regras definidas.

A validação deve ocorrer obrigatoriamente no servidor.

Mesmo que o frontend impeça a seleção de cartas inválidas, o backend deve validar novamente.

---

# 21. +2

Ao jogar +2:

* próximo jogador recebe penalidade;
* compra 2;
* perde o turno.

Permitir acúmulo.

Exemplo:

```text
A +2
B +2
C +2
D compra 6
```

---

# 22. +4

Ao jogar +4:

* jogador escolhe nova cor;
* próximo jogador recebe penalidade;
* compra 4;
* perde o turno.

Permitir acúmulo.

Regra específica:

```text
+4 pode responder +2
+2 NÃO pode responder +4
```

Se houver qualquer ambiguidade entre essa regra e as regras tradicionais, essa regra personalizada deve prevalecer.

---

# 23. INVERTER

Inverter muda a direção da partida.

Com dois jogadores, utilizar o comportamento tradicional equivalente a bloqueio.

---

# 24. BLOQUEIO

O próximo jogador perde a vez.

---

# 25. CORINGA

Ao jogar coringa:

O celular deve abrir:

```text
Escolha a cor

🔴  🟡  🟢  🔵
```

A cor só deve ser alterada após confirmação da escolha.

O servidor deve validar toda a operação.

---

# 26. +4

Ao jogar +4:

1. jogar carta;
2. abrir seleção de cor;
3. jogador escolhe;
4. servidor confirma;
5. aplicar efeito;
6. próximo jogador recebe penalidade;
7. HOST executa animação;
8. próximo turno.

---

# 27. UNO

Quando um jogador ficar com exatamente uma carta:

O celular deve mostrar:

```text
        UNO!

     [ UNO! ]
```

O jogador precisa pressionar o botão.

A tela principal deve avisar:

```text
🔥 GABRIEL ESTÁ EM UNO!
```

---

# 28. PENALIDADE DO UNO

Se um jogador estiver com uma carta e não declarar UNO:

Outro jogador pode denunciar.

A janela de denúncia será de 2 rodadas.

Defina tecnicamente como implementar essa janela de forma determinística.

A penalidade deve seguir as regras definidas pelo jogo e ser implementada no servidor.

---

# 29. VITÓRIA E PLACAR

Quando um jogador ficar sem cartas:

* partida/rodada termina;
* executar animação de vitória;
* exibir vencedor;
* calcular pontuação;
* exibir ranking.

O jogo deve possuir sistema de placar.

Não limitar inicialmente a apenas uma rodada.

Estruture o sistema para permitir múltiplas rodadas.

---

# 30. TIMER

Cada turno deverá possuir limite de tempo.

Utilize inicialmente um valor razoável, como 30 segundos, mas torne o valor configurável.

Mostrar:

```text
SUA VEZ

00:27
```

Quando o tempo terminar:

* executar ação automática coerente com as regras;
* não deixar o jogo travado.

O servidor é responsável pelo timer.

Nunca confiar no relógio do celular.

> **Revisado pelo dono em 2026-09-10.** Timer de turno **não é obrigatório** — é
> decisão de cada jogo. O Dilema roda os passos de escolha e o veredito **sem
> deadline** de propósito (couch play — o pessoal debate em voz alta). Quando um
> jogo tem timer, o servidor continua sendo a única autoridade dele
> (`getTimer()` / `onTurnTimeout()`); um jogo sem timer só precisa garantir que
> nunca trava esperando quem saiu (ex.: time esvaziado auto-trava).

---

# 31. SINCRONIZAÇÃO

Utilizar WebSocket.

O servidor deve ser responsável por:

* estado;
* turnos;
* timers;
* cartas;
* pontuação;
* validação;
* eventos.

HOST e MOBILE são clientes.

Não fazer lógica crítica apenas no frontend.

---

# 32. PROTOCOLO

Criar um protocolo de mensagens tipado.

Exemplos conceituais:

```text
JOIN_ROOM
ROOM_JOINED
PLAYER_JOINED
PLAYER_LEFT
PLAYER_RECONNECTED

GAME_START
GAME_STATE
TURN_STARTED
TURN_ENDED

PLAY_CARD
CARD_PLAYED

DRAW_CARD
CARD_DRAWN

CHOOSE_COLOR
COLOR_CHANGED

UNO_CALL
UNO_CALLED
UNO_CHALLENGE

PLAYER_ELIMINATED
ROUND_FINISHED
GAME_FINISHED

GAME_PAUSED
GAME_RESUMED
GAME_RESTARTED

ERROR
```

Não considerar essa lista definitiva.

Analise e crie o protocolo completo.

Todas as mensagens devem ser tipadas.

Utilizar IDs, versões ou mecanismos adequados para evitar problemas com:

* mensagens duplicadas;
* mensagens antigas;
* mensagens fora de ordem;
* ações inválidas;
* reconexão.

---

# 33. GAME STATE

Crie um estado de jogo semelhante a:

```text
GameState
 ├── phase
 ├── players
 ├── deck
 ├── discardPile
 ├── currentPlayerId
 ├── direction
 ├── currentColor
 ├── pendingDraw
 ├── turn
 ├── timer
 ├── round
 └── score
```

Não expor informações privadas indevidamente.

O servidor deve gerar:

```text
PublicGameState
```

e:

```text
PrivatePlayerState
```

Por exemplo:

O HOST pode conhecer a quantidade de cartas de cada jogador, mas não deve receber as cartas privadas de todos os jogadores.

Cada jogador recebe somente sua própria mão.

---

# 34. PRIVACIDADE DAS CARTAS

É proibido enviar a mão completa de todos os jogadores para o frontend.

Exemplo:

Jogador Gabriel recebe:

```text
Gabriel:
🟥7 🟦3 🟩9
```

Mas não recebe:

```text
Maria:
🟨2 🟥+2 🟦8
```

O HOST também não deve precisar conhecer as mãos privadas.

---

# 35. ANIMAÇÕES

Primeiro implementar funcionalmente.

Depois evoluir visualmente.

As animações devem ser executadas principalmente no HOST.

Exemplos futuros:

* carta saindo da mesa;
* carta indo para o descarte;
* compra;
* +2;
* +4;
* bloqueio;
* inverter;
* mudança de cor;
* UNO;
* vitória.

Não transmitir vídeo/animação pela rede.

Enviar eventos semânticos:

```text
CARD_PLAYED
DRAW_CARD
PLAYER_SKIPPED
DIRECTION_CHANGED
COLOR_CHANGED
```

O HOST interpreta esses eventos visualmente.

---

# 36. ORDENAÇÃO ENTRE SERVIDOR E ANIMAÇÃO

Quando uma ação causar uma animação importante:

```text
AÇÃO
 ↓
servidor valida
 ↓
servidor atualiza estado
 ↓
evento enviado
 ↓
HOST inicia animação
 ↓
animação termina
 ↓
HOST solicita/recebe próximo estado
```

Evitar que a interface avance visualmente para o próximo turno antes da animação necessária.

A autoridade continua sendo o servidor.

Não deixar a animação controlar a lógica do jogo.

> **Revisado pelo dono em 2026-09-10.** O handshake desta seção (host termina a
> animação → só então pede/recebe o próximo estado) **não foi implementado e não
> deve ser**: acopla o loop de tick do servidor ao estado de animação do cliente
> e quebra com reconexão / múltiplos clientes. Modelo real: o servidor empurra o
> estado autoritativo no ritmo dele (deadlines que ele mesmo ticka) e o host
> anima **por cima**, sem bloquear, com CSS + `prefers-reduced-motion`. Do texto
> acima só vale a última linha — a animação nunca controla a lógica.

---

# 37. COMPUTADOR / REDE LOCAL

O projeto deve funcionar sem internet.

O servidor deve escutar uma interface acessível pela rede local.

Permitir acesso como:

```text
http://IP_DO_PC:PORTA
```

O HOST pode abrir localmente.

Os celulares acessam o mesmo servidor pela rede Wi-Fi.

Também permitir uso através de hotspot do computador.

Documentar problemas comuns de firewall e como resolvê-los.

---

# 38. QR CODE

Gerar QR Code automaticamente.

O QR Code deve conter a URL local correta.

Exemplo:

```text
http://192.168.1.20:3000/join/AB7K
```

Não depender de domínio externo.

---

# 39. DESCOBERTA DE IP

Implementar uma solução simples para descobrir o endereço IPv4 local apropriado.

Se houver múltiplas interfaces de rede:

* Wi-Fi;
* Ethernet;
* VPN;
* Docker;

não assumir cegamente a primeira interface.

Criar uma forma clara de selecionar ou exibir o endereço que os celulares devem utilizar.

---

# 40. UMA SALA POR COMPUTADOR

Inicialmente:

```text
1 PC
  ↓
1 servidor
  ↓
1 sala
  ↓
2–8 jogadores
```

Não implementar múltiplas salas no MVP.

Porém, estruturar o RoomManager de maneira que isso possa ser expandido futuramente.

---

# 41. BANCO DE DADOS

Não utilizar banco no MVP.

Tudo deve ficar em memória.

Se o servidor reiniciar:

* a partida pode ser perdida;
* não é necessário persistir o jogo inicialmente.

A arquitetura deve permitir adicionar persistência posteriormente.

> **Revisado pelo dono em 2026-09-10.** "Sem banco, em memória" continua valendo.
> Mas um **snapshot em arquivo único** (um JSON no disco reescrito a cada
> transição de estado e relido no boot) **não conta como banco** e cabe no
> "permitir persistência posteriormente" — vale como seguro barato: hoje um
> crash / restart do servidor no meio da festa perde a partida e as sessões.
> Nada de Redis / SQLite / processo à parte.

---

# 42. SEGURANÇA

Mesmo sendo local:

* validar todos os inputs;
* validar ações;
* limitar tamanho dos payloads;
* impedir ações fora do turno;
* impedir manipulação da pontuação;
* impedir acesso a cartas privadas;
* impedir jogador de controlar outro jogador;
* utilizar tokens de sessão;
* evitar confiar no nickname;
* implementar rate limiting básico;
* tratar mensagens malformadas;
* não permitir acesso arbitrário ao GameState.

---

# 43. TESTES

Criar testes automatizados para o Game Engine.

Priorizar testes de regras.

Exemplos:

* distribuição inicial;
* jogar carta válida;
* rejeitar carta inválida;
* comprar;
* comprar e jogar;
* +2;
* acúmulo de +2;
* +4;
* +4 sobre +2;
* rejeitar +2 sobre +4;
* inverter;
* bloqueio;
* coringa;
* escolha de cor;
* UNO;
* denúncia;
* vitória;
* reconstrução do monte;
* dois jogadores;
* oito jogadores;
* reconexão;
* owner disconnect;
* timeout.

---

# 44. TESTES MULTIPLAYER

Além dos testes unitários, criar uma estratégia para simular:

```text
1 HOST
8 PLAYERS
```

conectados simultaneamente.

Testar:

* entrada;
* saída;
* reconexão;
* mensagens;
* turnos;
* ações simultâneas;
* latência;
* mensagens duplicadas;
* partida completa.

---

# 45. OBSERVABILIDADE

No MVP utilizar algo simples:

* logs estruturados;
* identificação de room;
* playerId;
* sessionId;
* action;
* event;
* timestamp.

Exemplo:

```text
[ROOM:AB7K]
[PLAYER:123]
[ACTION:PLAY_CARD]
[CARD:red-7]
[RESULT:SUCCESS]
```

Não implementar stack complexa de observabilidade inicialmente.

---

# 46. UX

A experiência deve ser simples.

Um jogador deve conseguir:

```text
abrir QR Code
 ↓
entrar
 ↓
digitar nome
 ↓
aparecer na TV
 ↓
esperar
 ↓
owner inicia
 ↓
receber cartas
 ↓
jogar
```

Sem cadastro.

Sem login.

Sem instalação.

Sem configuração complicada.

---

# 47. DESIGN

Primeiro criar uma interface funcional simples.

Depois evoluir para:

* party game;
* cartoon;
* colorido;
* divertido;
* animações;
* efeitos;
* sons;
* transições.

> **Retirado pelo dono em 2026-09-08.** A antiga exigência de "identidade visual
> própria / não usar assets, sons ou elementos de terceiros" **não vale mais** —
> ignore o §47 por completo. Assets de qualquer origem (arte, som, fontes,
> ícones, inclusive material de produtos comerciais) podem ser usados
> livremente, desde que empacotados no repo (sem internet em runtime) e com um
> `CREDITS.md` por pack quando a licença pedir crédito. Uso local, sem
> distribuição pública.

---

# 48. DESENVOLVIMENTO EM FASES

Não gerar o projeto inteiro de uma vez.

Execute o desenvolvimento nesta ordem:

## FASE 1 — Arquitetura

Definir:

* estrutura;
* responsabilidades;
* entidades;
* Game Engine;
* comunicação;
* protocolo.

## FASE 2 — Core

Implementar:

* Room;
* Player;
* Session;
* Game;
* GameState.

## FASE 3 — UNO ENGINE

Implementar todas as regras sem frontend.

## FASE 4 — WebSocket

Implementar comunicação.

## FASE 5 — HOST

Criar a tela principal.

## FASE 6 — MOBILE

Criar o controle dos jogadores.

## FASE 7 — RECONEXÃO

Implementar sessões e recuperação.

## FASE 8 — TESTE MULTIPLAYER

Testar 2–8 jogadores.

## FASE 9 — UX

Melhorar interface.

## FASE 10 — ANIMAÇÕES

Adicionar efeitos.

## FASE 11 — PARTY GAME

Transformar a interface em uma experiência visual completa.

## FASE 12 — PLATAFORMA

Refinar abstrações para permitir novos jogos.

---

# 49. REGRA DE EXECUÇÃO DO PROJETO

NÃO avance automaticamente por todas as fases.

Em cada fase:

1. explique o objetivo;
2. explique as decisões;
3. mostre a arquitetura;
4. mostre a estrutura de arquivos;
5. implemente somente o necessário;
6. crie testes;
7. explique como executar;
8. explique como validar;
9. identifique problemas conhecidos;
10. aguarde minha confirmação antes de avançar.

Se encontrar uma decisão arquitetural importante:

* apresente alternativas;
* explique vantagens;
* explique desvantagens;
* recomende uma opção.

Não esconda decisões importantes.

---

# 50. REGRA DE CÓDIGO

O código deve ser:

* TypeScript;
* fortemente tipado;
* modular;
* testável;
* simples;
* legível;
* com baixo acoplamento;
* sem abstrações desnecessárias.

Evitar:

* overengineering;
* padrões de projeto sem necessidade;
* microsserviços;
* dependências desnecessárias;
* código duplicado;
* lógica de negócio no React;
* lógica crítica apenas no cliente.

---

# 51. PRINCÍPIO FUNDAMENTAL DO GAME ENGINE

O UNO deve poder ser executado sem navegador.

Idealmente:

```text
UnoGame
   ↓
Action
   ↓
State transition
   ↓
New State
   ↓
Events
```

Exemplo:

```text
PLAY_CARD(playerId, cardId)
```

resultado:

```text
State updated

Events:
CARD_PLAYED
TURN_CHANGED
```

Isso permitirá testar o jogo isoladamente.

---

# 52. EXTENSIBILIDADE

O objetivo final da arquitetura é:

```text
Party Platform
│
├── Core
│   ├── Rooms
│   ├── Players
│   ├── Sessions
│   ├── WebSocket
│   └── Game lifecycle
│
└── Games
    ├── UNO-like
    ├── Quiz
    ├── Drawing
    ├── Voting
    ├── Word Game
    └── Future Games
```

Adicionar um jogo novo não deve exigir modificar o núcleo.

---

# 53. CRITÉRIO DE SUCESSO DO MVP

Consideraremos o MVP funcional quando for possível:

1. iniciar o servidor no PC;
2. abrir a tela HOST;
3. gerar código;
4. gerar QR Code;
5. conectar 2–8 celulares;
6. cadastrar jogadores;
7. definir owner;
8. iniciar partida;
9. distribuir cartas;
10. jogar uma partida completa;
11. comprar cartas;
12. utilizar cartas especiais;
13. declarar UNO;
14. denunciar UNO;
15. calcular placar;
16. reconectar jogador;
17. transferir owner;
18. finalizar partida;
19. iniciar nova rodada.

Tudo deve funcionar sem internet, utilizando somente a rede local.

> **Revisado pelo dono em 2026-09-10.** MVP **entregue e validado** — os 19 itens
> acima passam, Fases 1–12 concluídas, 9 jogos no catálogo. As listas de "não
> fazer no MVP" (§1, §54) agora se leem como "restrição atual da plataforma", não
> como "ainda não chegou a hora".

---

# 54. O QUE NÃO FAZER AGORA

Não implementar inicialmente:

* contas;
* login;
* banco;
* cloud;
* matchmaking online;
* múltiplas salas;
* Kubernetes;
* microsserviços;
* Redis;
* Kafka;
* app nativo;
* sistema de espectadores;
* monetização;
* analytics complexos;
* sistema social.

Esses recursos podem ser considerados futuramente.

> **Revisado pelo dono em 2026-09-10.** Dois itens mudaram de status:
> **espectadores / late-join** saíram de "descartado" e voltaram para **em
> aberto** — com 9+ pessoas na sala e jogos que eliminam cedo (Coup) ou deixam
> gente de fora do round, quem não joga fica sem tela nenhuma; é o buraco mais
> real para festa grande. **Bots continuam descartados de vez** (não é "depois" —
> decisão do dono 2026-09-07). O resto da lista segue valendo como restrição
> atual.

---

# 55. FUTURO

Após o MVP estar estável, a arquitetura poderá evoluir para:

```text
Internet
   ↓
Cloud
   ↓
Game Servers
   ↓
Rooms
   ↓
Players
```

Possibilitando jogadores em locais diferentes.

Também poderá receber novos jogos.

---

# 56. PRIMEIRA TAREFA

NÃO escreva código imediatamente.

Primeiro faça uma análise completa da especificação acima.

Apresente:

1. arquitetura recomendada;
2. diagrama dos componentes;
3. responsabilidades de cada componente;
4. modelo de domínio;
5. Game Engine;
6. máquina de estados do UNO;
7. ciclo de vida de uma partida;
8. ciclo de vida de uma sala;
9. estratégia de WebSocket;
10. estratégia de reconexão;
11. protocolo de mensagens;
12. estratégia de privacidade das cartas;
13. estratégia de timers;
14. estratégia de sincronização;
15. estrutura inicial dos diretórios;
16. dependências necessárias;
17. riscos técnicos;
18. decisões que ainda precisam ser tomadas;
19. roadmap de implementação.

Depois disso, NÃO implemente as fases seguintes automaticamente.

Aguarde minha aprovação.

A partir da minha aprovação, implemente uma fase por vez.

Sempre mantenha o projeto executável.

Sempre forneça instruções claras para executar localmente.

O objetivo não é apenas criar um jogo UNO.

O objetivo é criar o primeiro jogo de uma plataforma de party games multiplayer extensível.
