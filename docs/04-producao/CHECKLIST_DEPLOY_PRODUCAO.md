# Checklist de Deploy Controlado — Produção

Usar este checklist a cada deploy em produção. Não avançar para o próximo item sem confirmar o anterior. Registrar evidências dos passos 7 a 12 no relatório de homologação correspondente.

## 1. Confirmar commit

- [ ] Commit a ser implantado identificado (`git log --oneline -1`).
- [ ] Commit corresponde exatamente ao que foi revisado/homologado (nenhuma alteração não revisada incluída).

## 2. Confirmar branch

- [ ] Branch correta (`main` ou branch de produção definida) está no commit esperado.
- [ ] `git status -sb` limpo, sem alterações locais não commitadas.

## 3. Confirmar variáveis de ambiente

- [ ] `NODE_ENV=production` definido no ambiente de destino.
- [ ] `DATABASE_URL` aponta para o **banco de produção**, não para dev/teste (ver `VARIAVEIS_AMBIENTE_PRODUCAO.md`).
- [ ] `AUTH_SESSION_SECRET` definido, único para produção, gerado com `openssl rand -hex 32`.
- [ ] Nenhum segredo real presente no repositório ou em `NEXT_PUBLIC_*`.

## 4. Confirmar banco de produção

- [ ] Banco de produção é fisicamente separado do banco de desenvolvimento/teste.
- [ ] Backup manual realizado imediatamente antes do deploy (ver `PLANO_BACKUP_RESTORE.md`).
- [ ] `pnpm exec prisma migrate status` executado contra o banco de produção e revisado.

## 5. Rodar migrations

- [ ] `pnpm exec prisma migrate deploy` executado contra o banco de produção (nunca `migrate dev` ou `migrate reset` em produção).
- [ ] `pnpm exec prisma generate` executado (ou incluído no build).
- [ ] Nenhuma migration destrutiva (`DROP TABLE`/`DROP COLUMN` sem plano) aplicada sem autorização explícita.

## 6. Subir aplicação

- [ ] Build de produção executado sem erro (`pnpm run build`).
- [ ] Aplicação iniciada (`pnpm run start` ou processo equivalente do provedor).

## 7. Validar logs

- [ ] Logs de inicialização sem erro fatal.
- [ ] Nenhum erro relacionado a `AUTH_SESSION_SECRET` ausente ou `DATABASE_URL` inválida.

## 8. Testar login

- [ ] Login com usuário administrador válido funciona.
- [ ] Cookie de sessão emitido com `httpOnly`, `secure` (produção) e `sameSite=lax`.

## 9. Testar rotas privadas sem sessão

- [ ] Em aba anônima, `/dashboard` (ou outra página privada) redireciona para `/login`.
- [ ] `/api/dashboard`, `/api/caixa`, `/api/clientes`, `/api/vendas`, `/api/relatorios/financeiro-os` respondem `401` sem cookie.

## 10. Testar fluxo mínimo

- [ ] Criar cliente.
- [ ] Criar ordem de serviço.
- [ ] Registrar pagamento.
- [ ] Movimentar caixa (abertura/fechamento ou lançamento).
- [ ] Registrar venda de balcão.
- [ ] Conferir dashboard e relatório financeiro refletindo os lançamentos.

## 11. Validar backup

- [ ] Backup pós-deploy gerado e íntegro (novo dump após a aplicação das migrations).

## 12. Registrar evidências

- [ ] Prints ou logs de cada etapa acima anexados ao relatório de homologação do deploy.
- [ ] Hash do commit implantado registrado.
- [ ] Horário de início e fim do deploy registrado.

## 13. Decisão go/no-go

- [ ] Todos os itens acima marcados.
- [ ] Nenhum critério de rollback (ver `PLANO_ROLLBACK.md`) foi acionado.
- [ ] Responsável (Bruno) confirma decisão final: **go** ou **no-go**.

Em caso de qualquer item não atendido, **não prosseguir** — aplicar o `PLANO_ROLLBACK.md` se o deploy já estiver em curso, ou interromper antes de subir a aplicação.

---

## Trilha cloud (Vercel + Neon)

Quando o deploy for para o ambiente cloud descrito em [FATIA_PRODUCAO_04_VERCEL_NEON.md](FATIA_PRODUCAO_04_VERCEL_NEON.md), os itens 1 a 4 e 7 a 13 acima continuam valendo integralmente. Os itens **5 (migrations)** e **6 (subir aplicação)** são substituídos pela sequência abaixo, **nesta ordem**.

> [!NOTE]
> Esta ordem vale a partir do **segundo release**. No primeiro rollout ela se inverte: `workflow_dispatch` só fica disponível depois que `migracoes.yml` existe na branch padrão, então o merge vem antes do primeiro dispatch. Ver a Etapa 3 de [WALKTHROUGH_FATIA_PRODUCAO_04.md](WALKTHROUGH_FATIA_PRODUCAO_04.md).

### 5c. Backup pré-migration

- [ ] Dump lógico da branch `production` do Neon gerado (ver seção "Neon" em [PLANO_BACKUP_RESTORE.md](PLANO_BACKUP_RESTORE.md)).

### 6c. Migrations via workflow aprovado

- [ ] Migrations do PR revisadas e confirmadas como **backward-compatible** com a versão da aplicação atualmente em produção — entre este passo e o passo 8c a versão antiga roda contra o schema novo.
- [ ] GitHub → **Actions → Migrations (Neon) → Run workflow** com `ambiente = production` e `confirmacao = APLICAR`.
- [ ] Execução aprovada pelo required reviewer do Environment `production`.
- [ ] Linha `Datasource "db": ... at "<host>"` do passo *Status antes* conferida: o host é o da branch `production` do Neon.
- [ ] Passo *Status depois* verde (`Database schema is up to date!`).

> [!CAUTION]
> Nunca executar `prisma migrate dev`, `prisma db push`, `prisma migrate reset` ou `pnpm run seed` contra Production. `prisma migrate deploy` não dispara o seed configurado — manter assim.

### 7c. Deploy da aplicação

- [ ] Merge do PR em `main`.
- [ ] Build da Vercel verde; log conferido (`Detected package manager`, versão do Node ≥ 22.13, `Generated Prisma Client`).
- [ ] Deployment com status **Ready**.

### 8c. Migrations na branch de Preview

- [ ] **Actions → Migrations (Neon)** com `ambiente = preview`, para a branch de Preview não sofrer drift de schema.

### 9c. Validação pós-deploy

- [ ] **Runtime Logs** da Vercel sem `P1001` (conexão), `P2024` (timeout de pool) nem erro de prepared statement — este último indicaria falta de `pgbouncer=true` na URL pooled.
- [ ] Seguir normalmente os itens 7 a 13 do checklist principal.

### Se algo falhar

Aplicar a seção "Rollback no ambiente Vercel + Neon" de [PLANO_ROLLBACK.md](PLANO_ROLLBACK.md). O Instant Rollback da Vercel resolve em segundos quando a migration é backward-compatible — é essa a razão da exigência no item 6c.
