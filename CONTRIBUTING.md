# Contribuindo

Obrigado pelo interesse! Este é um monorepo TypeScript com npm _workspaces_.

## Ambiente

```bash
npm install
npm run dev          # server :3001 · host :5173 · mobile :5174
```

Todos os aparelhos de teste precisam estar na mesma rede local.

## Antes de abrir um PR

Cada _pull request_ mantém o app rodável e tudo verde:

```bash
npm run -w server test     # motores + Sala + integração
npm run -w server lint     # tsc --noEmit
npm run -w host lint       # oxlint
npm run -w mobile lint     # oxlint
npm run build              # os 5 workspaces
```

Atualize os documentos de acompanhamento (`docs/CHANGELOG.md`,
`docs/repository-gap-review.md`) no mesmo lote da mudança.

## Princípios

- **O servidor é a fonte única da verdade.** Regras nunca vivem no React.
- **`shared/` é só tipos** — sem runtime, é o único contrato entre as pontas.
- **Local e em memória.** Sem banco de dados, sem nuvem, sem múltiplas salas.
- **TypeScript estrito**, módulos pequenos, sem abstração prematura.
- Cada PR tem escopo próprio; o app continua rodável a cada _commit_.

## Adicionar um jogo

Veja a seção **"Adicionar um jogo"** do [README](README.md). Em resumo: uma pasta
por camada (`shared` / `server` / `host` / `mobile`) e **uma linha em cada
_registry_** — nada em `core/`, no _gateway_ ou nos _shells_.

## Convenções de branch

- Trabalhe em branches `feature/*`; nunca commite direto em `main` / `develop`.
- Um assunto por PR.
