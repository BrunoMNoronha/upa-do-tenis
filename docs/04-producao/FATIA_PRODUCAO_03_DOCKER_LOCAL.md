# Fatia Produção 03 — Produção Local Piloto com Docker

## Objetivo

Permitir que o sistema UPA do Tênis rode em **produção local piloto** em um desktop da loja, acessível via `http://localhost:3000`, usando Docker para garantir:

- Ambiente isolado e reprodutível.
- PostgreSQL 16 com dados persistentes.
- Facilidade para subir, parar, reiniciar e atualizar.
- Backup e restauração do banco de dados.

---

## Pré-requisitos

| Requisito | Mínimo | Verificação |
|---|---|---|
| Docker Desktop | 4.x+ | `docker --version` |
| Docker Compose | v2+ (incluso no Docker Desktop) | `docker compose version` |
| Git | 2.x+ | `git --version` |
| Espaço em disco | ~2 GB | — |
| Portas livres | 3000 (app), 5433 (banco) | — |

> [!IMPORTANT]
> No Windows, o Docker Desktop deve estar rodando antes de executar qualquer comando Docker.

---

## Arquivos Criados nesta Fatia

| Arquivo | Descrição |
|---|---|
| `Dockerfile` | Build multi-stage para Next.js 14 standalone + Prisma |
| `docker-entrypoint.sh` | Script de inicialização: aplica migrations e inicia servidor |
| `docker-compose.local.yml` | Compose com serviços `app` + `db` |
| `.dockerignore` | Exclui arquivos desnecessários do build Docker |
| `.env.docker.example` | Modelo de variáveis de ambiente para Docker |
| `next.config.mjs` | **Alterado**: adicionado `output: "standalone"` |

---

## Configuração Inicial

### 1. Criar arquivo de variáveis de ambiente

```bash
cp .env.docker.example .env.docker
```

### 2. Editar `.env.docker`

Abra o arquivo e altere os valores:

```env
POSTGRES_USER=upa_user
POSTGRES_PASSWORD=SUA_SENHA_SEGURA_AQUI
POSTGRES_DB=upa_do_tenis
AUTH_SESSION_SECRET=SUA_CHAVE_AQUI
```

### 3. Gerar AUTH_SESSION_SECRET

**No Linux/Mac (Git Bash):**
```bash
openssl rand -hex 32
```

**No PowerShell (Windows):**
```powershell
-join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Max 256) })
```

Copie o valor gerado e cole no campo `AUTH_SESSION_SECRET` do `.env.docker`.

---

## Comandos de Operação

### Subir o sistema

```bash
docker compose -f docker-compose.local.yml --env-file .env.docker up -d
```

Na primeira execução, o Docker irá:
1. Fazer o build da imagem (pode demorar alguns minutos).
2. Criar o banco PostgreSQL.
3. Aplicar todas as migrations do Prisma.
4. Iniciar o servidor Next.js.

### Acessar o sistema

Abra no navegador: **http://localhost:3000**

### Verificar status

```bash
docker compose -f docker-compose.local.yml ps
```

Ambos os serviços (`upa-app` e `upa-db`) devem estar com status `Up` ou `running`.

### Ver logs

```bash
# Logs de todos os serviços
docker compose -f docker-compose.local.yml logs --tail=100

# Logs apenas da aplicação
docker compose -f docker-compose.local.yml logs --tail=100 app

# Logs apenas do banco
docker compose -f docker-compose.local.yml logs --tail=100 db

# Acompanhar logs em tempo real
docker compose -f docker-compose.local.yml logs -f
```

### Parar o sistema

```bash
docker compose -f docker-compose.local.yml down
```

> [!CAUTION]
> **NUNCA use `docker compose down -v`** a não ser que queira **apagar todos os dados do banco**. A flag `-v` remove os volumes, destruindo permanentemente o banco de dados.

### Reiniciar o sistema

```bash
docker compose -f docker-compose.local.yml restart
```

Ou parar e subir novamente:
```bash
docker compose -f docker-compose.local.yml down
docker compose -f docker-compose.local.yml --env-file .env.docker up -d
```

---

## Backup do Banco de Dados

### Criar backup

