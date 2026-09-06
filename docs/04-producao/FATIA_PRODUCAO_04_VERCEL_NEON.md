# Fatia Produção 04 — Deploy Cloud com Vercel + Neon

> Issue de origem: [#10 — chore(infra): configurar Vercel + Neon para ambiente cloud seguro](https://github.com/BrunoMNoronha/upa-do-tenis/issues/10)

## Objetivo

Estabelecer o primeiro ambiente cloud do sistema, com a aplicação Next.js na **Vercel** e o PostgreSQL no **Neon**, garantindo:

- separação dura entre **Production** e **Preview** — Preview nunca alcança o banco de produção;
- migrations aplicadas apenas de forma controlada e auditável;
- secrets somente nos provedores, nunca no Git;
- caminho de backup, restauração e rollback documentado.

Esta fatia **não altera** regra de negócio, cálculo financeiro, estoque, insumos ou caixa, e **não altera** `prisma/schema.prisma`.

A trilha de **produção local piloto via Docker** ([FATIA_PRODUCAO_03_DOCKER_LOCAL.md](FATIA_PRODUCAO_03_DOCKER_LOCAL.md)) continua válida e independente desta.

---

## Decisões de arquitetura

| Tema | Decisão | Justificativa |
|---|---|---|
| Aplicação | Vercel, projeto `upa-do-tenis`, Production Branch `main` | Framework Next.js detectado nativamente; deploy por push |
| Banco | Neon PostgreSQL, projeto `upa-do-tenis` | Compatível com Prisma 5.22; branches nativas; PITR |
| Região | Vercel `gru1` + Neon **AWS South America East 1 (São Paulo)** | Menor latência para operação no Brasil. **Fallback**: Vercel `iad1` + Neon **AWS US East (N. Virginia)** caso a região ou a seleção de região de Functions não esteja disponível no plano contratado. Regra inegociável: **Functions e banco na mesma região de nuvem** |
| Banco de Preview | Branch Neon `preview` **fixa e criada vazia** | Ver "Isolamento Production × Preview" |
| Migrations | GitHub Actions, workflow manual `Migrations (Neon)` | Ver "Estratégia de migrations" |
| `directUrl` no schema | **Não adicionado** | A URL direct é injetada como `DATABASE_URL` apenas na invocação do comando; `prisma/schema.prisma` permanece intocado |

---

## Modelo das duas URLs do Neon

O Neon expõe **dois hostnames para a mesma branch**. Confundi-los é a causa mais comum de falha nesta arquitetura.

| Tipo | Hostname | Usada por | Parâmetros |
|---|---|---|---|
| **pooled** | `ep-xxxx-pooler.<regiao>.aws.neon.tech` | **runtime da aplicação** (`DATABASE_URL` na Vercel) | `?sslmode=require&pgbouncer=true&connect_timeout=15` |
| **direct** (unpooled) | `ep-xxxx.<regiao>.aws.neon.tech` | `prisma migrate deploy`, `prisma migrate status`, `bootstrap-admin`, `pg_dump` | `?sslmode=require` |

- `pgbouncer=true` é **obrigatório** na URL pooled: desliga os prepared statements do Prisma, incompatíveis com o pooler em modo transaction. Sem esse parâmetro aparecem erros de prepared statement em runtime.
- O pooler em modo transaction **quebra os advisory locks** do Prisma Migrate — por isso migrations exigem a URL direct.
- A URL **direct nunca é cadastrada na Vercel**. Ela vive apenas como secret de GitHub Environment e, durante operação manual, em arquivo local `.env.neon.*` (ignorado pelo git).

Formato de referência: [`.env.production.example`](../../.env.production.example).

---

## Isolamento Production × Preview

### Estrutura de branches no Neon

| Branch Neon | Origem | Conteúdo | Consumidor |
|---|---|---|---|
| `production` (primária) | — | dados reais | Vercel Production |
| `preview` | criada **VAZIA**, não clonada de `production` | apenas dados sintéticos | Vercel Preview (todos os PRs) |

### Por que branch fixa e vazia, e não a integração Neon–Vercel

A integração oficial Neon–Vercel cria uma branch por PR automaticamente. Branches Neon são clones *copy-on-write* da branch pai — ou seja, **cada URL de Preview passaria a conter uma cópia completa dos dados reais** de clientes, ordens de serviço, pagamentos, estoque e caixa. Para um sistema com dados pessoais e financeiros reais, operado por uma pessoa e sem etapa de mascaramento de dados, esse é exatamente o risco que a issue classifica como crítico.

A branch fixa e vazia entrega o mesmo isolamento com um único valor auditável em uma única tela, e um banco de Preview que **fisicamente não pode conter dados reais**.

Reavaliar a integração automática somente quando existir uma etapa de mascaramento de dados.

### Controles de apoio

- Vercel: Production Branch = `main`; Preview Deployments habilitados.
- **Deployment Protection → Vercel Authentication ativa no Preview.**
- **Nenhuma variável no escopo "All Environments".** Cada variável pertence a exatamente um escopo.
- Escopo **Development** da Vercel deixado vazio, para que um `vercel env pull` jamais traga banco cloud para uma máquina local.
- `vercel env pull` é **proibido** neste projeto: grava secrets em texto plano no disco.
- `src/lib/prisma.ts` não tem URL de fallback: `DATABASE_URL` ausente falha ruidosamente, nunca cai em produção por acidente. Propriedade de segurança — manter.

---

## Matriz de variáveis de ambiente

| Variável | Vercel Production | Vercel Preview | Vercel Development | GitHub Env `production` | GitHub Env `preview` |
|---|---|---|---|---|---|
| `DATABASE_URL` | Neon `production` **pooled** | Neon `preview` **pooled** | **não definir** | — | — |
| `DATABASE_URL_DIRECT` | **nunca** | **nunca** | **nunca** | Neon `production` **direct** | Neon `preview` **direct** |
| `AUTH_SESSION_SECRET` | hex de 32 bytes exclusivo | hex de 32 bytes **diferente** | não definir | — | — |
| `BOOTSTRAP_ADMIN_NOME` / `_EMAIL` / `_SENHA` | **nunca** | **nunca** | **nunca** | **nunca** | **nunca** |

Observações:

- `DATABASE_URL` também precisa existir no **build**: `src/lib/prisma.ts` instancia o `PrismaClient` no carregamento do módulo durante o `next build`. É o mesmo motivo do `ARG DATABASE_URL` dummy no `Dockerfile`.
- `AUTH_SESSION_SECRET` **não** é necessário no build, mas é obrigatório em runtime nos dois escopos: **Preview também roda com `NODE_ENV=production`**, e `obterSegredoSessao()` (`src/lib/auth-constants.ts`) lança erro sem ele.
- Nenhuma query roda em build time: todas as páginas com banco declaram `export const dynamic = "force-dynamic"`.
- Rotacionar `AUTH_SESSION_SECRET` invalida todas as sessões (cookie de 8h). Não é destrutivo para dados e serve como alavanca de emergência para forçar logout global.
- Detalhamento completo em [VARIAVEIS_AMBIENTE_PRODUCAO.md](VARIAVEIS_AMBIENTE_PRODUCAO.md).

---

## Estratégia de migrations

Migrations são aplicadas pelo workflow manual [`.github/workflows/migracoes.yml`](../../.github/workflows/migracoes.yml).

- Disparo **`workflow_dispatch` apenas** — nunca em `push` ou `pull_request`, portanto inalcançável a partir de forks.
- Input `ambiente` (`preview` | `production`) seleciona o **GitHub Environment**; o secret `DATABASE_URL_DIRECT` existe apenas dentro dele.
- Input `confirmacao` exige o texto literal `APLICAR`.
- O Environment `production` deve ter **Required reviewers** configurado, deixando a execução pendente de aprovação humana.
- Passos: `migrate status` (evidência do alvo) → `migrate deploy` → `migrate status` (gate).

> [!NOTE]
> `workflow_dispatch` só aparece em **Actions** quando o arquivo do workflow já existe na **branch padrão**. No primeiro rollout, portanto, o merge precede o primeiro dispatch — ver a Etapa 3 de [WALKTHROUGH_FATIA_PRODUCAO_04.md](WALKTHROUGH_FATIA_PRODUCAO_04.md). A ordem de release abaixo vale a partir do segundo release.

> [!IMPORTANT]
> A linha `Datasource "db": PostgreSQL database "<db>", schema "public" at "<host>"` impressa pelo `migrate status` é a **evidência do banco alvo** e deve ser copiada para o relatório de homologação. Registrar o host, nunca as credenciais.

### Ordem obrigatória de release

1. `pg_dump` da branch `production` (ver [PLANO_BACKUP_RESTORE.md](PLANO_BACKUP_RESTORE.md)).
2. Dispatch de `Migrations (Neon)` com `ambiente = production`, aprovado pelo revisor.
3. Merge do PR em `main` → deploy automático na Vercel.
4. Smoke test em Production.
5. Dispatch de `Migrations (Neon)` com `ambiente = preview`, para a branch de Preview não sofrer drift de schema.

Migrations devem ser **backward-compatible** com a versão anterior da aplicação: entre os passos 2 e 3 a versão antiga roda contra o schema novo.

### Regras duras

- **Nunca** `prisma migrate dev`, `prisma db push`, `prisma migrate reset` ou `pnpm run seed` contra Production.
- `prisma migrate deploy` **não** dispara o `prisma.seed` configurado no `package.json` — semear produção só é possível por execução explícita, que é proibida aqui.
- O Prisma **não tem down migration**. Reverter schema é PITR do Neon, não `migrate resolve`. Ver [PLANO_ROLLBACK.md](PLANO_ROLLBACK.md).

### CI de validação

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) roda em `pull_request` e em `push` para `main`, e **não tem acesso a nenhum secret de ambiente cloud**. Usa um PostgreSQL 16 efêmero de serviço, porque parte da suíte (`src/lib/vendas.test.ts`, `src/lib/movimentacao-estoque-service.test.ts`) exige schema real e é **destrutiva** (`deleteMany`). Por isso a suíte jamais pode alcançar Production ou Preview.

