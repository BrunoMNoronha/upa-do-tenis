# Relatorio Marco 2 - Pagamentos da OS (Fase 6)

## Arquivos Criados

- RELATORIO_MARCO_2_PAGAMENTOS_OS_FASE_6.md
- src/lib/ordens-servico-pagamentos-schema.ts
- src/lib/ordens-servico-pagamentos.ts
- src/app/api/ordens-servico/[id]/pagamentos/route.ts
- src/lib/ordens-servico-pagamentos.test.ts

## Arquivos Alterados

- src/lib/ordens-servico-pagamentos.test.ts (ajuste de mock hoisted do Vitest)

## Endpoints Criados

- GET /api/ordens-servico/[id]/pagamentos
	- Valida id da OS.
	- Valida existencia da OS.
	- Lista pagamentos da OS com forma de pagamento (ordenacao por data/criacao desc).

- POST /api/ordens-servico/[id]/pagamentos
	- Valida id da OS.
	- Valida payload com Zod.
	- Registra pagamento com regras financeiras desta etapa.

## Schemas Criados

- ordemServicoPagamentoParamsSchema
	- Validacao de parametro id da OS.

- registrarPagamentoOrdemServicoSchema
	- formaPagamentoId obrigatorio.
	- tipo opcional (fallback para PAGAMENTO no registro).
	- valor com regra > 0.
	- dataPagamento com validacao de data valida.
	- observacoes opcional.

## Regras Implementadas

- Validacao de OS existente antes de listar e registrar pagamento.
- Validacao de forma de pagamento existente no POST.
- Bloqueio de pagamento com valor <= 0 via schema.
- Bloqueio de data de pagamento invalida via schema.
- Bloqueio de pagamento acima do saldo pendente.
- Registro em Pagamento ao confirmar POST.
- Recalculo obrigatorio via calcularResumoFinanceiroOS (modulo centralizado).
- Atualizacao de valorPago e saldo da OrdemServico apos registrar pagamento.
- Nao ha alteracao de status operacional da OS.
- Nao ha credito por sobrepagamento nesta fase (pagamento acima do saldo e bloqueado).
- Compatibilidade com OS antigas preservada porque o resumo financeiro continua considerando campos legados e composicao por itens/servicos quando aplicavel.

## Testes Criados ou Alterados

- src/lib/ordens-servico-pagamentos.test.ts
	- pagamento parcial (deve atualizar valorPago/saldo corretamente).
	- pagamento total (deve zerar saldo).
	- pagamento maior que saldo deve falhar.
	- pagamento com forma invalida deve falhar.
	- OS inexistente deve falhar.

## Resultado do npm run test

Comando executado:

npm run test

Saida consolidada:

- Test Files: 2 passed (2)
- Tests: 23 passed (23)
- Status: SUCESSO

## Resultado do npm run build

Comando executado:

npm run build

Saida consolidada:

- Build Next.js concluido com sucesso.
- Compilacao, lint e checagem de tipos aprovadas.
- Rota dinamica de pagamentos presente no output:
	- /api/ordens-servico/[id]/pagamentos
- Status: SUCESSO

## Riscos Restantes

- Ainda nao existe fluxo de estorno/cancelamento de pagamento.
- Nao ha controle de concorrencia otimista para dois pagamentos simultaneos na mesma OS.
- Ausencia de testes de integracao HTTP do endpoint (atualmente foco em regra de negocio no servico).
- Nao ha paginacao/filtro na listagem de pagamentos (pode impactar OS com alto volume historico).

## Recomendacao para o Proximo Marco

- Marco 3 sugerido: historico financeiro e consistencia transacional avancada.
	- Adicionar trilha de auditoria financeira por evento de pagamento/estorno.
	- Implementar protecao contra corrida de concorrencia (lock otimista/pessimista por OS).
	- Incluir testes de integracao dos endpoints GET/POST de pagamentos.
	- Preparar contrato para futura tela de detalhe financeiro da OS sem alterar fluxo operacional.
