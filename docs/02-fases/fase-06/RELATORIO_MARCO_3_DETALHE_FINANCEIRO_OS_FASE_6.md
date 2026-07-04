# Relatorio Marco 3 - Detalhe Financeiro da OS (Fase 6)

## Arquivos Criados

- RELATORIO_MARCO_3_DETALHE_FINANCEIRO_OS_FASE_6.md
- src/app/api/ordens-servico/[id]/route.ts
- src/lib/ordens-servico-detalhe.test.ts

## Arquivos Alterados

- src/lib/ordens-servico-pagamentos.ts
- src/lib/ordens-servico-pagamentos.test.ts
- src/lib/ordens-servico.ts
- src/lib/ordens-servico-schema.ts
- src/app/api/ordens-servico/[id]/pagamentos/route.ts
- src/lib/ordens-servico-pagamentos-schema.ts

## Endpoint Criado

- GET /api/ordens-servico/[id]

Comportamento:
- valida parametro id da OS;
- valida existencia da OS;
- retorna 404 para OS inexistente;
- retorna payload consolidado da OS para consulta de detalhe.

## Ajustes Transacionais Realizados

No servico src/lib/ordens-servico-pagamentos.ts, o fluxo de registro de pagamento foi reforcado para executar dentro de uma unica transacao Prisma:

- leitura da OS com pagamentos/itens;
- validacao da forma de pagamento;
- validacao de saldo pendente;
- criacao do pagamento;
- recarga da OS dentro da transacao;
- recalculo com calcularResumoFinanceiroOS;
- update de valorPago e saldo.

Garantia desta etapa:
- registro de Pagamento e update de OrdemServico ficam no mesmo boundary transacional;
- nao ha alteracao do fluxo operacional de status da OS.

## Contrato de Resposta do Detalhe da OS

Resposta do endpoint GET /api/ordens-servico/[id]:

{
  "ordemServico": {
    "id": "string",
    "numero": "string",
    "status": "string",
    "dataEntrada": "ISO string",
    "dataPrevisao": "ISO string",
    "dataConclusao": "ISO string | null",
    "valorTotal": "number",
    "valorDesconto": "number",
    "valorSinal": "number",
    "valorPago": "number",
    "saldo": "number",
    "observacoes": "string | null",
    "cliente": { ... },
    "itens": [
      {
        "...": "dados do item",
        "servicos": [
          {
            "...": "vinculo servico-item",
            "servico": { ... }
          }
        ]
      }
    ],
    "pagamentos": [
      {
        "...": "dados do pagamento",
        "formaPagamento": { ... }
      }
    ],
    "historicosStatus": [ ... ],
    "resumoFinanceiro": {
      "valorTotal": "number",
      "valorDesconto": "number",
      "valorSinal": "number",
      "valorPago": "number",
      "saldo": "number",
      "statusFinanceiro": "PENDENTE | PARCIAL | PAGO | CANCELADO"
    }
  }
}

Observacao:
- o resumo financeiro e calculado exclusivamente por calcularResumoFinanceiroOS.

## Testes Criados ou Alterados

Criados:
- src/lib/ordens-servico-detalhe.test.ts
  - detalhe de OS existente;
  - OS inexistente;
  - resumo financeiro retornado corretamente;
  - compatibilidade com OS sem pagamentos.

Alterados:
- src/lib/ordens-servico-pagamentos.test.ts
  - cobertura explicita de que o registro de pagamento ocorre dentro de transacao Prisma.

## Resultado de npm run test

Comando:
- npm run test

Resultado:
- Test Files: 3 passed (3)
- Tests: 28 passed (28)
- Status: SUCESSO

## Resultado de npm run build

Comando:
- npm run build

Resultado:
- Build concluido com sucesso.
- Lint e checagem de tipos aprovados.
- Endpoint dinamico presente no output:
  - /api/ordens-servico/[id]
- Status: SUCESSO

## Riscos Restantes

- Ainda nao ha estorno/cancelamento de pagamento.
- Nao ha teste de integracao HTTP da rota GET /api/ordens-servico/[id] (cobertura atual focada no servico).
- Em cenarios de alta concorrencia, pode ser necessario endurecer estrategia de bloqueio para evitar disputas simultaneas na mesma OS dependendo do banco alvo futuro.

## Recomendacao para Iniciar a Tela /ordens-servico/[id]

1. Implementar pagina de detalhe consumindo GET /api/ordens-servico/[id] com secoes separadas: cabecalho da OS, itens/servicos, historico de status, pagamentos e resumo financeiro.
2. Aplicar estrategia de carregamento incremental (skeleton + erro/retry) para evitar tela pesada em conexoes lentas.
3. Reaproveitar o mesmo contrato de resumoFinanceiro retornado pela API sem recalculo no client.
4. Preparar a UI para evolucao futura de estorno sem mudar o endpoint atual.
