# Relatorio Marco 1 - Onda C (Fase 6)

Data: 2026-07-03
Objetivo da onda: validar e estabilizar o nucleo financeiro central da OS antes da implementacao de APIs/fluxos de pagamento.

## Arquivos criados
- src/lib/ordens-servico-financeiro.test.ts
- vitest.config.ts
- RELATORIO_MARCO_1_ONDA_C_FASE_6.md

## Arquivos alterados
- package.json
- README.md

## Testes implementados
Suite: src/lib/ordens-servico-financeiro.test.ts

Funcoes cobertas:
- normalizarDecimalParaNumero
- calcularValorTotalOS
- calcularValorPago
- calcularSaldo
- calcularStatusFinanceiroDerivado
- calcularResumoFinanceiroOS
- normalizarValoresDecimalParaClient

Total atual:
- 1 arquivo de teste
- 18 testes passando

## Cenarios cobertos
- OS sem pagamento
- OS com valorSinal
- OS com pagamento parcial
- OS totalmente paga
- OS com sobrepagamento
- OS cancelada
- OS antiga usando valorPago legado
- OS com pagamentos registrados
- OS com Date e Decimal sendo normalizados para o client

## Decisoes sobre desconto
- Regra atual: valorTotal e tratado como valor principal da OS para calculo de saldo e status financeiro.
- valorDesconto e normalizado/exposto no resumo financeiro, mas nao reduz valorTotal automaticamente nesta etapa.
- Direcao futura: definir explicitamente no dominio se valorTotal passara a representar valor bruto ou liquido apos desconto quando o fluxo financeiro completo for implementado.

## Decisoes sobre sobrepagamento
- Regra atual: saldo exibido e sempre minimo zero (clamp), mesmo quando valorPago > valorTotal.
- Credito futuro ao cliente por sobrepagamento fica fora do escopo desta etapa e nao foi implementado.

## Resultado dos comandos executados
1. npm run test (primeira execucao)
- Falhou por resolucao de alias @/ no Vitest.
- Ajuste aplicado em vitest.config.ts com alias @ -> ./src.

2. npm run test (segunda execucao)
- Sucesso: 1 arquivo, 18 testes passando.

3. npm run build
- Sucesso completo (Next.js build concluido, paginas geradas, sem quebra de tipagem/lint no pipeline de build).

## Riscos restantes
- Ainda nao existe fluxo de registro de pagamento por OS (esperado para proximo marco).
- Regra comercial oficial de desconto (bruto vs liquido) ainda precisa decisao de produto/negocio para evitar ambiguidade.
- Sobrepagamento nao gera credito contabil neste momento.

## Recomendacao objetiva para iniciar o fluxo de pagamentos da OS
1. Criar endpoints de pagamento da OS reutilizando obrigatoriamente calcularResumoFinanceiroOS para persistir valorPago/saldo sem duplicacao de regra.
2. Definir contrato de dominio para desconto (valorTotal bruto ou liquido) antes de abrir UI de pagamento.
3. Incluir regra explicita para sobrepagamento (credito, estorno ou bloqueio) antes de liberar operacao em producao.
4. Manter os testes unitarios financeiros como gate obrigatorio no CI antes de qualquer alteracao no fluxo de pagamentos.
