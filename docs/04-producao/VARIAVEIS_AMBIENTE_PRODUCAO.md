# Variáveis de Ambiente — Produção

Referência: `.env.production.example` (já existe no repositório, versionado, apenas com placeholders).

## Variáveis obrigatórias

| Variável | Obrigatória em produção | Descrição | Observações |
|---|---|---|---|
| `NODE_ENV` | Sim | Define o modo de execução do Next.js | Deve ser `production` no servidor de produção |
| `DATABASE_URL` | Sim | String de conexão PostgreSQL | Deve apontar para o **banco de produção**, nunca para o banco de desenvolvimento/teste. Recomendado `sslmode=require` quando o host não for local |
| `AUTH_SESSION_SECRET` | Sim | Chave HMAC que assina o cookie de sessão | Mínimo 16 caracteres (recomendado 32 bytes). Sem ela, o servidor **recusa iniciar sessões** em produção (`src/lib/auth-constants.ts` lança erro) — comportamento intencional, não é bug |

Não existem variáveis `NEXT_PUBLIC_*` no projeto atualmente (`grep -r "NEXT_PUBLIC_" src` não retorna resultados). Nenhum segredo é ou deve ser exposto ao cliente. Caso uma variável `NEXT_PUBLIC_*` seja introduzida no futuro, ela é embutida no bundle do navegador — **nunca** usar para segredos.

## Geração do `AUTH_SESSION_SECRET`

```bash
openssl rand -hex 32
```

Gerar um valor **exclusivo por ambiente** (produção ≠ desenvolvimento ≠ homologação/staging). Rotacionar o segredo invalida todas as sessões ativas (usuários precisam logar de novo) — não é destrutivo para dados.

## Onde configurar

Definir as variáveis diretamente no provedor de hospedagem (painel de variáveis de ambiente) ou em um `.env.production` **local ao servidor**, nunca commitado. O arquivo `.env.production` já está no `.gitignore` do projeto.

## Checklist de variáveis antes do deploy

- [ ] `NODE_ENV=production` definido no ambiente de execução.
- [ ] `DATABASE_URL` aponta para o banco de **produção**, confirmado por nome de host/banco (nunca `localhost` de máquina de dev, nunca os bancos `upa_do_tenis_dev`/`upa_do_tenis_test`).
- [ ] `AUTH_SESSION_SECRET` gerado com `openssl rand -hex 32` (ou equivalente), único para produção, com pelo menos 16 caracteres.
- [ ] Nenhum arquivo `.env`, `.env.local`, `.env.production` com valores reais foi commitado (`git ls-files | grep '^\.env'` deve listar apenas `.env.example` e `.env.production.example`).
- [ ] Nenhuma variável `NEXT_PUBLIC_*` contém segredo.

---

## Ambiente cloud (Vercel + Neon)

Escopos e regras da [FATIA_PRODUCAO_04_VERCEL_NEON.md](FATIA_PRODUCAO_04_VERCEL_NEON.md). Formato de cada valor em [`.env.production.example`](../../.env.production.example).

### Matriz de escopos

| Variável | Vercel Production | Vercel Preview | Vercel Development | GitHub Env `production` | GitHub Env `preview` |
|---|---|---|---|---|---|
| `DATABASE_URL` | Neon `production` **pooled** | Neon `preview` **pooled** | **não definir** | — | — |
| `DATABASE_URL_DIRECT` | **nunca** | **nunca** | **nunca** | Neon `production` **direct** | Neon `preview` **direct** |
| `AUTH_SESSION_SECRET` | hex de 32 bytes exclusivo | hex de 32 bytes **diferente** | não definir | — | — |
| `BOOTSTRAP_ADMIN_NOME` / `_EMAIL` / `_SENHA` | **nunca** | **nunca** | **nunca** | **nunca** | **nunca** |

`NODE_ENV` não é configurado manualmente na Vercel — a plataforma define `production` inclusive nos deployments de **Preview**.

### As duas URLs do Neon

| Tipo | Hostname | Usada por | Parâmetros |
|---|---|---|---|
| **pooled** | `ep-xxxx-pooler.<regiao>.aws.neon.tech` | runtime da aplicação | `?sslmode=require&pgbouncer=true&connect_timeout=15` |
| **direct** | `ep-xxxx.<regiao>.aws.neon.tech` | `migrate deploy`, `migrate status`, `bootstrap-admin`, `pg_dump` | `?sslmode=require` |

- `pgbouncer=true` é obrigatório na pooled: sem ele o Prisma emite prepared statements incompatíveis com o pooler em modo transaction.
- A direct é obrigatória nas migrations: o pooler quebra os advisory locks do Prisma Migrate.
- `prisma/schema.prisma` **não** usa `directUrl` — a URL direct é injetada como `DATABASE_URL` só na invocação do comando.

### Regras de escopo

- **Nenhuma variável no escopo "All Environments"**: cada valor pertence a exatamente um escopo.
- Escopo **Development** da Vercel fica **vazio**, para que um `vercel env pull` jamais traga banco cloud para uma máquina local.
- **`vercel env pull` é proibido** neste projeto: grava secrets em texto plano no disco.
- `AUTH_SESSION_SECRET` de Preview é **obrigatório e diferente** do de Production — Preview roda com `NODE_ENV=production` e `obterSegredoSessao()` (`src/lib/auth-constants.ts`) lança erro sem ele.
- `DATABASE_URL` precisa existir também no **build**: `src/lib/prisma.ts` instancia o `PrismaClient` no carregamento do módulo durante o `next build`. Nenhuma query roda em build time (todas as páginas com banco são `force-dynamic`).

### `BOOTSTRAP_ADMIN_*` não são secrets de runtime

As três variáveis de bootstrap **não** devem existir em nenhum provedor. Elas vivem apenas em um arquivo local `.env.neon.prod` (padrão `.env.neon*`, já no `.gitignore`), durante a janela do bootstrap inicial, e devem ser removidas logo depois. Procedimento em [WALKTHROUGH_FATIA_PRODUCAO_04.md](WALKTHROUGH_FATIA_PRODUCAO_04.md), etapa 7.

> [!WARNING]
> Não nomear esse arquivo como `.env.production`: o Next.js autoloada `.env.production` em modo produção, e um `pnpm start` local acidental conectaria no banco real.

### Checklist adicional para cloud

- [ ] `DATABASE_URL` de cada escopo confirmada pelo **endpoint** (`ep-xxxx`), não pelo nome do banco — as duas branches usam o mesmo nome de banco.
- [ ] Endpoints de Production e Preview são diferentes.
- [ ] `DATABASE_URL_DIRECT` ausente da Vercel.
- [ ] Nenhuma variável em "All Environments"; Development vazio.
- [ ] `AUTH_SESSION_SECRET` distinto entre os dois escopos.
- [ ] `git ls-files | grep '^\.env'` lista apenas os arquivos `*.example`.