```bash
docker exec upa-db pg_dump -U upa_user -d upa_do_tenis > backup_upa_$(Get-Date -Format 'yyyy-MM-dd_HHmmss').sql
```

**No PowerShell (Windows):**
```powershell
docker exec upa-db pg_dump -U upa_user -d upa_do_tenis | Out-File -Encoding utf8 "backup_upa_$(Get-Date -Format 'yyyy-MM-dd_HHmmss').sql"
```

**No Git Bash / Linux / Mac:**
```bash
docker exec upa-db pg_dump -U upa_user -d upa_do_tenis > "backup_upa_$(date +%Y-%m-%d_%H%M%S).sql"
```

> [!TIP]
> Substitua `upa_user` pelo valor configurado em `POSTGRES_USER` no seu `.env.docker`, caso tenha alterado.

### Confirmar backup

Verifique que o arquivo `.sql` foi criado e tem tamanho razoável:

```bash
ls -la backup_upa_*.sql
```

### Restaurar backup

```bash
# Parar a aplicação (manter apenas o banco)
docker compose -f docker-compose.local.yml stop app

# Restaurar o backup
docker exec -i upa-db psql -U upa_user -d upa_do_tenis < backup_upa_2026-01-01_120000.sql

# Reiniciar a aplicação
docker compose -f docker-compose.local.yml --env-file .env.docker up -d app
```

> [!WARNING]
> A restauração substitui os dados existentes. Certifique-se de ter um backup atualizado antes de restaurar.

---

## Atualizar a Aplicação

Quando houver uma nova versão do código:

```bash
# 1. Atualizar o código-fonte
git pull origin main

# 2. Rebuild e reiniciar
docker compose -f docker-compose.local.yml --env-file .env.docker up -d --build
```

O Prisma aplicará automaticamente novas migrations ao iniciar.

---

## Troubleshooting

### Erro: "Cannot connect to the Docker daemon"

O Docker Desktop não está rodando. Abra o Docker Desktop e aguarde a inicialização.

### Erro: "Port 3000 already in use"

Outro processo está usando a porta 3000. Feche-o ou altere a porta no `docker-compose.local.yml`:

```yaml
ports:
  - "3001:3000"  # Acessar via localhost:3001
```

### Erro: "Port 5433 already in use"

Outro PostgreSQL está rodando na porta 5433. Pare-o ou altere no `docker-compose.local.yml`.

### Container reinicia em loop

Verifique os logs:
```bash
docker compose -f docker-compose.local.yml logs --tail=200 app
```

Causas comuns:
- `DATABASE_URL` incorreta.
- `AUTH_SESSION_SECRET` não definida.
- Banco não está saudável.

### Build demora muito na primeira vez

Normal. O Docker precisa baixar as imagens base (~200 MB) e instalar dependências. Builds subsequentes usam cache e são mais rápidos.

### Dados sumiram após reinício

Se usou `docker compose down -v`, os volumes foram removidos. Restaure a partir do backup.

Se usou apenas `docker compose down` (sem `-v`), os dados estão preservados.

---

## Riscos e Cuidados

| Risco | Mitigação |
|---|---|
| `docker compose down -v` apaga dados | **Nunca usar `-v`** em produção. Documentar para toda a equipe. |
| Sem backup, dados podem ser perdidos | Fazer backup diário com `pg_dump`. |
| Desktop desligou sem `docker compose down` | Containers reiniciam automaticamente (`restart: unless-stopped`). |
| Disco cheio | Monitorar espaço. Logs do Docker podem crescer. |
| Atualização quebra migrations | Testar atualização em ambiente de dev antes. |

---

## Arquitetura dos Containers

```
┌─────────────────────────────────────────────┐
│              Docker Host (Desktop)           │
│                                              │
│  ┌──────────────────┐  ┌──────────────────┐  │
│  │     upa-app       │  │     upa-db        │ │
│  │   Next.js 14      │  │  PostgreSQL 16    │ │
│  │   Standalone      │──│  Alpine           │ │
│  │   :3000           │  │  :5432            │ │
│  └──────────────────┘  └──────────────────┘  │
│          │                      │            │
│          ▼                      ▼            │
│    localhost:3000         localhost:5433      │
│                          upa_postgres_data   │
│                          (volume persistente)│
└─────────────────────────────────────────────┘
```
