# Checklist de Go-Live — Produção

Este checklist é a decisão final antes do go-live real. Diferente do `CHECKLIST_DEPLOY_PRODUCAO.md` (que cobre a mecânica de um deploy específico) e do `CHECKLIST_HOMOLOGACAO_STAGING.md` (que valida o ambiente espelho), este documento reúne os **pré-requisitos de negócio e de risco** que precisam estar satisfeitos antes de autorizar o primeiro uso real em produção.

## Pré-requisitos de segurança (Fatia Segurança 01)

- [ ] Commit `dc71a4a` (ou posterior) presente na branch de produção.
- [ ] Enforcement de autenticação server-side validado em staging (middleware + `exigirSessaoApi`).
- [ ] Nenhuma API crítica responde `200` sem sessão.
- [ ] Nenhuma página privada renderiza sem sessão.

## Pré-requisitos de ambiente (Fatia Produção 01)

- [ ] `NODE_ENV=production` confirmado no ambiente real.
- [ ] `DATABASE_URL` de produção aponta para banco fisicamente separado de dev/teste/staging.
- [ ] `AUTH_SESSION_SECRET` de produção gerado com `openssl rand -hex 32`, exclusivo, não reaproveitado de staging/dev.
- [ ] Nenhum segredo real commitado no repositório.
- [ ] `bootstrap-admin` executado uma única vez em produção, com senha exclusiva de produção.

## Pré-requisitos de staging (Fatia Produção 02)

- [ ] `CHECKLIST_HOMOLOGACAO_STAGING.md` executado e aprovado (sem reprovação em nenhum item crítico).
- [ ] `PLANO_ROLLBACK.md` testado com sucesso em staging pelo menos uma vez.
- [ ] Deploy em staging seguiu exatamente o mesmo procedimento planejado para produção (`CHECKLIST_DEPLOY_PRODUCAO.md`).

## Pré-requisitos de backup e continuidade

- [ ] Estratégia de backup automatizada e com destino externo definido (não apenas testada manualmente).
- [ ] Teste de restore realizado contra staging ou uma cópia fiel de produção (não apenas contra banco de desenvolvimento).
- [ ] `PLANO_ROLLBACK.md` revisado e compreendido pelo responsável pela decisão de rollback.

## Pré-requisitos operacionais

- [ ] Plataforma de hospedagem definida e confirmada (não deve restar dúvida sobre auto-deploy).
- [ ] Responsável pela decisão de go/no-go identificado (Bruno).
- [ ] Canal/local de registro de incidentes definido (onde o rollback será documentado, conforme `PLANO_ROLLBACK.md`).
- [ ] Horário de go-live definido considerando menor impacto operacional (fora do horário de maior movimento da sapataria).

## Critérios de bloqueio (não avançar se qualquer um for verdadeiro)

- Qualquer item acima não confirmado.
- `lint`, `test` ou `build` falhando na branch de produção.
- Staging reprovado ou aprovado apenas "com ressalvas" não resolvidas.
- Dúvida não esclarecida sobre auto-deploy/CI/CD.
- Backup e restore não testados contra ambiente real (ou staging fiel).

## Decisão final

- [ ] Go — autorizado por: ___________________ Data: ___________
- [ ] No-Go — motivo: ______________________________________________

## Após o go-live (primeiras 24h)

- [ ] Monitorar logs de erro continuamente.
- [ ] Confirmar primeiro backup automatizado gerado com sucesso.
- [ ] Executar smoke test reduzido (login, uma operação de cada módulo crítico) contra o ambiente real.
- [ ] Manter plano de rollback pronto e revisado durante a janela inicial.

---

## Pré-requisitos de ambiente cloud (Fatia Produção 04)

Aplicável quando o go-live for na Vercel + Neon ([FATIA_PRODUCAO_04_VERCEL_NEON.md](FATIA_PRODUCAO_04_VERCEL_NEON.md)). Substitui o item "Plataforma de hospedagem definida" da seção operacional, e **não** dispensa nenhum outro pré-requisito acima.

- [ ] [HOMOLOGACAO_FATIA_PRODUCAO_04.md](HOMOLOGACAO_FATIA_PRODUCAO_04.md) preenchida e aprovada.
- [ ] **Isolamento Preview × Production comprovado pelas quatro provas** (direta, inversa, configuração e infraestrutura) — critério de bloqueio absoluto.
- [ ] Branch Neon de Preview criada **vazia**, sem qualquer dado real de clientes, ordens de serviço, pagamentos, estoque ou caixa.
- [ ] Nenhuma variável de ambiente no escopo "All Environments" da Vercel; escopo Development vazio.
- [ ] `DATABASE_URL_DIRECT` ausente da Vercel, presente apenas nos GitHub Environments.
- [ ] `AUTH_SESSION_SECRET` de Preview diferente do de Production.
- [ ] Nenhum `BOOTSTRAP_ADMIN_*` cadastrado como secret permanente em qualquer provedor.
- [ ] `bootstrap-admin` executado uma única vez em Production e **bloqueado na segunda execução** (evidência registrada).
- [ ] Environment `production` do GitHub com **required reviewers** configurado.
- [ ] Deployment Protection (Vercel Authentication) ativa no Preview.
- [ ] Retenção/PITR real do plano Neon registrada em [PLANO_BACKUP_RESTORE.md](PLANO_BACKUP_RESTORE.md) — valor lido no console, não estimado.
- [ ] Drill de restore executado **nas duas camadas**: PITR nativo em `restore-test-*` e `pg_restore` do dump offsite em `restore-dump-*`; branches de teste removidas.
- [ ] Instant Rollback da Vercel compreendido pelo responsável ([PLANO_ROLLBACK.md](PLANO_ROLLBACK.md)).
- [ ] CI (`.github/workflows/ci.yml`) verde na `main`.

### Critérios de bloqueio adicionais

- Isolamento Preview × Production não comprovado por qualquer uma das quatro provas.
- Qualquer secret real encontrado em arquivo versionado.
- Environment `production` sem required reviewers.
- Migration aplicada em Production por caminho que não seja o workflow `Migrations (Neon)`.
