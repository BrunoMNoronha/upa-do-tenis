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
