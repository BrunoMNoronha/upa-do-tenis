# Relatório Marco 1 - Onda B (Fase 6)

Data: 2026-07-03
Escopo executado: núcleo financeiro centralizado da Ordem de Serviço (sem novas telas e sem novos endpoints).

## 1) Arquivos criados
- src/lib/ordens-servico-financeiro.ts
- RELATORIO_MARCO_1_ONDA_B_FASE_6.md

## 2) Arquivos alterados
- src/lib/ordens-servico.ts
- src/app/api/ordens-servico/route.ts

## 3) Funções financeiras criadas
No arquivo src/lib/ordens-servico-financeiro.ts:
- normalizarDecimalParaNumero
- calcularValorTotalOS
- calcularValorPago
- calcularSaldo
- calcularStatusFinanceiroDerivado
- calcularResumoFinanceiroOS
- normalizarValoresDecimalParaClient

## 4) Regras implementadas
- Valor total da OS:
  - Prioriza valorTotal persistido quando maior que zero.
  - Mantém compatibilidade com OS antigas: fallback para soma de serviços dos itens (ServicoItemOrdem.valor, com fallback para Servico.precoBase) e depois soma de ItemOrdemServico.valor.
- Valor pago:
  - Considera pagamentos registrados (Pagamento.valor), valorSinal e valorPago legado.
  - Estratégia de compatibilidade: usa o maior valor entre:
    - valorPago legado
    - soma pagamentos + sinal
    - soma pagamentos
    - sinal
- Saldo:
  - saldo = valorTotal - valorPago
  - Clampeado para mínimo 0 para evitar saldo negativo em cenários de sobrepagamento.
- Status financeiro derivado:
  - CANCELADO se status operacional for CANCELADA ou CANCELADO
  - PENDENTE quando valorPago <= 0
  - PARCIAL quando valorPago > 0 e valorPago < valorTotal
  - PAGO quando valorPago >= valorTotal
- Separação de domínios:
  - Status operacional (ABERTA, EM_ANDAMENTO, CONCLUIDA, ENTREGUE) não foi alterado.
  - Status financeiro é apenas derivado no módulo financeiro.

## 5) Decisões sobre Decimal
- Decimal do Prisma foi centralizado para normalização segura via normalizarDecimalParaNumero.
- Para passagem Server -> Client, foi criado normalizador recursivo:
  - Converte Decimal para number arredondado (2 casas).
  - Preserva datas convertendo Date para ISO string, evitando erro de prerender.
- Resultado: reduz risco de warning/erro de serialização de Decimal no Next.js.

## 6) Necessidade de migration
- Não houve necessidade de migration nesta Onda B.
- Justificativa: toda a implementação foi em camada de domínio/aplicação (cálculo e normalização), sem alteração de schema.

## 7) Comandos executados
- npm run build
- npm run build (reexecução após ajuste de normalização de Date)

## 8) Resultado do npm run build
- Primeira execução: falhou com RangeError: Invalid time value em /ordens-servico devido a normalização recursiva tratando Date incorretamente.
- Segunda execução: sucesso completo.
  - Compiled successfully
  - Linting and checking validity of types OK
  - Generating static pages OK

## 9) Riscos restantes
- Não existe endpoint/fluxo de cadastro de Pagamento nesta onda; cálculo de valorPago usa estrutura preparada, mas depende da entrada futura desses registros.
- Como saldo foi clampado para zero, cenários de sobrepagamento não expõem crédito ao cliente nesta etapa.
- ValorDesconto já é normalizado no resumo, porém a regra de aplicação comercial do desconto no total líquido não foi expandida nesta onda para evitar mudança funcional fora de escopo.

## 10) Recomendação para o próximo marco
1. Implementar fluxo de registro de pagamentos e atualização consistente do financeiro da OS usando este módulo central (sem duplicar regra em UI).
2. Definir regra oficial de desconto (se altera valorTotal cobrado ou apenas exibição de composição).
3. Formalizar tratamento de sobrepagamento (ex.: crédito) se necessário ao domínio financeiro.
4. Adicionar testes unitários para o módulo financeiro cobrindo OS legadas, parciais, pagas e canceladas.
