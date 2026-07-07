# Guia do Operador — Sistema Local com Docker

Guia rápido e simples para quem opera o computador da loja no dia a dia.
Para detalhes técnicos completos, veja [`docs/04-producao/FATIA_PRODUCAO_03_DOCKER_LOCAL.md`](docs/04-producao/FATIA_PRODUCAO_03_DOCKER_LOCAL.md).

## O que é isso

O sistema UPA do Tênis roda dentro do computador da loja usando Docker. Ele fica disponível em `http://localhost:3000`, com os dados guardados de forma permanente no próprio computador.

## Pré-requisitos

- Docker Desktop instalado e **aberto** (rodando em segundo plano).
- Git instalado.
- Portas **3000** (aplicação) e **5433** (banco de dados) livres.
- Cerca de 2 GB de espaço em disco.

## 1. Clonar o repositório (primeira vez apenas)

```bash
git clone https://github.com/BrunoMNoronha/upa-do-tenis.git
cd upa-do-tenis
```

## 2. Criar o arquivo `.env.docker` (primeira vez apenas)

```bash
cp .env.docker.example .env.docker
```

Abra o `.env.docker` em um editor de texto e preencha:

```env
POSTGRES_USER=upa_user
POSTGRES_PASSWORD=SUA_SENHA_SEGURA_AQUI
POSTGRES_DB=upa_do_tenis
AUTH_SESSION_SECRET=SUA_CHAVE_AQUI
```

### Como gerar o `AUTH_SESSION_SECRET`

**PowerShell (Windows):**
```powershell
-join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Max 256) })
```

**Git Bash / Linux / Mac:**
```bash
openssl rand -hex 32
```

Copie o resultado e cole no campo `AUTH_SESSION_SECRET`.

## 3. Subir o sistema

```bash
docker compose -f docker-compose.local.yml --env-file .env.docker up -d
```

Na primeira vez, pode demorar alguns minutos (o Docker baixa e monta tudo sozinho).

## 4. Acessar o sistema

Abra o navegador em: **http://localhost:3000**

## 5. Verificar se está tudo rodando

```bash
docker compose -f docker-compose.local.yml ps
```

Os serviços `upa-app` e `upa-db` devem aparecer como `Up` ou `running`.

## 6. Parar o sistema

```bash
docker compose -f docker-compose.local.yml down
```

> [!CAUTION]
> **NUNCA use `docker compose down -v`.** A flag `-v` apaga permanentemente o banco de dados. Sem ela, os dados ficam guardados normalmente.

## 7. Reiniciar o sistema

```bash
docker compose -f docker-compose.local.yml restart
```

## 8. Atualizar o sistema (quando houver uma versão nova)

```bash
git pull origin main
docker compose -f docker-compose.local.yml --env-file .env.docker up -d --build
```

## 9. Fazer backup do banco de dados

**PowerShell:**
```powershell
docker exec upa-db pg_dump -U upa_user -d upa_do_tenis | Out-File -Encoding utf8 "backup_upa_$(Get-Date -Format 'yyyy-MM-dd_HHmmss').sql"
```

**Git Bash / Linux / Mac:**
```bash
docker exec upa-db pg_dump -U upa_user -d upa_do_tenis > "backup_upa_$(date +%Y-%m-%d_%H%M%S).sql"
```

Guarde esse arquivo `.sql` em um local seguro (pendrive, nuvem, outro computador). Ele **não** é enviado ao repositório automaticamente.

## 10. Restaurar um backup

> [!WARNING]
> Isso substitui os dados atuais pelos dados do backup. Só faça isso se tiver certeza — e, se possível, faça um backup do estado atual antes de restaurar.

```bash
docker compose -f docker-compose.local.yml stop app
docker exec -i upa-db psql -U upa_user -d upa_do_tenis < NOME_DO_ARQUIVO_DE_BACKUP.sql
docker compose -f docker-compose.local.yml --env-file .env.docker up -d app
```

## O que NUNCA fazer

- **Nunca** rodar `docker compose down -v` — apaga o banco de dados de vez.
- **Nunca** apagar a pasta de volumes do Docker manualmente.
- **Nunca** commitar ou compartilhar o arquivo `.env.docker` (ele tem senhas).
- **Nunca** restaurar um backup sem ter certeza de qual arquivo está usando.

## Erros comuns e o que fazer

| Situação | O que fazer |
|---|---|
| Docker Desktop fechado / "Cannot connect to the Docker daemon" | Abra o Docker Desktop e espere ele terminar de iniciar, depois repita o comando. |
| Porta 3000 ocupada | Feche o programa que está usando a porta, ou altere a porta em `docker-compose.local.yml` (ex.: `"3001:3000"`) e acesse por `localhost:3001`. |
| Porta 5433 ocupada | Feche o outro serviço usando essa porta, ou altere a porta do banco em `docker-compose.local.yml`. |
| Arquivo `.env.docker` ausente | Repita o passo 2 deste guia (`cp .env.docker.example .env.docker` e preencher os valores). |
| Container reiniciando sem parar | Rode `docker compose -f docker-compose.local.yml logs --tail=200 app` e veja a mensagem de erro. Causas comuns: `.env.docker` incompleto ou banco ainda não pronto. |
| Dados sumiram depois de um uso indevido | Provavelmente foi usado `docker compose down -v` por engano. Restaure o backup mais recente (passo 10). |

## Onde encontrar mais detalhes

- Documentação técnica completa: [`docs/04-producao/FATIA_PRODUCAO_03_DOCKER_LOCAL.md`](docs/04-producao/FATIA_PRODUCAO_03_DOCKER_LOCAL.md)
- Roteiro de homologação: [`docs/04-producao/HOMOLOGACAO_FATIA_PRODUCAO_03.md`](docs/04-producao/HOMOLOGACAO_FATIA_PRODUCAO_03.md)