---

## Build na Vercel

| Item | Configuração |
|---|---|
| Framework | Next.js (detectado) |
| Production Branch | `main` |
| Node.js Version | 22.x (`engines.node >= 22.13`) |
| Install Command | padrão (pnpm detectado pelo lockfile / `packageManager`) |
| Build Command | padrão (`pnpm run build`) |
| Function Region | `gru1` (mesma região do Neon) |

### `postinstall: prisma generate`

Adicionado ao `package.json` nesta fatia. Motivos:

1. A Vercel cacheia `node_modules`; em cache hit o `postinstall` da **dependência** — que é o que gera o Prisma Client — não roda de novo.
2. O pnpm ≥ 10 bloqueia scripts de ciclo de vida de dependências. Este repositório libera via `allowBuilds` em `pnpm-workspace.yaml`, chave **exclusiva do pnpm 11**; se a Vercel resolver pnpm 10, o script do Prisma seria silenciosamente bloqueado.
3. Torna `pnpm install` local auto-suficiente.

O `pnpm exec prisma generate` do `Dockerfile` fica redundante e idempotente — **não foi alterado**.

### Contingências (aplicar só se o primeiro build falhar)

| Sintoma | Ação | Onde |
|---|---|---|
| `Detected package manager` resolve pnpm < 11 e o install quebra | definir `ENABLE_EXPERIMENTAL_COREPACK=1` em todos os escopos | painel Vercel |
| ainda quebra | Install Command → `npx pnpm@11.25.0 install --frozen-lockfile` | painel Vercel |
| erro de build/runtime relacionado a `output: "standalone"` | em `next.config.mjs`: `output: process.env.VERCEL ? undefined : "standalone"` e **revalidar `docker build` local antes do merge** | repositório |
| build exige `binaryTargets` no Prisma | **parar e escalar** — alterar `schema.prisma` está fora do escopo | — |

