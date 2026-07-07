# Walkthrough — Fatia Produção 03: Produção Local Piloto com Docker

**Data:** 2026-07-06
**Branch:** main
**Commit base:** dc71a4a — feat(auth): protect private pages and critical APIs

## Resumo

Objetivo da fatia: fazer a aplicação UPA do Tênis rodar em ambiente Docker local
(app + Postgres), com persistência de dados via volume, validando build,
subida dos containers, acesso via navegador, persistência entre restart/down/up
e geração de backup.

Status final: **Tasks 9, 10 e 11 concluídas.**

## Ambiente

- Windows 10, Docker Desktop (Docker 29.6.1), WSL2 backend.
- Node 20 (imagem `node:20-alpine` no Docker; local via `npm`).
- Next.js 14.2.35 (build standalone).
- Prisma 5.22.0 + PostgreSQL 16 (`postgres:16-alpine`).
- Compose file: `docker-compose.local.yml`, env file: `.env.docker` (não versionado).

## Arquivos criados/alterados nesta fatia

Criados anteriormente (sessão prévia) e mantidos:
- `Dockerfile`
- `docker-compose.local.yml`
- `docker-entrypoint.sh`
- `.dockerignore`
- `.env.docker.example`

Alterados nesta sessão:
- `src/app/caixa/page.tsx` — adicionado `export const dynamic = "force-dynamic"`.
- `src/app/formas-pagamento/page.tsx` — idem.
- `src/app/insumos/page.tsx` — idem.
- `src/app/ordens-servico/page.tsx` — idem.
- `src/app/servicos/page.tsx` — idem.
- `Dockerfile` — removida a cópia isolada de `node_modules/.bin/prisma` (causava
  quebra de resolução de caminho relativo do arquivo `.wasm` do Prisma).
- `docker-entrypoint.sh` — troca de `npx prisma migrate deploy` por
  `node node_modules/prisma/build/index.js migrate deploy` (evita depender do
  shim `.bin/prisma`, que é um symlink no host e é desreferenciado incorretamente
  pelo `COPY` do Docker).
- `.gitignore` — adicionada entrada `backups/`.

Criados nesta sessão:
- `public/.gitkeep` — pasta `public/` não existia no projeto; o Dockerfile
  exige `COPY --from=builder /app/public ./public` (padrão Next.js standalone).
- `backups/upa_do_tenis_backup_local.sql` — backup gerado (ignorado no git).
- Este walkthrough.

Nenhuma alteração em `prisma/schema.prisma`, migrations existentes, cálculos
financeiros, regras de pagamento, caixa ou estoque/insumos.

## Comandos executados e resultados

### Lint
```
npm run lint
```
Resultado: `✔ No ESLint warnings or errors`

### Testes
```
npm run test
```
Resultado: `Test Files 32 passed (32)` / `Tests 323 passed (323)`

### Build local
```
npm run build
```
Resultado: sucesso. As 5 páginas corrigidas passaram de estáticas (`○`) para
dinâmicas (`ƒ`): `/caixa`, `/formas-pagamento`, `/insumos`, `/ordens-servico`,
`/servicos`.

### Docker build (1ª tentativa)
```
docker compose -f docker-compose.local.yml build
```
Resultado: **falhou**. Causa raiz: `next build` tentava pré-renderizar
(SSG) as páginas acima, que chamam Prisma diretamente; sem banco acessível
durante o build (`DATABASE_URL` dummy aponta para `localhost:5432` inexistente),
o prerender falhava.

Correção mínima aplicada: `export const dynamic = "force-dynamic"` nas 5
páginas (mesmo padrão já usado em `/vendas`, `/produtos`, `/usuarios`,
`/login`). Após a correção, `npm run lint`, `npm run test` e `npm run build`
foram executados novamente com sucesso (resultados acima).

### Docker build (2ª tentativa)
```
docker compose -f docker-compose.local.yml build
```
Resultado: **falhou** em novo ponto — `COPY --from=builder /app/public ./public`
não encontrou `/app/public` (pasta inexistente no projeto).

Correção mínima: criada pasta `public/.gitkeep`.

### Docker build (3ª tentativa)
Resultado: **sucesso** — build completo, imagem `upa-do-tenis-app` gerada.

### Docker compose config
```
docker compose --env-file .env.docker -f docker-compose.local.yml config
```
Resultado: válido, variáveis resolvidas corretamente (`AUTH_SESSION_SECRET`,
`POSTGRES_PASSWORD`, `DATABASE_URL` montada automaticamente).

### Docker up (1ª tentativa)
```
docker compose --env-file .env.docker -f docker-compose.local.yml up -d
```
Resultado: containers subiram, mas `upa-app` entrou em **crash loop**.

Causa raiz: `docker-entrypoint.sh` executava `npx prisma migrate deploy`.
`node_modules/.bin/prisma` no host Windows é um shim/symlink apontando para
`../prisma/build/index.js`. A instrução `COPY` do Dockerfile copiava apenas
esse arquivo isoladamente, desreferenciando o symlink e colocando o conteúdo
de `index.js` dentro de `node_modules/.bin/`. Isso quebrava a resolução
relativa (`__dirname`) usada pelo Prisma CLI para localizar
`prisma_schema_build_bg.wasm`, resultando em `ENOENT`.

