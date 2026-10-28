# ⚡ Bolt Performance Report

## Verdict
PR CREATED

## Opportunity
Consulta redundante ao banco de dados durante o registro de um pagamento em Ordem de Serviço na API `registrarPagamentoOrdemServico` em `src/lib/ordens-servico-pagamentos.ts`.

## Evidence
O código recarregava a ordem de serviço inteira (`tx.ordemServico.findUnique`) incluindo itens, serviços e pagamentos, apenas para adicionar o novo pagamento recém-criado na conta do resumo financeiro. Todos esses dados base já haviam sido carregados e travados (FOR UPDATE) no topo da mesma transação.

## Optimization
Substituí a query de leitura subsequente por uma cópia em memória. Reaproveitamos o objeto `ordem` original, montamos e anexamos um "mock" seguro do pagamento recém-criado (inserindo null nas propriedades relacionais), e repassamos ao `calcularResumoFinanceiroOS`.

## Before
1 query `SELECT ... FOR UPDATE`, 1 `findUnique` base, 1 query `create`, 1 query `create` no caixa, e 1 `findUnique` final com nested joins pesados.

## After
O último `findUnique` redundante (o mais pesado em joins) foi totalmente eliminado e os cálculos passam a depender do objeto alocado em memória.

## Impact
Redução de aproximadamente -20% (1 query) do overhead I/O no fluxo transacional mais crítico do sistema. Melhora de performance estimada da ordem de milissegundos sem alterar regras ou a complexidade computacional assintótica da aplicação (O(1)).

## Files changed
- `src/lib/ordens-servico-pagamentos.ts`

## Validation
| Command | Result |
|---|---|
| pnpm test src/lib/ordens-servico-pagamentos.test.ts | 8 tests passed (0 failures) |
| lint | 0 warnings or errors |
| typecheck | Compiled Successfully |
| build | Success (compiled in ~11s) |

## Risks
Low — behavior preserved; change limited to performance optimization. O objeto em memória simulado é idêntico em propriedades e tipos requeridos pela função pura `calcularResumoFinanceiroOS`.

## Journal
entry added