`vercel.json` **não foi criado**. Adicionar `{"regions": ["gru1"]}` apenas depois de confirmar no painel que `gru1` é selecionável no plano contratado — configurar primeiro pelo painel evita versionar uma config que o plano rejeita. `src/middleware.ts` roda no edge e não é afetado por `regions`.

---

## Bootstrap do primeiro administrador em cloud

`scripts/bootstrap-admin.ts` roda via `tsx --env-file=.env`, caminho fixo apontando para o ambiente local. Para alcançar o Neon, invoca-se o `tsx` diretamente — **sem alterar o `package.json`**:

```bash
corepack pnpm exec tsx --env-file=.env.neon.prod scripts/bootstrap-admin.ts
```

Conteúdo de `.env.neon.prod` (ignorado pelo git via `.env.neon*`), **somente durante a janela do bootstrap**:

```
DATABASE_URL="<url DIRECT da branch production>"
BOOTSTRAP_ADMIN_NOME="..."
BOOTSTRAP_ADMIN_EMAIL="..."
BOOTSTRAP_ADMIN_SENHA="..."
```

> [!WARNING]
> Não usar o nome `.env.production` para este arquivo. O Next.js autoloada `.env.production` em modo produção — um `pnpm start` local acidental conectaria no banco real.

Procedimento detalhado em [WALKTHROUGH_FATIA_PRODUCAO_04.md](WALKTHROUGH_FATIA_PRODUCAO_04.md). A idempotência vem de `criarPrimeiroAdmin()` (`src/lib/bootstrap-admin.ts`), que retorna `bloqueado` quando `usuario.count() > 0`; o script sai com código 1 nesse caso. **A segunda execução bloqueada é artefato obrigatório de aceite.**

