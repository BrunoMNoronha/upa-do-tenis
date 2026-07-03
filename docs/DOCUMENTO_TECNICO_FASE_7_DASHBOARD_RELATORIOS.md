# Documento Técnico — Fase 7

## Dashboard, Relatórios Gerenciais e Indicadores Operacionais/Financeiros

**Projeto:** UPA do Tênis — Sapataria Alves
**Fase:** 7
**Módulo:** Dashboard e Relatórios Gerenciais
**Status:** Planejado
**Base anterior:** Fase 6 concluída e homologada
**Objetivo:** Criar uma camada gerencial para transformar os dados financeiros e operacionais já registrados no sistema em indicadores úteis para tomada de decisão.

---

# 1. Visão Geral

A Fase 7 tem como objetivo criar uma visão gerencial do sistema UPA do Tênis — Sapataria Alves.

Após a conclusão da Fase 6, o sistema passou a controlar:

* Ordens de Serviço;
* detalhe da OS;
* pagamentos parciais e totais;
* saldo pendente;
* status financeiro;
* insumos utilizados por item da OS;
* filtros financeiros na listagem;
* núcleo financeiro centralizado;
* testes automatizados do domínio financeiro.

A Fase 7 deve aproveitar essa base para apresentar indicadores simples, confiáveis e úteis para a gestão da sapataria.

O foco não é criar um dashboard complexo, mas sim permitir que o usuário responda rapidamente perguntas como:

* quanto foi recebido no período?
* quanto ainda está pendente?
* quantas OS estão abertas?
* quantas OS estão pagas?
* quais OS têm saldo em aberto?
* quais serviços são mais executados?
* quais insumos são mais utilizados?
* quais OS estão atrasadas?

---

# 2. Objetivos da Fase 7

## 2.1 Objetivo principal

Criar dashboard e relatórios gerenciais para acompanhamento financeiro e operacional da sapataria, usando os dados já existentes do sistema.

## 2.2 Objetivos específicos

* Criar uma camada centralizada de métricas.
* Criar endpoint de dashboard.
* Criar tela `/dashboard`.
* Exibir indicadores financeiros básicos.
* Exibir indicadores operacionais de OS.
* Permitir filtro por período.
* Criar relatório financeiro simples de OS.
* Criar indicadores de serviços mais executados.
* Criar indicadores de insumos mais utilizados.
* Preservar a performance da listagem de OS.
* Não alterar regras financeiras já homologadas na Fase 6.
* Não implementar estoque completo nesta fase.
* Não implementar estorno, cancelamento ou conciliação financeira nesta fase.

---

# 3. Escopo Funcional

## 3.1 Incluído nesta fase

A Fase 7 contempla:

* dashboard gerencial inicial;
* cards financeiros;
* cards operacionais;
* filtros por período;
* relatório financeiro de OS;
* indicadores de status financeiro;
* indicadores de status operacional;
* ranking de serviços mais executados;
* ranking de insumos mais utilizados;
* visão de OS com saldo pendente;
* preparação para futura exportação;
* testes das métricas principais.

## 3.2 Fora do escopo desta fase

Não fazem parte da Fase 7:

* controle completo de estoque;
* baixa automática de estoque;
* entrada e saída formal de insumos;
* estorno de pagamento;
* cancelamento financeiro;
* conciliação bancária;
* fluxo de caixa completo;
* contas a pagar;
* contas a receber fora da OS;
* emissão fiscal;
* comissão de funcionários;
* integração com meios de pagamento;
* dashboard avançado com gráficos complexos;
* BI externo;
* permissões avançadas por perfil.

Esses itens poderão ser tratados em fases futuras.

---

# 4. Premissas Técnicas

A implementação deve seguir as seguintes premissas:

1. Não alterar o comportamento financeiro já homologado na Fase 6.
2. Não recalcular regras financeiras no frontend.
3. Centralizar consultas e cálculos de métricas no backend.
4. Evitar queries pesadas na listagem principal de OS.
5. Separar dashboard de listagem operacional.
6. Reaproveitar os models existentes.
7. Garantir compatibilidade com OS antigas.
8. Criar testes para métricas críticas.
9. Usar filtros por período de forma consistente.
10. Manter a tela simples e objetiva.

---

# 5. Entidades e Dados Utilizados

A Fase 7 deve reaproveitar os models já existentes no sistema.

