# UPA do Tênis - Sapataria Alves

Sistema web para gestão operacional de sapataria.

## Escopo do MVP

- Clientes
- Serviços
- Ordens de Serviço
- Financeiro da OS
- Pagamentos
- Estoque
- Insumos
- Dashboard
- Relatórios
- Controle de Caixa
- Homologação e documentação por fase

## Princípios

1. Evoluir por fases.
2. Preservar regras homologadas.
3. Proteger áreas críticas: financeiro, estoque e caixa.
4. Executar testes e build antes de concluir entregas.
5. Registrar documentação técnica e homologação.

## Banco de dados (PostgreSQL)

O projeto usa PostgreSQL via Prisma, com um banco separado por ambiente:

- **Desenvolvimento**: `.env.development` (`DATABASE_URL` aponta para um Postgres local de dev, ex. `upa_do_tenis_dev`).
- **Teste**: `.env.test` (`DATABASE_URL` aponta para um Postgres **separado**, ex. `upa_do_tenis_test`). O `vitest.config.ts` carrega esse arquivo automaticamente.
- **Produção**: `DATABASE_URL` vem apenas de variável de ambiente segura do provedor de hospedagem — nunca de arquivo versionado. Use `.env.production.example` como referência de formato (com `sslmode=require`).

Nenhum desses arquivos (exceto os `.example`) deve ser commitado — todos estão no `.gitignore`.

### Exemplo de conexão

```
DATABASE_URL="postgresql://user:password@localhost:5432/upa_do_tenis_dev?schema=public"
```

### Comandos de migration

```bash
npx prisma generate
npx prisma migrate dev --name init   # cria a primeira migration Postgres (ambiente de dev)
npx prisma migrate deploy            # aplica migrations pendentes em produção
```

### Comandos de teste

```bash
npm run test
```

> **Aviso crítico:** nunca aponte `.env.test` ou `.env.development` para o banco de produção. Os testes podem limpar/recriar tabelas — rodar contra produção pode causar perda de dados real.

## Validações padrão

```bash
git status
git diff --stat
npm run lint
npm run test
npm run build
```

## Produção Local (Docker)

O sistema pode rodar em produção local piloto via Docker. Para quem opera o computador da loja no dia a dia, siga o:

- **[Guia do Operador](GUIA_OPERADOR_DOCKER_LOCAL.md)** — passo a passo simples: subir, parar, backup, restauração, erros comuns.

Para detalhes técnicos completos:

- **[Documentação Docker Local](docs/04-producao/FATIA_PRODUCAO_03_DOCKER_LOCAL.md)** — arquitetura e comandos completos.
- **[Roteiro de Homologação](docs/04-producao/HOMOLOGACAO_FATIA_PRODUCAO_03.md)** — checklist de validação.

Comandos rápidos:

```bash
cp .env.docker.example .env.docker   # configurar variáveis
docker compose -f docker-compose.local.yml --env-file .env.docker up -d
# Acessar: http://localhost:3000
```

## Continuidade com IA

- Use ChatGPT para estratégia, auditoria, documentação e prompts.
- Use Claude Code para implementação assistida e validação local.
- Mantenha `CLAUDE.md` e `AGENTS.md` atualizados na raiz do repositório.