---

## Arquivos desta fatia

### Criados

| Arquivo | Papel |
|---|---|
| `.github/workflows/ci.yml` | validação em PR/`main`, sem secrets, com Postgres efêmero |
| `.github/workflows/migracoes.yml` | `migrate deploy` manual e aprovado, por GitHub Environment |
| `docs/04-producao/FATIA_PRODUCAO_04_VERCEL_NEON.md` | este documento |
| `docs/04-producao/WALKTHROUGH_FATIA_PRODUCAO_04.md` | passo a passo de painel e de comandos |
| `docs/04-producao/HOMOLOGACAO_FATIA_PRODUCAO_04.md` | registro de evidências e critérios de aceite |

### Alterados

| Arquivo | Alteração |
|---|---|
| `package.json` | `"postinstall": "prisma generate"` |
| `.gitignore` | `.env.neon*` |
| `.env.production.example` | documentação do modelo de duas URLs e do escopo de cada secret |
| `docs/04-producao/VARIAVEIS_AMBIENTE_PRODUCAO.md` | matriz de escopos cloud |
| `docs/04-producao/CHECKLIST_DEPLOY_PRODUCAO.md` | ordem de release cloud |
| `docs/04-producao/CHECKLIST_GO_LIVE.md` | itens de go-live cloud |
| `docs/04-producao/PLANO_BACKUP_RESTORE.md` | seção Neon |
| `docs/04-producao/PLANO_ROLLBACK.md` | seção Vercel + Neon |
| `docs/01-planejamento/planos-implementacao/CHECKLIST_DEPLOY.md` | correção de defasagem (Node, pnpm, `AUTH_SESSION_SECRET`) |
| `README.md` | seção "Deploy Cloud (Vercel + Neon)" |

**Não alterados, por decisão explícita:** `prisma/schema.prisma`, `src/lib/prisma.ts`, `src/lib/auth-constants.ts`, `next.config.mjs`, `Dockerfile`, `docker-entrypoint.sh`, qualquer módulo de regra de negócio.

---

## Riscos e pendências

| Risco | Mitigação |
|---|---|
| Vercel não resolver pnpm 11 no primeiro build | ladder de contingência acima, tudo por painel |
| `output: "standalone"` na Vercel | confirmar no primeiro build; fallback pronto |
| `sa-east-1` indisponível no plano Neon, ou seleção de região de Functions indisponível no plano Vercel | fallback `iad1` + `us-east-1`; registrar a escolha real na homologação |
| Retenção/PITR do Neon varia por plano | **ler o valor real no console** e registrar; não estimar |
| Drift de schema na branch `preview` | passo 5 da ordem de release |
| Operador esquecer de migrar antes do deploy | ordem de release em [CHECKLIST_DEPLOY_PRODUCAO.md](CHECKLIST_DEPLOY_PRODUCAO.md) + exigência de migrations backward-compatible |

### Pendências fora do escopo desta fatia

- Domínio próprio e HTTPS customizado.
- Backup lógico offsite agendado (hoje é manual, ver [PLANO_BACKUP_RESTORE.md](PLANO_BACKUP_RESTORE.md)).
- Observabilidade além dos Runtime Logs da Vercel.
