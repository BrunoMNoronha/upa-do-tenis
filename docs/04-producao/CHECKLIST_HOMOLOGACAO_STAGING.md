# Checklist de Homologação — Staging

Executar após cada deploy em staging, antes de considerar o ambiente pronto para servir de referência ao go-live. Registrar evidência (print, log ou observação) de cada item.

## Pré-requisitos

- [ ] Deploy de staging concluído sem erro de build/start.
- [ ] `AUTH_SESSION_SECRET` e `DATABASE_URL` de staging confirmados como próprios (não reaproveitados de outro ambiente).
- [ ] `pnpm exec prisma migrate status` sem pendências.
- [ ] `pnpm run bootstrap:admin` executado (ou usuário admin já existente confirmado).

## 1. Login e sessão

- [ ] Login com usuário válido funciona.
- [ ] Login com credenciais inválidas retorna erro apropriado (não `500`).
- [ ] Cookie de sessão emitido com `httpOnly`, `secure`, `sameSite=lax`.
- [ ] Sessão persiste entre navegações (não desloga sozinho durante uso normal).

## 2. Middleware / APIs protegidas

- [ ] Em aba anônima, acessar página privada (`/dashboard`) redireciona para `/login`.
- [ ] Sem sessão, `/api/dashboard`, `/api/caixa`, `/api/clientes`, `/api/vendas`, `/api/relatorios/financeiro-os` respondem `401`.
- [ ] Com sessão válida, as mesmas rotas respondem `200` com dados corretos.

## 3. CRUD Clientes

- [ ] Criar cliente.
- [ ] Listar/buscar cliente.
- [ ] Editar cliente (quando aplicável).
- [ ] Excluir cliente sem vínculo (204) e tentar excluir com OS vinculada (409, bloqueado).

## 4. CRUD Serviços

- [ ] Criar serviço.
- [ ] Listar serviços.
- [ ] Excluir serviço sem vínculo (204) e com vínculo (409, bloqueado).

## 5. CRUD Ordens de Serviço (OS)

- [ ] Criar OS vinculada a cliente e serviço.
- [ ] Consultar detalhe da OS.
- [ ] Alterar status da OS (transição permitida) e confirmar histórico registrado.
- [ ] Tentar transição de status inválida e confirmar bloqueio.

## 6. Financeiro da OS

- [ ] Registrar pagamento em uma OS.
- [ ] Saldo da OS recalculado corretamente após pagamento.
- [ ] Consultar lista de pagamentos da OS.

## 7. Caixa

- [ ] Abrir caixa.
- [ ] Registrar movimentação de caixa (entrada/saída).
- [ ] Fechar caixa e conferir totais por forma de pagamento.
- [ ] Consultar histórico de caixas.

## 8. Estoque / Insumos

- [ ] Cadastrar insumo.
- [ ] Registrar movimentação manual de insumo.
- [ ] Consumir insumo via item de OS e confirmar baixa de estoque.
- [ ] Consultar alertas de estoque crítico.

## 9. Vendas de balcão

- [ ] Registrar venda de balcão com produto e forma de pagamento.
- [ ] Consultar detalhe da venda.
- [ ] Confirmar impacto da venda no caixa aberto.

## 10. Dashboard

- [ ] Métricas do dashboard carregam sem erro.
- [ ] Valores exibidos condizem com os lançamentos feitos nos testes acima.

## 11. Relatórios

- [ ] Relatório financeiro de OS carrega e filtra por período.
- [ ] Relatório de estoque carrega (estatísticas, críticos, movimentações).

## 12. Logout

- [ ] Logout encerra a sessão.
- [ ] Após logout, tentativa de acessar página privada redireciona para `/login`.
- [ ] Após logout, API privada responde `401`.

## 13. Erros e estados de interface

- [ ] Acessar rota inexistente retorna página/erro 404 tratado (não crash em branco).
- [ ] Forçar um erro de servidor (ex.: payload inválido em endpoint crítico) retorna erro tratado, não vaza stack trace sensível ao usuário final.
- [ ] Telas de listagem sem dados exibem estado vazio tratado (não erro, não tela quebrada).
- [ ] Estados de carregamento (loading) aparecem corretamente durante requisições, sem travar a interface.

## 14. Console e logs

- [ ] DevTools sem erros relevantes de console durante os fluxos acima.
- [ ] Logs do servidor de staging sem erro fatal recorrente.

## Veredito

[ ] Staging aprovado como referência para go-live
[ ] Staging aprovado com ressalvas (listar)
[ ] Staging reprovado (listar bloqueios)
