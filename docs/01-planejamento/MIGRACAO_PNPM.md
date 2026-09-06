# Padronização do gerenciador de pacotes

O projeto utiliza pnpm 11.25.0, fixado em package.json, com Node.js >=22.13.
O Docker utiliza Node.js 24 e instalação com lockfile congelado. O layout
hoisted foi configurado em pnpm-workspace.yaml para manter os caminhos
usados na cópia do Prisma para a imagem de produção.

## Alterações

- Comandos de documentação, instruções de agentes e comentários de scripts convertidos para pnpm/pnpm exec.
- Launcher .claude/launch.json alterado para pnpm.
- package-lock.json removido; pnpm-lock.yaml e pnpm-workspace.yaml preservados.
- .gitignore impede o retorno do lockfile anterior.
- Resultados antigos documentados continuam históricos; a conversão dos comandos não equivale a nova homologação.

## Validação desta alteração

- pnpm install --frozen-lockfile --ignore-scripts --node-linker=hoisted: aprovado.
- pnpm run lint: aprovado.
- pnpm run test: 365 testes aprovados em 38 arquivos.
- pnpm run typecheck: aprovado.
- pnpm run prisma:generate: bloqueado localmente por EPERM ao substituir DLL do Prisma em uso.
- pnpm run build: bloqueado localmente por EPERM na pasta .next/standalone/node_modules/react.
- docker build -t upa-do-tenis:pnpm-check .: aprovado, incluindo geração do Prisma, build Next.js e montagem da imagem final.
- docker run --rm --entrypoint node upa-do-tenis:pnpm-check node_modules/prisma/build/index.js --version: aprovado; CLI e engines disponíveis na imagem final.
- git diff --check: os arquivos desta alteração passaram; há avisos preexistentes em src/components/ui.tsx.

## Homologação

1. Em ambiente limpo, executar pnpm install --frozen-lockfile.
2. Executar pnpm run prisma:generate e pnpm run dev; verificar a tela de login.
3. Com banco de testes separado configurado, executar pnpm run lint, pnpm run typecheck e pnpm run test.
4. Executar pnpm run build e validar a imagem Docker em staging antes de promover a produção.

Não houve alteração de schema ou regras de negócio. Alterações preexistentes
na aplicação foram preservadas. A mudança de Node.js no Docker exige a
homologação de runtime antes da publicação.
