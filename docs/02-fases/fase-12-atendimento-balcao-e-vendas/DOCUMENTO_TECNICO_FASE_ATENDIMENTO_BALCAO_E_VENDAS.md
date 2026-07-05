# Documento Técnico --- Fase: Atendimento de Balcão e Venda de Produtos

## Objetivo

Expandir o UPA do Tênis para suportar operações que não exigem Ordem de
Serviço (OS), preservando a rastreabilidade financeira, o controle de
estoque e a integração com o caixa.

## Justificativa

Nem toda operação realizada pela sapataria necessita de uma OS. Serviços
rápidos e vendas de produtos devem ser registrados para compor o
histórico, o financeiro e os relatórios, sem gerar burocracia
operacional.

## Escopo Incluído

### 1. Atendimento de Balcão

-   Registro de serviços executados imediatamente.
-   Cliente opcional (configurável).
-   Pagamento imediato.
-   Integração com caixa.
-   Consumo de estoque quando aplicável.
-   Histórico operacional.

### 2. Venda de Produtos

-   Venda avulsa.
-   Venda vinculada à OS.
-   Baixa automática de estoque.
-   Registro financeiro.

### 3. Configuração dos Serviços

Novos atributos: - Requer OS (Sim/Não) - Consome estoque (Sim/Não) -
Tempo estimado

## Escopo Excluído

-   Agendamento.
-   Comandas.
-   Emissão fiscal.
-   Alterações no fluxo financeiro homologado.

## Regras de Negócio

1.  Serviços com "Requer OS = Sim" obrigam abertura de OS.
2.  Serviços com "Requer OS = Não" podem ser registrados no Atendimento
    de Balcão.
3.  Venda de produtos pode ocorrer:
    -   isoladamente;
    -   dentro de uma OS.
4.  Toda movimentação financeira deve ser integrada ao Caixa.
5.  Todo consumo de produto deve gerar movimentação de estoque.

## Impactos

### Financeiro

Nova origem de receita: - OS - Atendimento de Balcão - Venda de Produtos

### Estoque

Baixa automática em vendas e atendimentos configurados para consumir
estoque.

### Relatórios

Separação de receitas por origem.

## Riscos

-   Duplicidade de cobrança.
-   Baixa incorreta de estoque.
-   Integração inconsistente com caixa.

## Critérios de Aceite

-   Atendimento de Balcão registrado sem OS.
-   Venda avulsa funcionando.
-   Venda em OS funcionando.
-   Caixa consolidando todas as origens.
-   Estoque consistente.
-   Relatórios separados por origem.

## Testes

-   Serviço rápido.
-   Venda avulsa.
-   Venda em OS.
-   Serviço com consumo de estoque.
-   Serviço sem consumo.
-   Conferência de caixa.
-   Conferência de estoque.

## Homologação

Executar cenários completos envolvendo caixa, estoque e financeiro antes
do encerramento da fase.

## Observação

Esta fase altera áreas críticas (caixa, estoque e financeiro). Não deve
ser concluída sem testes automatizados, build, validação manual e
homologação.
