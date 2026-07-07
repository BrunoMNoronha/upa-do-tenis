# Relatório Técnico — Fatia Produção 01

Data: 2026-07-06
Marco: MVP — Primeira Etapa de Produção

## Objetivo

Preparar a primeira versão produtiva do MVP com ambiente separado, configuração segura, banco de produção, backup validado, documentação de deploy e checklist de rollback, sem executar go-live definitivo.

## Diagnóstico inicial

- **Branch:** `main`, limpa antes desta fatia, 1 commit à frente de `origin/main` (`dc71a4a` — Fatia Segurança 01, não empurrado).
- **Commit atual:** `dc71a4a` (`feat(auth): protect private pages and critical APIs`).
- **Estado do Git:** sem alterações pendentes antes do início da fatia.
- **Existe auto-deploy:** nenhum arquivo de CI/CD encontrado no repositório (`.github/workflows`, `vercel.json`, `render.yaml`, `railway.json`, `netlify.toml`, `Dockerfile`, `docker-compose.yml` — nenhum existe). **Não é possível descartar** uma integração configurada fora do repositório (ex.: projeto conectado via dashboard de um provedor). Pendência a confirmar com o Bruno antes de qualquer `git push` para `main`.
- **Plataforma detectada:** nenhuma (aplicação Next.js standalone; remote único é GitHub, `github.com/BrunoMNoronha/upa-do-tenis.git`).
- **Arquivos de ambiente encontrados:** `.env`, `.env.development`, `.env.test`, `.env.production` (todos locais, corretamente listados no `.gitignore`, não versionados); `.env.example` e `.env.production.example` (versionados, apenas placeholders — já existiam e já estavam corretos, sem segredo real).
- **Banco atual identificado:** PostgreSQL 16, todos os 4 arquivos `.env*` locais apontando para `localhost:5432`, com banco distinto por ambiente (`upa_do_tenis_dev`, `upa_do_tenis_test`, `upa_do_tenis_prd`). Nenhum aponta hoje para um host de produção real — `upa_do_tenis_prd` é apenas um nome de banco local, não uma instância de produção provisionada.
- **Scripts disponíveis:** `prisma:generate`, `prisma:migrate` (dev), `prisma:studio`, `seed`, `bootstrap:admin`, além dos scripts padrão (`dev`, `build`, `start`, `lint`, `test`, `typecheck`).
- **CI/CD encontrado:** nenhum.

Achados adicionais relevantes ao escopo:

- `scripts/bootstrap-admin.ts` + `src/lib/bootstrap-admin.ts` já implementam criação segura do primeiro administrador: só age se `prisma.usuario.count() === 0`, credenciais via variáveis de ambiente ou prompt interativo sem eco no terminal, sem senha fixa.
- `prisma/seed.ts` já tem guarda contra sobrescrita (`if (countClientes > 0) return`), evitando rodar sobre um banco com dados reais.
- `prisma/homologacao.ts` é um script de simulação manual para dev/homologação guiada — não deve ser executado em produção (não faz parte do fluxo de deploy).
- `npx prisma migrate status` contra o banco de desenvolvimento confirmou schema em dia, 4 migrations aplicadas, nenhuma pendente.

## Implementação realizada

Somente documentação — nenhum código de aplicação, schema ou regra de negócio foi alterado:

1. Criada pasta `docs/04-producao/` com 4 documentos: variáveis de ambiente, checklist de deploy controlado, plano de backup/restore e plano de rollback.
2. **Teste real de backup/restore** executado em ambiente local isolado (container Docker `upa-postgres`, Postgres 16): dump do banco de desenvolvimento → restore em banco temporário criado especificamente para o teste → validação de contagem de tabelas e registros → limpeza do banco temporário e do arquivo de dump. Nenhum banco existente (dev/test/produção local) foi alterado; apenas um banco descartável foi criado e removido.
3. Este relatório técnico.

## Arquivos criados ou alterados

Novos (todos em `docs/`, nenhum código):
- `docs/04-producao/VARIAVEIS_AMBIENTE_PRODUCAO.md`
- `docs/04-producao/CHECKLIST_DEPLOY_PRODUCAO.md`
- `docs/04-producao/PLANO_BACKUP_RESTORE.md`
- `docs/04-producao/PLANO_ROLLBACK.md`
- este relatório

Nenhum arquivo de código, schema ou `.env*` foi criado ou alterado. `.env.production.example` já existia e já estava correto (revisado, sem necessidade de ajuste).

## Variáveis de produção documentadas

`NODE_ENV`, `DATABASE_URL` e `AUTH_SESSION_SECRET` — detalhes, forma de geração do segredo e checklist de verificação em `docs/04-producao/VARIAVEIS_AMBIENTE_PRODUCAO.md`. Confirmado: nenhuma variável `NEXT_PUBLIC_*` existe no projeto hoje.

## Banco de produção