## 5.1 OrdemServico

Usada para métricas de:

* total de OS;
* OS por status operacional;
* OS por status financeiro;
* valor total;
* valor pago;
* saldo;
* datas de entrada, previsão, conclusão e entrega;
* OS atrasadas.

Campos relevantes:

```text
id
numero
status
dataEntrada
dataPrevisao
dataConclusao
valorTotal
valorPago
saldo
valorDesconto
valorSinal
clienteId
criadoEm
atualizadoEm
```

---

## 5.2 Pagamento

Usado para métricas de recebimento.

Campos relevantes:

```text
id
ordemServicoId
formaPagamentoId
valor
dataPagamento
tipo
observacoes
criadoEm
```

Métricas possíveis:

* total recebido por período;
* recebimentos por forma de pagamento;
* quantidade de pagamentos;
* OS com pagamento parcial;
* OS pagas.

---

## 5.3 FormaPagamento

Usada para agrupamento financeiro por forma de recebimento.

Exemplos:

```text
Dinheiro
Pix
Cartão de Débito
Cartão de Crédito
Transferência
Outro
```

Métricas possíveis:

* total recebido por forma de pagamento;
* forma de pagamento mais usada;
* quantidade de pagamentos por forma.

---

## 5.4 ItemOrdemServico

Usado para análise operacional da OS.

Métricas possíveis:

* quantidade de itens por OS;
* quantidade total de itens atendidos;
* tipo de item mais frequente, caso o sistema possua essa categorização.

---

## 5.5 Servico e ServicoItemOrdem

Usados para ranking de serviços executados.

Métricas possíveis:

* serviços mais executados;
* serviços com maior valor gerado;
* quantidade de serviços por período;
* ticket médio por serviço.

---

## 5.6 Insumo e InsumoItemOrdem

Usados para análise de consumo operacional de insumos.

Métricas possíveis:

* insumos mais utilizados;
* custo total de insumos por período;
* custo médio de insumos por OS;
* custo de insumos por serviço/item.

Importante:

```text
Insumos continuam sendo custo operacional interno.
Eles não alteram automaticamente valorTotal, valorPago ou saldo da OS.
```

---

# 6. Métricas Mínimas da Fase 7

## 6.1 Métricas financeiras

O dashboard deve exibir:

```text
Total recebido no período
Total pendente
Valor total em OS
Valor pago
Saldo em aberto
Ticket médio por OS
Quantidade de OS pagas
Quantidade de OS parciais
Quantidade de OS pendentes
Quantidade de OS com saldo em aberto
```

---

## 6.2 Métricas operacionais

O dashboard deve exibir:

```text
Total de OS abertas
Total de OS em andamento
Total de OS concluídas
Total de OS entregues
Total de OS atrasadas
Total de OS criadas no período
Total de OS finalizadas no período
```

---

## 6.3 Métricas de serviços

O dashboard ou relatório deve exibir:

```text
Serviços mais executados
Quantidade por serviço
Valor total por serviço
Ticket médio por serviço
```

---

## 6.4 Métricas de insumos

O dashboard ou relatório deve exibir:

```text
Insumos mais utilizados
Quantidade total utilizada
Custo total por insumo
Custo total de insumos no período
```

---

# 7. Filtros por Período

A Fase 7 deve permitir filtrar indicadores por período.

## 7.1 Filtros mínimos

```text
Hoje
Esta semana
Este mês
Mês anterior
Período personalizado
```

## 7.2 Datas consideradas

A regra de datas precisa ser clara.

Sugestão:

```text
Métricas de OS:
usar dataEntrada ou criadoEm.

Métricas de pagamento:
usar dataPagamento.

Métricas de insumo:
usar criadoEm do registro InsumoItemOrdem.
```

## 7.3 Período personalizado

O filtro personalizado deve aceitar:

```text
dataInicial
dataFinal
```

Validações:

* data inicial obrigatória;
* data final obrigatória;
* data inicial não pode ser maior que data final;
* período deve respeitar fuso local da aplicação.

---

# 8. Arquitetura Técnica Recomendada

## 8.1 Camada centralizada de métricas

Criar camada específica em `src/lib`.

Arquivos sugeridos:

```text
src/lib/dashboard.ts
src/lib/dashboard-schema.ts
src/lib/dashboard.test.ts
```

Responsabilidades:

* receber filtros;
* consultar dados;
* calcular agregados;
* normalizar Decimals;
* retornar contrato pronto para API/UI;
* evitar lógica de dashboard dentro de componentes React.

---

## 8.2 API de dashboard

Criar endpoint:

```text
GET /api/dashboard
```

Parâmetros sugeridos:

```text
periodo=hoje|semana|mes|mes_anterior|personalizado
dataInicial=YYYY-MM-DD
dataFinal=YYYY-MM-DD
```

Resposta sugerida:

```json
{
  "periodo": {
    "tipo": "mes",
    "dataInicial": "2026-07-01",
    "dataFinal": "2026-07-31"
  },
  "financeiro": {
    "totalRecebido": 0,
    "totalPendente": 0,
    "valorTotalOS": 0,
    "valorPago": 0,
    "saldoEmAberto": 0,
    "ticketMedio": 0,
    "quantidadePagas": 0,
    "quantidadeParciais": 0,
    "quantidadePendentes": 0
  },
  "operacional": {
    "totalAbertas": 0,
    "totalEmAndamento": 0,
    "totalConcluidas": 0,
    "totalEntregues": 0,
    "totalAtrasadas": 0,
    "totalCriadasPeriodo": 0
  },
  "servicos": {
    "maisExecutados": []
  },
  "insumos": {
    "maisUtilizados": [],
    "custoTotalPeriodo": 0
  }
}
```

---

## 8.3 Tela de dashboard

Criar página:

```text
/dashboard
```

Componentes sugeridos:

```text
DashboardPage
DashboardClient
DashboardCardsFinanceiros
DashboardCardsOperacionais
DashboardFiltroPeriodo
DashboardServicosMaisExecutados
DashboardInsumosMaisUtilizados
```

A tela deve ser simples, com cards e tabelas pequenas.

Evitar gráficos complexos na primeira entrega.

---

# 9. Relatórios da Fase 7

## 9.1 Relatório financeiro de OS

Criar uma visão analítica com colunas:

```text
Número da OS
Cliente
Status operacional
Status financeiro
Valor total
Valor pago
Saldo
Data de entrada
Data de previsão
```

Filtros:

```text
Período
Status financeiro
Status operacional
Cliente
Com saldo em aberto
```

Rota sugerida:

```text
/relatorios/financeiro-os
```

Endpoint sugerido:

```text
GET /api/relatorios/financeiro-os
```

---

## 9.2 Relatório de serviços

Colunas sugeridas:

```text
Serviço
Quantidade executada
Valor total
Ticket médio
```

Rota sugerida:

```text
/relatorios/servicos
```

---

## 9.3 Relatório de insumos

Colunas sugeridas:

```text
Insumo
Quantidade utilizada
Custo unitário médio
Custo total
```

Rota sugerida:

```text
/relatorios/insumos
```

Observação:

```text
Este relatório não representa estoque.
Ele representa apenas consumo registrado em OS.
```

---

# 10. Regras de Negócio

## 10.1 Total recebido

```text
totalRecebido = soma dos pagamentos com dataPagamento dentro do período
```

---

## 10.2 Total pendente

```text
totalPendente = soma dos saldos das OS com saldo > 0
```

---

## 10.3 Ticket médio

```text
ticketMedio = soma(valorTotal das OS no período) / quantidade de OS no período
```

Se quantidade de OS for zero:

```text
ticketMedio = 0
```

---

## 10.4 Status financeiro

O status financeiro deve continuar sendo derivado pelo módulo financeiro centralizado da Fase 6:

```text
PENDENTE
PARCIAL
PAGO
CANCELADO
```

A Fase 7 não deve criar uma nova regra paralela.

---

## 10.5 OS atrasada

Sugestão de regra:

```text
OS atrasada = dataPrevisao < hoje
              e status operacional diferente de ENTREGUE
              e status operacional diferente de CANCELADA, se existir
```

---

## 10.6 Custo de insumos

```text
custoTotalInsumos = soma de custoTotalAplicado em InsumoItemOrdem
```

Importante:

```text
custoTotalInsumos não reduz saldo.
custoTotalInsumos não altera valorTotal.
custoTotalInsumos não altera valorPago.
```

---

# 11. Plano de Implementação por Marcos

## Marco 7.1 — Baseline e plano técnico

Entregáveis:

* revisar models disponíveis;
* revisar dados financeiros da Fase 6;
* revisar queries atuais de OS;
* definir contratos de métricas;
* confirmar campos de data usados;
* gerar plano técnico antes de alterar arquivos.

---

## Marco 7.2 — Camada centralizada de métricas

Entregáveis:

* criar `src/lib/dashboard.ts`;
* criar schemas de filtro;
* implementar cálculo de métricas financeiras;
* implementar cálculo de métricas operacionais;
* normalizar valores Decimal;
* criar testes unitários.

---

## Marco 7.3 — API de dashboard

Entregáveis:

* criar `GET /api/dashboard`;
* validar filtros;
* retornar contrato consolidado;
* tratar erros;
* testar endpoint ou service.

---

## Marco 7.4 — Tela `/dashboard`

Entregáveis:

* criar página `/dashboard`;
* criar cards financeiros;
* criar cards operacionais;
* criar filtro por período;
* criar estados de carregamento, erro e sucesso;
* não recalcular métricas no frontend.

---

## Marco 7.5 — Relatório financeiro de OS

Entregáveis:

* criar relatório de OS financeiras;
* filtros por status financeiro;
* filtros por status operacional;
* filtro por período;
* listagem analítica;
* preparar exportação futura.

---

## Marco 7.6 — Indicadores de serviços e insumos

Entregáveis:

* ranking de serviços mais executados;
* valor total por serviço;
* ranking de insumos mais utilizados;
* custo total de insumos por período.

---

## Marco 7.7 — Homologação guiada

Entregáveis:

* validar números do dashboard contra OS reais;
* validar filtros por período;
* validar relatório financeiro;
* validar ranking de serviços;
* validar ranking de insumos;
* registrar bugs e ajustes;
* emitir relatório final da Fase 7.

---

# 12. Testes Recomendados

## 12.1 Testes unitários

Criar testes para:

```text
total recebido no período
total pendente
ticket médio
status financeiro pendente
status financeiro parcial
status financeiro pago
OS atrasada
serviços mais executados
insumos mais utilizados
período sem dados
```

---

## 12.2 Testes de API

Testar:

```text
GET /api/dashboard sem filtro
GET /api/dashboard com período hoje
GET /api/dashboard com período mês
GET /api/dashboard com período personalizado
GET /api/dashboard com data inválida
GET /api/dashboard com período sem dados
```

---

## 12.3 Testes manuais

Roteiro mínimo:

1. Criar OS com valor total.
2. Registrar pagamento parcial.
3. Registrar pagamento total em outra OS.
4. Registrar insumo em item da OS.
5. Abrir dashboard.
6. Validar total recebido.
7. Validar total pendente.
8. Validar quantidade de OS pagas.
9. Validar quantidade de OS parciais.
10. Validar ranking de serviços.
11. Validar ranking de insumos.
12. Alterar filtro de período.
13. Conferir se os números mudam corretamente.

---

# 13. Critérios de Aceite

A Fase 7 será considerada pronta quando o sistema permitir:

1. acessar `/dashboard`;
2. visualizar total recebido;
3. visualizar total pendente;
4. visualizar ticket médio;
5. visualizar quantidade de OS por status operacional;
6. visualizar quantidade de OS por status financeiro;
7. filtrar métricas por período;
8. visualizar OS com saldo em aberto;
9. visualizar serviços mais executados;
10. visualizar insumos mais utilizados;
11. consultar relatório financeiro simples;
12. manter compatibilidade com OS antigas;
13. passar em `npm run test`;
14. passar em `npm run build`;
15. não alterar regras financeiras da Fase 6.

---

# 14. Riscos Técnicos

| Risco                                  | Impacto | Mitigação                                          |
| -------------------------------------- | ------: | -------------------------------------------------- |
| Dashboard com queries pesadas          |    Alto | Criar camada de métricas otimizada                 |
| Recalcular financeiro no frontend      |    Alto | Usar service/backend como fonte da verdade         |
| Divergência entre relatório e listagem |    Alto | Reaproveitar cálculo centralizado                  |
| Período calculado de forma incorreta   |   Médio | Criar schema e testes de período                   |
| OS antigas ficarem fora das métricas   |   Médio | Manter fallback financeiro da Fase 6               |
| Misturar custo de insumo com cobrança  |   Médio | Separar financeiro e operacional                   |
| Dashboard virar escopo de BI complexo  |    Alto | Entregar cards simples primeiro                    |
| Performance ruim com muitos dados      |   Médio | Evitar joins profundos e preparar paginação futura |

