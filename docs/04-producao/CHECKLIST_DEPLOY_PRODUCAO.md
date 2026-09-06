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
