# Plano de Staging (Produção Espelho)

Ambiente intermediário entre desenvolvimento e produção real, usado para homologar deploy, migrations e fluxo completo antes do go-live. Staging deve se comportar o mais próximo possível de produção, mas com dados fictícios/descartáveis.

## Por que staging é obrigatório antes do go-live

A Fatia Produção 01 (`docs/03-homologacao/relatorios/RELATORIO_TECNICO_FATIA_PRODUCAO_01_AMBIENTE_BACKUP_DEPLOY_2026-07-06.md`) documentou e testou o procedimento de deploy, backup e restore, mas **contra ambiente local** — nenhum banco de produção real existe ainda, e não há confirmação de plataforma de hospedagem nem de CI/CD. Staging é o primeiro ambiente onde o processo documentado é exercitado contra uma infraestrutura real (ainda que menor), antes de arriscar produção.

## Variáveis próprias de staging

Staging **nunca** compartilha variáveis com desenvolvimento, teste ou produção. Seguindo o padrão de `docs/04-producao/VARIAVEIS_AMBIENTE_PRODUCAO.md`:

| Variável | Valor em staging |
|---|---|
| `NODE_ENV` | `production` (staging roda em modo de produção do Next.js — é isso que valida o build real; a distinção staging/produção é apenas de infraestrutura e dados, não de `NODE_ENV`) |
| `DATABASE_URL` | Banco PostgreSQL **próprio de staging**, fisicamente separado de dev, teste e produção (ex.: `upa_do_tenis_staging`, host próprio) |
| `AUTH_SESSION_SECRET` | Segredo **próprio de staging**, gerado com `openssl rand -hex 32`, nunca reaproveitado de nenhum outro ambiente |

Nenhuma variável `NEXT_PUBLIC_*` deve conter segredo (mesma regra de produção).

## Estratégia de migrations em staging

1. Antes de cada deploy em staging: `pnpm exec prisma migrate status` contra o banco de staging para conferir o que está pendente.
2. Aplicar com `pnpm exec prisma migrate deploy` (nunca `migrate dev` — staging deve validar exatamente o comando que rodará em produção).
3. `pnpm exec prisma generate` como parte do build.
4. Staging é o ambiente correto para detectar problemas de migration **antes** de produção — qualquer falha aqui bloqueia o avanço para produção até ser corrigida.

## Estratégia de bootstrap-admin em staging

- Reutilizar `pnpm run bootstrap:admin` (já existente, seguro — só age se `prisma.usuario.count() === 0`).
- Credenciais do admin de staging via variáveis de ambiente próprias (`BOOTSTRAP_ADMIN_NOME`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_SENHA`) definidas apenas no ambiente de staging, com senha diferente da usada em qualquer outro ambiente.
- Nunca usar a mesma senha de staging em produção.

## Estratégia de rollback em staging

Staging é justamente o lugar para **testar** o `PLANO_ROLLBACK.md` sem risco:
1. Antes de validar um novo deploy, registrar o commit/estado anterior estável de staging.
2. Se o smoke test (`CHECKLIST_HOMOLOGACAO_STAGING.md`) falhar, executar o procedimento de rollback documentado em `PLANO_ROLLBACK.md` contra staging, para confirmar que o procedimento funciona antes de precisar dele em produção.
3. Qualquer falha do rollback em staging é motivo para revisar o plano antes do go-live — não deve chegar em produção sem ter sido exercitado.

## Dados de staging

- Popular com `pnpm run seed` (já protegido contra sobrescrita) para ter um conjunto mínimo de clientes, serviços e OS fictícios para os smoke tests.
- Nunca copiar dados reais de clientes para staging sem anonimização — como ainda não há produção real, esta fatia não enfrenta esse problema, mas fica registrado para quando produção existir.

## Pendências para provisionar staging

1. Confirmar/decidir a plataforma de hospedagem (nenhuma foi identificada no repositório — ver diagnóstico do relatório técnico desta fatia).
2. Provisionar banco PostgreSQL próprio de staging.
3. Gerar `AUTH_SESSION_SECRET` próprio de staging.
4. Configurar as variáveis no provedor escolhido.
5. Executar o `CHECKLIST_HOMOLOGACAO_STAGING.md` completo antes de considerar staging "homologado".