---

# 15. Decisões Arquiteturais

## 15.1 Fonte da verdade

A fonte da verdade das métricas deve ser o backend.

```text
Frontend exibe.
Backend calcula.
Banco armazena.
```

---

## 15.2 Custo operacional separado

Custo de insumo deve continuar separado do valor cobrado.

```text
Valor cobrado = financeiro da OS.
Custo de insumo = operação interna.
```

---

## 15.3 Dashboard leve

A primeira versão do dashboard deve ser leve.

Evitar nesta fase:

```text
gráficos complexos
drill-down avançado
BI completo
exportação sofisticada
relatórios comparativos anuais
```

---

# 16. Próximas Fases Sugeridas

Após a Fase 7, os próximos caminhos possíveis são:

## Fase 8 — Estoque e Movimentação de Insumos

Inclui:

* entrada de estoque;
* saída de estoque;
* baixa automática;
* ajuste manual;
* auditoria de movimentações.

## Fase 9 — Estorno, Cancelamento e Conciliação Financeira

Inclui:

* cancelamento de pagamento;
* estorno;
* motivo de cancelamento;
* trilha de auditoria;
* conciliação com caixa.

## Fase 10 — Relatórios Avançados e Exportações

Inclui:

* exportação CSV/PDF;
* comparativos por período;
* margem por serviço;
* relatórios para contabilidade.

---

# 17. Prompt Técnico para Início da Fase 7

```text
Estou iniciando a Fase 7 do sistema UPA do Tênis — Sapataria Alves.

Contexto:
A Fase 6 foi concluída, homologada e aprovada. O sistema já possui financeiro da OS, pagamentos, saldo, status financeiro, insumos por item, tela de detalhe da OS, filtros financeiros na listagem e testes automatizados passando.

Objetivo da Fase 7:
Criar dashboard e relatórios gerenciais simples para acompanhamento financeiro e operacional da sapataria.

Antes de implementar:
1. Analise a estrutura atual do projeto.
2. Identifique os models disponíveis:
   - OrdemServico
   - ItemOrdemServico
   - Servico
   - ServicoItemOrdem
   - Pagamento
   - FormaPagamento
   - Insumo
   - InsumoItemOrdem
   - HistoricoStatus
3. Identifique os campos usados para métricas:
   - valorTotal
   - valorPago
   - saldo
   - dataEntrada
   - dataPrevisao
   - dataPagamento
   - status operacional
   - serviços vinculados
   - insumos utilizados
4. Proponha plano técnico antes de alterar arquivos.

Escopo:
- camada centralizada de métricas;
- API de dashboard;
- tela /dashboard;
- cards financeiros;
- cards operacionais;
- filtro por período;
- relatório financeiro simples de OS;
- ranking de serviços;
- ranking de insumos.

Fora do escopo:
- estoque completo;
- baixa automática;
- estorno/cancelamento de pagamentos;
- conciliação bancária;
- contas a pagar;
- caixa completo;
- emissão fiscal;
- dashboard avançado.

Regras:
- não recalcular métricas financeiras no frontend;
- não alterar regras financeiras da Fase 6;
- não misturar custo de insumos com valor cobrado;
- manter compatibilidade com OS antigas;
- criar testes para métricas críticas;
- rodar npm run test e npm run build.

Resultado esperado:
Gerar um plano técnico da Fase 7 dividido por marcos, contendo:
- arquivos prováveis a criar;
- arquivos prováveis a alterar;
- endpoints necessários;
- regras de cálculo;
- riscos técnicos;
- testes necessários;
- recomendação do primeiro marco.
```

---

# 18. Resultado Esperado da Fase 7

Ao final da Fase 7, o sistema deverá permitir que o usuário visualize rapidamente a saúde operacional e financeira da sapataria.

O usuário deverá conseguir responder:

```text
Quanto recebi neste mês?
Quanto ainda tenho a receber?
Quantas OS estão abertas?
Quantas OS estão atrasadas?
Quantas OS estão pagas?
Quais serviços mais saem?
Quais insumos mais uso?
Qual é o ticket médio das OS?
```

A entrega deve manter a estabilidade da Fase 6 e preparar o sistema para futuras evoluções em estoque, conciliação e relatórios avançados.