Correção mínima aplicada:
- `docker-entrypoint.sh`: `node node_modules/prisma/build/index.js migrate deploy`
  (chama o CLI diretamente pelo pacote completo já copiado, sem depender do shim).
- `Dockerfile`: removida a linha `COPY --from=builder /app/node_modules/.bin/prisma ...`.

### Docker build + up (tentativa final)
```
docker compose --env-file .env.docker -f docker-compose.local.yml down
docker compose --env-file .env.docker -f docker-compose.local.yml build
docker compose --env-file .env.docker -f docker-compose.local.yml up -d
```
Resultado: **sucesso**. Logs confirmam:
```
Applying migration `20260704201242_init_postgres`
Applying migration `20260704211729_create_usuario`
Applying migration `20260705124947_create_produto`
Applying migration `20260705140627_create_venda_balcao`
All migrations have been successfully applied.
>> Iniciando servidor Next.js...
✓ Ready in 123ms
```

### Docker ps
```
NAME      IMAGE                COMMAND                  SERVICE   STATUS
upa-app   upa-do-tenis-app     "./docker-entrypoint…"   app       Up (healthy dependency ok)
upa-db    postgres:16-alpine   "docker-entrypoint.s…"   db        Up (healthy)
```
Portas: `upa-app` em `3000:3000`; `upa-db` em `5433:5432` (não conflita com
o Postgres de desenvolvimento local na porta 5432).

### Docker logs
Sem erros após a correção; migrations aplicadas e servidor Next.js "Ready".

## Validação no navegador (localhost:3000)

- `GET /` → `307` redirecionando para `/login` (middleware de autenticação
  ativo, conforme PEND-01 já homologada).
- `GET /login` → `200`, título `Login | UPA do Tênis` presente no HTML.

Não foi executado login interativo nem `bootstrap:admin`, conforme restrição
explícita da tarefa (não criar seed automático, não rodar bootstrap admin
automaticamente).

## Teste de persistência

Como não há usuário criado (bootstrap não executado por restrição) e todas as
APIs exigem sessão autenticada, o teste de persistência foi feito por inserção
direta de um registro de teste na tabela `Cliente` via `psql` dentro do
container `upa-db` (não usa dados de negócio, apenas valida o volume):

```sql
INSERT INTO "Cliente" (id, nome, telefone, "atualizadoEm")
VALUES ('teste-persistencia-001', 'Cliente Teste Persistencia Fatia03', '11999990000', now());
```

1. `docker compose ... restart` → registro consultado com sucesso, app respondeu `200` em `/login`.
2. `docker compose ... down` (sem `-v`) → volume `upa_postgres_data` preservado (confirmado com `docker volume ls`).
3. `docker compose ... up -d` → registro consultado com sucesso novamente, app respondeu `200` em `/login`.

Persistência confirmada em ambos os ciclos. Registro de teste removido após a
validação (`DELETE FROM "Cliente" WHERE id='teste-persistencia-001'`).

## Backup

```
docker compose --env-file .env.docker -f docker-compose.local.yml exec -T db pg_dump -U upa_user -d upa_do_tenis > backups/upa_do_tenis_backup_local.sql
```
Resultado: arquivo gerado com sucesso, 37.831 bytes, 1260 linhas. Pasta
`backups/` adicionada ao `.gitignore` (dump não deve ser versionado).

## Problemas encontrados e correções aplicadas

| # | Problema | Causa raiz | Correção |
|---|----------|-----------|----------|
| 1 | Build falhava no prerender de 5 páginas | Prisma sem banco acessível durante `next build` (SSG) | `export const dynamic = "force-dynamic"` nas 5 páginas |
| 2 | `COPY .../public` falhava | Pasta `public/` inexistente no projeto | Criado `public/.gitkeep` |
| 3 | Container `upa-app` em crash loop (`ENOENT` `.wasm`) | `COPY` desreferenciando o symlink `.bin/prisma`, quebrando resolução relativa do Prisma CLI | Entrypoint chama `node node_modules/prisma/build/index.js migrate deploy` diretamente; removida cópia do `.bin/prisma` no Dockerfile |

## Riscos remanescentes

- Nenhum usuário existe no banco de produção local; login real e navegação
  autenticada (criação de cliente/OS via UI) ainda não foram testados
  manualmente nesta fatia — ficam para homologação manual dedicada, incluindo
  `npm run bootstrap:admin` (execução manual, fora do escopo automatizado desta tarefa).
- `AUTH_SESSION_SECRET` e `POSTGRES_PASSWORD` usados neste piloto foram gerados
  localmente e estão apenas em `.env.docker` (não versionado); para produção
  real, devem ser gerados/geridos por processo próprio de segredo.
- Backup testado é manual (`pg_dump` via `exec`); não há rotina agendada de
  backup automático nesta fatia.
- Ambiente ainda é "piloto local", não produção real (sem domínio, TLS,
  monitoramento ou deploy remoto).

## Veredito

**Aprovado com ressalvas.**

Docker build, up, ps, logs, acesso via localhost e persistência (restart e
down/up) foram validados com sucesso, com três correções mínimas e
rastreáveis aplicadas (nenhuma delas toca schema, migrations, cálculos
financeiros, pagamentos, caixa ou estoque/insumos). Login autenticado real e
fluxo de criação de cliente/OS via UI ficam pendentes de homologação manual
antes de declarar a fatia totalmente concluída para uso operacional.
