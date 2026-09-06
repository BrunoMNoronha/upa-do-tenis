# Checklist de Deploy (Em Produção)

> [!IMPORTANT]
> Este documento é uma **visão geral**. Os procedimentos autoritativos vivem em `docs/04-producao/`:
>
> - **Deploy cloud (Vercel + Neon):** [FATIA_PRODUCAO_04_VERCEL_NEON.md](../../04-producao/FATIA_PRODUCAO_04_VERCEL_NEON.md) e [WALKTHROUGH_FATIA_PRODUCAO_04.md](../../04-producao/WALKTHROUGH_FATIA_PRODUCAO_04.md)
> - **Produção local via Docker:** [FATIA_PRODUCAO_03_DOCKER_LOCAL.md](../../04-producao/FATIA_PRODUCAO_03_DOCKER_LOCAL.md)
> - **Checklist a cada deploy:** [CHECKLIST_DEPLOY_PRODUCAO.md](../../04-producao/CHECKLIST_DEPLOY_PRODUCAO.md)
> - **Variáveis de ambiente:** [VARIAVEIS_AMBIENTE_PRODUCAO.md](../../04-producao/VARIAVEIS_AMBIENTE_PRODUCAO.md)

## Pré-Requisitos

1. **Repositório**: código versionado em um Git host (o projeto usa GitHub).
2. **Banco de Dados**: PostgreSQL acessível via `DATABASE_URL`. Deve ser fisicamente separado dos bancos de desenvolvimento, teste e preview.
3. **Node.js**: `>= 22.13` (conforme `engines` do `package.json`).
4. **pnpm**: `11.25.0` (fixado em `packageManager`). Ativar com `corepack prepare pnpm@11.25.0 --activate`.

## Checklist

- [ ] **1. Variáveis de ambiente:** `DATABASE_URL` **e** `AUTH_SESSION_SECRET` configuradas no provedor (nunca em arquivo versionado). Sem `AUTH_SESSION_SECRET`, a aplicação recusa iniciar sessões em produção — comportamento intencional de `src/lib/auth-constants.ts`.
- [ ] **2. Instalação:** `pnpm install --frozen-lockfile` (as devDependencies são necessárias para o build).
- [ ] **3. Geração do Prisma Client:** coberta pelo `postinstall` do `package.json` (`prisma generate`). Confirmar no log de build.
- [ ] **4. Migrations:** `prisma migrate deploy` aplicado **antes** de subir a nova versão. Nunca `migrate dev`, `db push` ou `migrate reset` em produção. No ambiente cloud, isso é feito pelo workflow manual e aprovado `Migrations (Neon)` (`.github/workflows/migracoes.yml`).
- [ ] **5. Dados iniciais:** o primeiro administrador é criado por `bootstrap-admin`, uma única vez, de forma controlada. **Não** executar `pnpm run seed` em produção — o seed insere dados de demonstração e só se justifica em ambientes descartáveis, mediante decisão explícita e revisão do conteúdo.
- [ ] **6. Build:** `pnpm run build` passa sem erros.
- [ ] **7. Start:** o serviço sobe e responde (porta 3000 por padrão). Na Vercel, isso é gerenciado pela plataforma.
- [ ] **8. Backup:** dump gerado imediatamente antes das migrations ([PLANO_BACKUP_RESTORE.md](../../04-producao/PLANO_BACKUP_RESTORE.md)).

## Erros Comuns

- **`@prisma/client did not initialize yet`:** o `prisma generate` não rodou no deploy — verificar o `postinstall` e o cache de dependências da plataforma.
- **Tabela não existe:** migrations não aplicadas no host. Executar `prisma migrate deploy` contra o banco correto.
- **Erro de prepared statement (Neon):** falta `pgbouncer=true` na URL pooled.
- **Erro sobre `AUTH_SESSION_SECRET`:** a variável não foi definida naquele escopo. Vale também para Preview, que roda com `NODE_ENV=production`.
