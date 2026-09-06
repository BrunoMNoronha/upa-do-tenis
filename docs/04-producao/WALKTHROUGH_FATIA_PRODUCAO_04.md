# Walkthrough — Fatia Produção 04 (Vercel + Neon)

Roteiro de execução da [FATIA_PRODUCAO_04_VERCEL_NEON.md](FATIA_PRODUCAO_04_VERCEL_NEON.md). Executar **na ordem**. Registrar as evidências em [HOMOLOGACAO_FATIA_PRODUCAO_04.md](HOMOLOGACAO_FATIA_PRODUCAO_04.md).

> [!CAUTION]
> Nenhuma connection string, senha ou secret deve ser colada em issue, PR, chat, log ou arquivo versionado. Registrar apenas **hostnames** (`ep-xxxx.sa-east-1.aws.neon.tech`) e e-mails.

Convenção de comandos: `corepack pnpm ...` (o `corepack enable` global pode exigir privilégio de administrador no Windows).

---

## Etapa 0 — Gates locais e PR

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run test          # exige Postgres local (docker-compose.dev.yml) — destrutivo
corepack pnpm exec prisma validate
corepack pnpm exec prisma generate
corepack pnpm run build
```

Gate anti-vazamento:

```bash
git status --short
git diff --stat
git grep -nE "postgres(ql)?://" -- . ':!*.example' ':!docs/**' ':!*.yml'
```

Abrir o PR com as alterações da fatia. O merge acontece na Etapa 3 — leia a nota sobre `workflow_dispatch` antes de seguir.

- [ ] Gates locais verdes
- [ ] PR aberto

---

## Etapa 1 — Neon: projeto e branch `production`

1. Criar o projeto Neon `upa-do-tenis`.
2. Região: **AWS South America East 1 (São Paulo)**. Se indisponível no plano, usar **AWS US East (N. Virginia)** e registrar a troca — a região da Vercel muda junto (`iad1`).
3. PostgreSQL 16, banco `upa_do_tenis`.
4. Renomear a branch primária para `production` (ou registrar o nome real usado).
5. Em **Connection Details**, copiar as **duas** strings:
   - **Pooled** → acrescentar `&pgbouncer=true&connect_timeout=15` (manter `sslmode=require`).
   - **Direct / unpooled** (desmarcar "Pooled connection") → manter `?sslmode=require`.
6. Anotar, no console, a **retenção de history/PITR real do plano contratado**. Não estimar.

- [ ] Projeto criado — região: `____________`
- [ ] Branch `production` — endpoint: `ep-________.____________.aws.neon.tech`
- [ ] Retenção PITR do plano: `____________`

---

## Etapa 2 — GitHub Environments e secrets

Em **Settings → Environments** do repositório:

1. Criar o environment **`production`**:
   - **Required reviewers**: adicionar o responsável. Sem isso o gate humano das migrations não existe.
   - Secret `DATABASE_URL_DIRECT` = URL **direct** da branch `production`.
2. Criar o environment **`preview`** (sem required reviewers):
   - Secret `DATABASE_URL_DIRECT` = URL **direct** da branch `preview` — cadastrar só na Etapa 6, quando a branch existir.

> [!WARNING]
> `DATABASE_URL_DIRECT` **nunca** é cadastrada na Vercel. Ela existe apenas aqui e, temporariamente, em `.env.neon.*` local.

- [ ] Environment `production` com required reviewers
- [ ] Secret `DATABASE_URL_DIRECT` (production) cadastrado

---

## Etapa 3 — Disponibilizar o workflow e migrar a branch `production`

> [!IMPORTANT]
> O evento `workflow_dispatch` só fica disponível em **Actions** depois que o arquivo do workflow existe na **branch padrão** (`main`). Como `migracoes.yml` nasce neste PR, **no primeiro rollout o merge vem antes do primeiro dispatch** — o inverso da ordem de release permanente.
>
> Isso é seguro porque, até a Etapa 4, as variáveis de Production ainda **não** estão cadastradas na Vercel: sem `DATABASE_URL`, a aplicação não conecta em banco nenhum, e o deploy disparado pelo merge é inócuo. Se preferir garantia adicional, pause a integração Git do projeto na Vercel (**Settings → Git**) até a Etapa 5.
>
> A partir do segundo release vale a ordem definitiva de [CHECKLIST_DEPLOY_PRODUCAO.md](CHECKLIST_DEPLOY_PRODUCAO.md): **migrar antes de mergear**.

1. Confirmar que as variáveis de Production **ainda não** foram cadastradas na Vercel.
2. Fazer merge do PR em `main`. O workflow **Migrations (Neon)** passa a aparecer em Actions.
3. Backup prévio (mesmo com banco vazio, valida o comando — ver [PLANO_BACKUP_RESTORE.md](PLANO_BACKUP_RESTORE.md)).
4. GitHub → **Actions → Migrations (Neon) → Run workflow**:
   - branch: `main`;
   - `ambiente`: **production**;
   - `confirmacao`: `APLICAR`.
5. Aprovar a execução pendente (required reviewers).
6. Copiar do log:
   - a linha `Datasource "db": ... at "<host>"` do passo **Status antes**;
   - o resultado do passo **Status depois** — esperado `Database schema is up to date!` com **4 migrations** aplicadas.

- [ ] PR mergeado e workflow visível em Actions
- [ ] Host confirmado como a branch `production` do Neon
- [ ] 4 migrations aplicadas

---

## Etapa 4 — Vercel: projeto e Production

1. **Add New → Project → Import Git Repository** → `BrunoMNoronha/upa-do-tenis`.
2. Framework: **Next.js** (detectado). Install e Build Command: **padrão**.
3. **Settings → General**:
   - Production Branch: **`main`**;
   - Node.js Version: **22.x**.
4. **Settings → Functions → Function Region**: `gru1` (São Paulo). Se o plano não permitir escolher, registrar e manter o padrão — e revisar a região do Neon para o par correspondente.
5. **Settings → Environment Variables**, escopo **Production apenas**:
   - `DATABASE_URL` = URL **pooled** da branch `production` (com `pgbouncer=true`);
   - `AUTH_SESSION_SECRET` = `openssl rand -hex 32`.
6. Conferir que **nenhuma** variável ficou em "All Environments" e que o escopo **Development está vazio**.

- [ ] Projeto criado, Production Branch `main`, Node 22.x
- [ ] Região das Functions: `____________`
- [ ] Variáveis de Production cadastradas, nenhuma em "All Environments"

---

## Etapa 5 — Primeiro deploy de Production

1. O merge já ocorreu na Etapa 3. Para que as variáveis da Etapa 4 passem a valer, forçar um novo deploy: **Deployments** → o último deployment de `main` → **Redeploy**.
2. Acompanhar o build e conferir no log:
   - `Detected package manager: pnpm <versão>` — se resolver abaixo de 11, aplicar a ladder de contingência da [FATIA_PRODUCAO_04_VERCEL_NEON.md](FATIA_PRODUCAO_04_VERCEL_NEON.md#contingências-aplicar-só-se-o-primeiro-build-falhar);
   - versão do Node ≥ 22.13;
   - `Generated Prisma Client`.
3. Deployment com status **Ready**.

- [ ] Build verde — package manager: `______` / Node: `______`
- [ ] URL de Production: `____________`

---

## Etapa 6 — Neon `preview` + Vercel Preview

1. Neon → **Branches → Create branch** `preview`. Criar **vazia**, sem dados da branch pai. Se a UI só oferecer clone, criar a branch e **truncar/recriar o schema** antes de qualquer uso, registrando o procedimento.
2. Copiar as URLs **pooled** e **direct** da branch `preview`.
3. GitHub → environment `preview` → secret `DATABASE_URL_DIRECT` = URL **direct** da `preview`.
4. Actions → **Migrations (Neon)** → `ambiente: preview`, `confirmacao: APLICAR`. Conferir que o host do log é **diferente** do host da Etapa 3.
5. Vercel → Environment Variables, escopo **Preview apenas**:
   - `DATABASE_URL` = URL **pooled** da branch `preview`;
   - `AUTH_SESSION_SECRET` = **segundo** `openssl rand -hex 32`, diferente do de Production. Obrigatório: Preview roda com `NODE_ENV=production`.
6. Vercel → **Settings → Deployment Protection** → **Vercel Authentication** ativa para Preview.

- [ ] Branch `preview` — endpoint: `ep-________...` (diferente do de Production)
- [ ] 4 migrations aplicadas na `preview`
- [ ] Variáveis de Preview cadastradas
- [ ] Deployment Protection ativa

---

## Etapa 7 — Bootstrap dos administradores

### 7.1 Preview (admin sintético)

Criar `.env.neon.preview` na raiz (ignorado pelo git):

```
DATABASE_URL="<url DIRECT da branch preview>"
BOOTSTRAP_ADMIN_NOME="Admin Preview"
BOOTSTRAP_ADMIN_EMAIL="admin.preview@exemplo.local"
BOOTSTRAP_ADMIN_SENHA="<senha sintética>"
```

```bash
corepack pnpm exec tsx --env-file=.env.neon.preview scripts/bootstrap-admin.ts
```

### 7.2 Production (admin real)

1. Abrir um **shell novo** e confirmar que não há `DATABASE_URL` no ambiente:
   ```bash
   echo "[$DATABASE_URL]"     # deve imprimir []
   ```
2. Criar `.env.neon.prod` com `DATABASE_URL` **direct** de `production` + os três `BOOTSTRAP_ADMIN_*`.
3. Confirmar o alvo antes de escrever:
   ```bash
   corepack pnpm exec dotenv -e .env.neon.prod -- prisma migrate status   # ou conferir pelo log da Etapa 3
   ```
   Basta reler o host da Etapa 3 caso o utilitário não esteja disponível.
4. Executar:
   ```bash
   corepack pnpm exec tsx --env-file=.env.neon.prod scripts/bootstrap-admin.ts
   ```
   Esperado: `Administrador criado com sucesso`.
5. **Executar de novo** — artefato obrigatório de aceite. Esperado: `Bootstrap bloqueado: o banco já possui 1 usuário(s)`, exit code 1.
6. Remover as três linhas `BOOTSTRAP_ADMIN_*` de `.env.neon.prod` (ou apagar o arquivo).
7. Fazer login em `<url de production>/login`. Registrar apenas o e-mail.

- [ ] Admin de Preview criado
- [ ] Admin de Production criado
- [ ] Re-execução bloqueada com exit 1
- [ ] `BOOTSTRAP_ADMIN_*` removidos do arquivo local

---

## Etapa 8 — Prova de isolamento (artefato crítico)

Executar as **quatro** provas e registrar cada uma.

### 8.1 Direta

1. Na URL de **Preview**, criar um cliente `ISOLAMENTO-PREVIEW-<aaaammddHHMM>`.
2. Na URL de **Production**, acessar `/clientes?busca=ISOLAMENTO` → **0 resultados**.
3. No SQL Editor do Neon, em **cada** branch:
   ```sql
   select nome, "criadoEm" from "Cliente" where nome like 'ISOLAMENTO-%';
   ```
   A linha existe na `preview` e **não** existe na `production`.

### 8.2 Inversa

Criar `ISOLAMENTO-PROD-<aaaammddHHMM>` na Production; a mesma query na branch `preview` retorna **0 linhas**.

### 8.3 Configuração

Após `vercel login` e `vercel link` feitos pelo operador:

```bash
corepack pnpm dlx vercel@latest env ls
```

Esperado: `DATABASE_URL` e `AUTH_SESSION_SECRET` listadas **duas vezes cada** — uma em `Production`, uma em `Preview` — e **nenhuma** linha "All Environments". Os valores permanecem mascarados.

> [!CAUTION]
> **Nunca** rodar `vercel env pull`: grava os secrets em texto plano no disco.

### 8.4 Infraestrutura

Console do Neon mostrando duas branches com endpoints distintos e atividade correlacionada apenas na `preview` durante o passo 8.1; tela de Deployment Protection com Vercel Authentication ativa.

- [ ] 8.1 direta
- [ ] 8.2 inversa
- [ ] 8.3 configuração
- [ ] 8.4 infraestrutura

---

## Etapa 9 — Validação funcional em cloud

Somente dados sintéticos.

1. Login em Production.
2. Criar um cliente, um serviço e uma ordem de serviço.
3. Recarregar e confirmar a persistência.
4. Forçar um redeploy e confirmar que os registros continuam lá (prova de que o banco é externo ao deploy).
5. **Runtime Logs** da Vercel sem `P1001` (falha de conexão), `P2024` (timeout de pool) ou erro de prepared statement — este último indicaria falta de `pgbouncer=true` na URL pooled.
6. Remover os registros sintéticos ou documentá-los como registros de teste.

- [ ] Fluxo principal validado
- [ ] Runtime Logs limpos

---

## Etapa 10 — Fechamento

- [ ] [HOMOLOGACAO_FATIA_PRODUCAO_04.md](HOMOLOGACAO_FATIA_PRODUCAO_04.md) preenchida
- [ ] Retenção PITR real registrada em [PLANO_BACKUP_RESTORE.md](PLANO_BACKUP_RESTORE.md)
- [ ] Drill de restore executado (ver o mesmo plano)
- [ ] Gates locais rodados novamente na `main`
- [ ] Issue #10 atualizada com o resumo, sem secrets