- **Estratégia:** banco PostgreSQL fisicamente separado do banco de desenvolvimento/teste, provisionado no momento do deploy real (ainda não existe uma instância de produção real — pendência explícita, ver abaixo).
- **Migrations:** aplicar com `npx prisma migrate deploy` (nunca `migrate dev` ou `migrate reset` em produção); `npx prisma generate` no build; `npx prisma migrate status` como checagem antes e depois.
- **Admin inicial:** reutilizar `npm run bootstrap:admin` já existente (seguro, idempotente — só age se não houver usuário). Nenhuma alteração necessária neste script.
- **Restrições:** documentadas no checklist — nunca reaproveitar banco dev/test como produção; nunca rodar seed ou script destrutivo contra produção; backup obrigatório antes de qualquer migration em produção.

## Backup e restore

- **Estratégia de backup:** `pg_dump` diário + backup manual antes de deploy/migration, retenção mínima 7 diários + 4 semanais, armazenamento fora do servidor de aplicação.
- **Estratégia de restore:** sempre primeiro em banco temporário isolado, com checklist de validação (contagem de tabelas, contagem de registros de tabela crítica, `prisma migrate status`, smoke test de login).
- **Teste realizado:** ciclo completo executado localmente (Docker, Postgres 16) — dump de 1298 linhas/48 KB do banco de desenvolvimento, restaurado em banco temporário `upa_restore_teste`, validado (19 tabelas e 1 usuário em ambos os lados), banco temporário e dump removidos ao final. Procedimento comprovadamente funcional.
- **Pendências:** repetir o mesmo teste contra o banco de produção real (ou uma cópia dele) assim que provisionado, antes do go-live; definir destino de armazenamento externo dos backups; automatizar a rotina diária.

## Plano de rollback

- **Critérios de rollback:** falha de build/start, login quebrado, erro 5xx recorrente em API crítica, divergência em dado financeiro exibido, migration corrompendo schema/dados, enforcement de autenticação falhando, erros não tratados recorrentes pós-deploy.
- **Procedimento:** `git revert` do commit problemático (preferido a `reset --hard` em branch já publicada) + reimplantação; ou restauração de backup em banco temporário validado antes de aplicar sobre produção, se o problema for de dados/schema.
- **Responsável pela decisão:** Bruno.

## Comandos executados

| Comando | Resultado |
|---|---|
| `git status -sb` / `git log --oneline -5` / `git diff --stat` / `git remote -v` | branch `main` limpa, 1 commit à frente de `origin/main`, remote único (GitHub) |
| `npx prisma migrate status` (banco dev) | schema em dia, 4 migrations, nada pendente |
| Teste de backup/restore (Docker, ambiente isolado) | ciclo completo validado, ambiente de teste limpo ao final |
| `npm run lint` | ✔ sem erros (executado 2x: diagnóstico inicial e pós-documentação) |
| `npm run test` | ✔ 323 testes, 32 arquivos (executado 2x) |
| `npm run build` | ✔ build limpo, 30 páginas, middleware Edge 27,1 kB (executado 2x) |

## Riscos remanescentes

1. **Não existe hoje uma instância de banco de produção real** — todo o ambiente atual (incluindo o banco nomeado "prd") roda em `localhost`. Provisionamento de um banco de produção de fato (host gerenciado, backup automatizado pelo provedor, rede restrita) é pré-requisito para o go-live.
2. **Auto-deploy não confirmado/descartado** — não há CI/CD no repositório, mas integração via dashboard de provedor (Vercel/Render/Railway/Netlify) não pode ser descartada sem confirmação direta do Bruno. Recomendo confirmar antes de qualquer `git push` para `main`.
3. Teste de restore foi validado tecnicamente em ambiente local/descartável, mas ainda não contra um banco de produção real ou uma cópia fiel dele.
4. Backups ainda não têm rotina automatizada nem destino de armazenamento externo definido.
5. `AUTH_SESSION_SECRET` de produção ainda não foi gerado/definido em nenhum ambiente real (correto nesta fase — só deve ser gerado no momento do provisionamento).

## Pendências

- Confirmar com o Bruno se `main` está conectada a algum auto-deploy externo.
- Provisionar o banco de produção real (fisicamente separado, com backup gerenciado ou automatizado).
- Gerar e configurar `AUTH_SESSION_SECRET` de produção no momento do provisionamento (não commitar).
- Repetir o teste de backup/restore contra o ambiente de produção real (ou staging fiel) antes do go-live.
- Definir armazenamento externo e automação da rotina de backup.

## Veredito

[x] Aprovado tecnicamente
[ ] Aprovado com ressalvas
[ ] Reprovado

Toda a documentação exigida foi criada, o procedimento de backup/restore foi testado de ponta a ponta em ambiente seguro e isolado, lint/testes/build seguem aprovados, e nenhuma regra financeira, de estoque, caixa ou schema foi alterada.

## Próximo passo recomendado

Homologação em staging/produção espelho antes do go-live (Fatia Produção 02): provisionar um ambiente que reproduza produção (banco separado real, variáveis reais de staging) e repetir o checklist de deploy controlado e o teste de backup/restore contra esse ambiente, antes de considerar o go-live definitivo.
