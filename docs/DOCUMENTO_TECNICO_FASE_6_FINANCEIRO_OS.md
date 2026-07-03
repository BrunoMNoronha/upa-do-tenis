# Documento Técnico — Fase 6

## Financeiro da OS, Insumos por Serviço, Pagamentos e Melhorias Operacionais

**Projeto:** UPA do Tênis — Sapataria Alves
**Fase:** 6
**Módulo:** Financeiro da Ordem de Serviço
**Status:** Planejado
**Objetivo:** Evoluir o MVP v1 com controle financeiro por Ordem de Serviço, registro de serviços executados, insumos utilizados, pagamentos, saldo pendente e melhorias operacionais associadas.

---

# 1. Visão Geral

A Fase 6 tem como objetivo transformar a Ordem de Serviço em uma entidade financeiramente controlável.

Até o MVP v1, o sistema concentra-se no cadastro, abertura, tramitação e acompanhamento operacional das Ordens de Serviço. Nesta nova fase, a OS passa a conter informações financeiras estruturadas, permitindo controlar:

* serviços executados;
* insumos utilizados;
* valores cobrados;
* descontos;
* pagamentos parciais ou totais;
* saldo pendente;
* status financeiro da OS;
* indicadores operacionais simples.

A implementação deve ser incremental, preservando o funcionamento já homologado do MVP.

---

# 2. Objetivos da Fase 6

## 2.1 Objetivo principal

Implementar o controle financeiro da Ordem de Serviço, permitindo que cada OS possua composição de valores, histórico de pagamentos e situação financeira claramente identificável.

## 2.2 Objetivos específicos

* Criar ou ajustar a modelagem financeira da OS.
* Permitir cadastro de serviços prestados.
* Permitir cadastro de insumos utilizados.
* Permitir vínculo de serviços à OS.
* Permitir vínculo de insumos à OS ou a um serviço específico da OS.
* Calcular automaticamente valores financeiros consolidados.
* Registrar pagamentos parciais ou totais.
* Exibir saldo pendente.
* Classificar a OS por status de pagamento.
* Melhorar a listagem e a visualização da OS com dados financeiros.
* Criar filtros operacionais por situação financeira.

---

# 3. Escopo Funcional

## 3.1 Incluído nesta fase

Esta fase contempla:

* modelagem financeira da OS;
* catálogo de serviços;
* cadastro de insumos;
* serviços vinculados à OS;
* insumos utilizados na OS;
* pagamentos da OS;
* cálculo de total, valor pago e saldo;
* status de pagamento;
* resumo financeiro na tela de detalhes da OS;
* colunas financeiras na listagem de OS;
* filtros por situação financeira;
* testes manuais guiados;
* validação de compatibilidade com OS antigas.

## 3.2 Fora do escopo desta fase

Não fazem parte desta fase:

* controle completo de estoque;
* baixa automática de estoque;
* contas a pagar;
* contas a receber gerais fora da OS;
* fluxo de caixa completo;
* conciliação bancária;
* emissão fiscal;
* integração com gateways de pagamento;
* comissão de funcionários;
* relatórios financeiros avançados;
* dashboard gerencial complexo;
* fechamento de caixa.

Esses itens poderão ser tratados em fases futuras.

---

# 4. Premissas Técnicas

A implementação deve seguir as seguintes premissas:

1. Não reescrever o fluxo de OS já existente.
2. Não quebrar cadastros, listagens e tramitações já homologadas.
3. Preservar compatibilidade com registros antigos.
4. Adicionar campos financeiros de forma segura, com valores padrão.
5. Centralizar regras de cálculo financeiro.
6. Evitar duplicidade de lógica entre telas, controllers e services.
7. Usar migrations para toda alteração estrutural.
8. Implementar a fase em marcos pequenos e validáveis.
9. Validar manualmente cada alteração antes de avançar.
10. Manter a experiência simples para o usuário final.

---

# 5. Modelagem de Dados

## 5.1 Ordem de Serviço

A entidade de Ordem de Serviço deverá receber campos financeiros consolidados.

### Campos sugeridos

```text
id
cliente_id
status
data_abertura
data_entrega_prevista
valor_servicos
valor_insumos
valor_desconto
valor_total
valor_pago
saldo_pendente
status_pagamento
observacoes_financeiras
created_at
updated_at
```

### Descrição dos campos financeiros

| Campo                   | Tipo sugerido | Descrição                                        |
| ----------------------- | ------------: | ------------------------------------------------ |
| valor_servicos          |       decimal | Soma dos serviços vinculados à OS                |
| valor_insumos           |       decimal | Soma dos insumos utilizados                      |
| valor_desconto          |       decimal | Desconto aplicado sobre a OS                     |
| valor_total             |       decimal | Valor final da OS                                |
| valor_pago              |       decimal | Soma dos pagamentos registrados                  |
| saldo_pendente          |       decimal | Valor ainda em aberto                            |
| status_pagamento        |   string/enum | Situação financeira da OS                        |
| observacoes_financeiras |          text | Observações internas sobre pagamento ou cobrança |

---

## 5.2 Catálogo de Serviços

Representa os serviços que a sapataria oferece.

### Campos sugeridos

```text
id
nome
descricao
preco_padrao
ativo
created_at
updated_at
```

### Exemplos de registros

```text
Limpeza completa
Colagem
Costura
Pintura
Troca de sola
Hidratação de couro
Reparo de zíper
Troca de palmilha
```

---

## 5.3 Serviço da OS

Representa um serviço efetivamente executado ou cobrado dentro de uma Ordem de Serviço.

### Campos sugeridos

```text
id
ordem_servico_id
servico_id
descricao
quantidade
valor_unitario
valor_total
observacoes
created_at
updated_at
```

### Regras

* Uma OS pode possuir um ou vários serviços.
* O campo `servico_id` referencia o catálogo de serviços.
* O campo `descricao` permite personalizar o texto do serviço na OS.
* O campo `valor_total` deve ser calculado por:

```text
valor_total = quantidade * valor_unitario
```

---

## 5.4 Insumo

Representa materiais utilizados na execução dos serviços.

### Campos sugeridos

```text
id
nome
descricao
unidade_medida
custo_unitario
ativo
created_at
updated_at
```

### Exemplos de registros

```text
Cola
Linha
Tinta
Solado
Palmilha
Produto de limpeza
Graxa
Couro
Borracha
```

### Unidades de medida sugeridas

```text
unidade
ml
litro
grama
metro
par
caixa
```

---

## 5.5 Insumo Utilizado na OS

Representa o consumo de um insumo em uma OS.

### Campos sugeridos

```text
id
ordem_servico_id
servico_os_id
insumo_id
quantidade
custo_unitario
custo_total
observacoes
created_at
updated_at
```

### Regras

* O insumo pode ser vinculado diretamente à OS.
* Quando possível, o insumo deve ser vinculado ao serviço específico da OS.
* O campo `servico_os_id` pode ser opcional.
* O custo total deve ser calculado por:

```text
custo_total = quantidade * custo_unitario
```

---

## 5.6 Pagamento da OS

Representa um pagamento feito pelo cliente referente a uma Ordem de Serviço.

### Campos sugeridos

```text
id
ordem_servico_id
data_pagamento
forma_pagamento
valor
observacoes
created_at
updated_at
```

### Formas de pagamento sugeridas

```text
Dinheiro
Pix
Cartão de Débito
Cartão de Crédito
Transferência
Outro
```

### Regras

* Uma OS pode ter nenhum, um ou vários pagamentos.
* O sistema deve permitir pagamento parcial.
* O sistema deve permitir pagamento total.
* A soma dos pagamentos compõe o campo `valor_pago` da OS.
* O pagamento não deve ser excluído fisicamente se houver necessidade futura de auditoria. Caso o projeto já utilize exclusão lógica, aplicar o mesmo padrão.

---

# 6. Relacionamentos

## 6.1 Relações principais

```text
OrdemServico 1:N ServicoOS
OrdemServico 1:N InsumoUtilizadoOS
OrdemServico 1:N PagamentoOS

Servico 1:N ServicoOS

Insumo 1:N InsumoUtilizadoOS

ServicoOS 1:N InsumoUtilizadoOS
```

## 6.2 Interpretação

* Uma Ordem de Serviço pode ter vários serviços.
* Um serviço do catálogo pode aparecer em várias Ordens de Serviço.
* Uma Ordem de Serviço pode ter vários insumos utilizados.
* Um insumo pode ser usado em várias Ordens de Serviço.
* Um serviço específico da OS pode ter vários insumos associados.
* Uma Ordem de Serviço pode ter vários pagamentos.

---

# 7. Regras de Negócio

## 7.1 Cálculo de serviços

```text
valor_servicos = soma de todos os valor_total dos serviços vinculados à OS
```

## 7.2 Cálculo de insumos

```text
valor_insumos = soma de todos os custo_total dos insumos utilizados na OS
```

## 7.3 Cálculo do valor total

```text
valor_total = valor_servicos + valor_insumos - valor_desconto
```

## 7.4 Cálculo do valor pago

```text
valor_pago = soma de todos os pagamentos registrados na OS
```

## 7.5 Cálculo do saldo pendente

```text
saldo_pendente = valor_total - valor_pago
```

Caso o pagamento seja maior que o valor total, o saldo pendente deve ser tratado como zero para exibição operacional, salvo se o sistema vier a controlar crédito futuro.

```text
saldo_pendente_exibicao = max(valor_total - valor_pago, 0)
```

---

# 8. Status de Pagamento

## 8.1 Status permitidos

```text
Pendente
Parcial
Pago
Cancelado
```

## 8.2 Regras de definição

```text
Se OS estiver cancelada:
  status_pagamento = Cancelado

Senão, se valor_pago == 0:
  status_pagamento = Pendente

Senão, se valor_pago > 0 e valor_pago < valor_total:
  status_pagamento = Parcial

Senão, se valor_pago >= valor_total:
  status_pagamento = Pago
```

## 8.3 Observação importante

O status financeiro deve ser recalculado sempre que houver alteração em:

* serviço da OS;
* insumo utilizado;
* desconto;
* pagamento;
* cancelamento da OS.

---

# 9. Camada de Cálculo Financeiro

## 9.1 Recomendação técnica

A lógica financeira da OS deve ser centralizada em uma camada específica, como:

```text
OrdemServicoFinanceiroService
FinanceiroOSService
OSFinancialCalculator
```

O nome deve seguir o padrão já utilizado no projeto.

## 9.2 Responsabilidades da camada

Esta camada deve:

* calcular valor de serviços;
* calcular valor de insumos;
* calcular desconto;
* calcular valor total;
* calcular valor pago;
* calcular saldo pendente;
* definir status de pagamento;
* persistir os valores consolidados na OS;
* garantir consistência após alterações.

## 9.3 Operações esperadas

```text
recalcularFinanceiro(ordemServicoId)
calcularValorServicos(ordemServicoId)
calcularValorInsumos(ordemServicoId)
calcularValorPago(ordemServicoId)
calcularSaldoPendente(ordemServicoId)
definirStatusPagamento(ordemServico)
```

---

# 10. Fluxos Funcionais

## 10.1 Fluxo de cadastro de serviço na OS

1. Usuário acessa a OS.
2. Usuário seleciona um serviço do catálogo.
3. Sistema carrega o preço padrão.
4. Usuário pode ajustar descrição, quantidade e valor.
5. Sistema calcula o subtotal do serviço.
6. Sistema salva o serviço na OS.
7. Sistema recalcula o financeiro da OS.
8. Sistema exibe o resumo financeiro atualizado.

---

## 10.2 Fluxo de cadastro de insumo utilizado

1. Usuário acessa a OS.
2. Usuário acessa a área de insumos.
3. Usuário seleciona o insumo.
4. Sistema carrega o custo unitário padrão.
5. Usuário informa a quantidade.
6. Sistema calcula o custo total.
7. Usuário vincula o insumo à OS ou a um serviço específico.
8. Sistema salva o insumo utilizado.
9. Sistema recalcula o financeiro da OS.

---

## 10.3 Fluxo de pagamento

1. Usuário acessa a OS.
2. Usuário clica em registrar pagamento.
3. Usuário informa forma de pagamento.
4. Usuário informa valor pago.
5. Usuário informa data do pagamento.
6. Usuário salva o pagamento.
7. Sistema recalcula valor pago.
8. Sistema recalcula saldo pendente.
9. Sistema atualiza status de pagamento.

---

## 10.4 Fluxo de finalização da OS

Ao tentar finalizar uma OS, o sistema deve exibir o resumo financeiro.

Caso exista saldo pendente, o sistema pode alertar:

```text
Esta OS possui saldo pendente. Deseja finalizar mesmo assim?
```

Nesta fase, o alerta não precisa bloquear a finalização, salvo decisão explícita de regra de negócio.

---

# 11. Telas e Componentes

## 11.1 Tela de detalhes da OS

A tela de detalhes da OS deve exibir:

* dados principais da OS;
* dados do cliente;
* status operacional;
* lista de serviços da OS;
* lista de insumos utilizados;
* lista de pagamentos;
* resumo financeiro.

### Resumo financeiro sugerido

```text
Serviços: R$ 0,00
Insumos: R$ 0,00
Desconto: R$ 0,00
Total: R$ 0,00
Pago: R$ 0,00
Saldo: R$ 0,00
Status pagamento: Pendente
```

---

## 11.2 Listagem de OS

A listagem de Ordens de Serviço deve receber colunas financeiras.

### Colunas sugeridas

```text
Valor total
Valor pago
Saldo pendente
Status pagamento
```

### Filtros sugeridos

```text
Todas
Pendentes
Parciais
Pagas
Canceladas
Com saldo em aberto
```

---

## 11.3 Cadastro de serviços

Tela para gerenciar o catálogo de serviços.

Funcionalidades mínimas:

* listar serviços;
* cadastrar serviço;
* editar serviço;
* ativar/inativar serviço;
* definir preço padrão.

---

## 11.4 Cadastro de insumos

Tela para gerenciar os insumos utilizados pela sapataria.

Funcionalidades mínimas:

* listar insumos;
* cadastrar insumo;
* editar insumo;
* ativar/inativar insumo;
* definir unidade de medida;
* definir custo unitário.

---

# 12. Validações

## 12.1 Validações de serviços

* Nome do serviço obrigatório no catálogo.
* Preço padrão não pode ser negativo.
* Quantidade do serviço na OS deve ser maior que zero.
* Valor unitário não pode ser negativo.
* Valor total deve ser recalculado automaticamente.

---

## 12.2 Validações de insumos

* Nome do insumo obrigatório.
* Unidade de medida obrigatória.
* Custo unitário não pode ser negativo.
* Quantidade utilizada deve ser maior que zero.
* Custo total deve ser recalculado automaticamente.

---

## 12.3 Validações de pagamento

* Valor do pagamento deve ser maior que zero.
* Forma de pagamento obrigatória.
* Data de pagamento obrigatória.
* Pagamento deve estar vinculado a uma OS existente.
* O sistema deve permitir pagamento parcial.
* O sistema deve tratar pagamento superior ao total sem quebrar o cálculo.

---

# 13. Migrações

## 13.1 Alteração na tabela de Ordem de Serviço

Adicionar campos:

```text
valor_servicos
valor_insumos
valor_desconto
valor_total
valor_pago
saldo_pendente
status_pagamento
observacoes_financeiras
```

Valores padrão sugeridos:

```text
valor_servicos = 0
valor_insumos = 0
valor_desconto = 0
valor_total = 0
valor_pago = 0
saldo_pendente = 0
status_pagamento = 'Pendente'
```

---

## 13.2 Criação da tabela de catálogo de serviços

Tabela sugerida:

```text
servicos
```

Campos:

```text
id
nome
descricao
preco_padrao
ativo
created_at
updated_at
```

---

## 13.3 Criação da tabela de serviços da OS

Tabela sugerida:

```text
ordem_servico_servicos
```

Campos:

```text
id
ordem_servico_id
servico_id
descricao
quantidade
valor_unitario
valor_total
observacoes
created_at
updated_at
```

---

## 13.4 Criação da tabela de insumos

Tabela sugerida:

```text
insumos
```

Campos:

```text
id
nome
descricao
unidade_medida
custo_unitario
ativo
created_at
updated_at
```

---

## 13.5 Criação da tabela de insumos utilizados

Tabela sugerida:

```text
ordem_servico_insumos
```

Campos:

```text
id
ordem_servico_id
servico_os_id
insumo_id
quantidade
custo_unitario
custo_total
observacoes
created_at
updated_at
```

---

## 13.6 Criação da tabela de pagamentos da OS

Tabela sugerida:

```text
ordem_servico_pagamentos
```

Campos:

```text
id
ordem_servico_id
data_pagamento
forma_pagamento
valor
observacoes
created_at
updated_at
```

---

# 14. Seeds Iniciais

## 14.1 Serviços iniciais

```text
Limpeza completa
Colagem
Costura
Pintura
Troca de sola
Hidratação de couro
Reparo de zíper
Troca de palmilha
```

## 14.2 Insumos iniciais

```text
Cola
Linha
Tinta
Solado
Palmilha
Produto de limpeza
Graxa
Couro
Borracha
```

## 14.3 Formas de pagamento

```text
Dinheiro
Pix
Cartão de Débito
Cartão de Crédito
Transferência
Outro
```

---

# 15. Compatibilidade com Dados Existentes

A implementação deve garantir que Ordens de Serviço antigas continuem funcionando normalmente.

## 15.1 Estratégia recomendada

* Campos financeiros devem possuir valor padrão.
* OS antigas devem iniciar com valores financeiros zerados.
* A ausência de serviços financeiros vinculados não deve impedir abertura da OS.
* A ausência de pagamentos não deve gerar erro.
* A tela de detalhes deve tratar listas vazias corretamente.
* A listagem de OS deve exibir valores zerados quando não houver dados financeiros.

---

# 16. Segurança e Integridade

## 16.1 Pontos de atenção

* Não confiar apenas no cálculo feito no frontend.
* Recalcular valores no backend antes de persistir consolidados.
* Evitar edição direta dos campos consolidados sem regra controlada.
* Garantir que exclusão ou edição de serviços recalcule a OS.
* Garantir que exclusão ou edição de pagamentos recalcule a OS.
* Garantir que valores negativos não sejam aceitos indevidamente.
* Registrar timestamps das operações financeiras.

---

# 17. Auditoria Recomendada

Embora uma auditoria financeira completa possa ficar para fase futura, recomenda-se manter pelo menos:

* data de criação do pagamento;
* data de alteração do pagamento;
* usuário responsável, caso o sistema já possua autenticação;
* observações do pagamento;
* histórico operacional da OS quando houver alteração financeira relevante.

Eventos financeiros importantes para histórico:

```text
Serviço adicionado à OS
Serviço alterado
Serviço removido
Insumo adicionado
Insumo alterado
Insumo removido
Pagamento registrado
Pagamento alterado
Pagamento removido
Desconto aplicado
Status financeiro alterado
```

---

# 18. Critérios de Aceite

A Fase 6 será considerada pronta quando o sistema permitir:

1. cadastrar serviços no catálogo;
2. cadastrar insumos;
3. adicionar serviço a uma OS;
4. adicionar múltiplos serviços a uma OS;
5. adicionar insumo utilizado em uma OS;
6. vincular insumo a um serviço específico da OS;
7. calcular subtotal de serviços;
8. calcular subtotal de insumos;
9. aplicar desconto;
10. calcular valor total;
11. registrar pagamento parcial;
12. registrar pagamento total;
13. calcular valor pago;
14. calcular saldo pendente;
15. atualizar status de pagamento automaticamente;
16. exibir resumo financeiro na OS;
17. exibir dados financeiros na listagem de OS;
18. filtrar OS por status de pagamento;
19. manter OS antigas funcionando;
20. validar recálculo após edição ou remoção de serviços, insumos e pagamentos.

---

# 19. Plano de Implementação por Marcos

## Marco 6.1 — Modelagem Financeira

Entregáveis:

* análise da estrutura atual;
* criação das migrations;
* ajustes nos models;
* criação de relacionamentos;
* valores padrão para OS antigas;
* seeds iniciais;
* validação básica da aplicação após migration.

---

## Marco 6.2 — Serviços e Insumos Base

Entregáveis:

* CRUD de catálogo de serviços;
* CRUD de insumos;
* listagens;
* ativação/inativação;
* validações básicas.

---

## Marco 6.3 — Serviços dentro da OS

Entregáveis:

* adicionar serviço à OS;
* editar serviço da OS;
* remover serviço da OS;
* calcular subtotal de serviços;
* atualizar resumo financeiro.

---

## Marco 6.4 — Insumos por Serviço ou OS

Entregáveis:

* adicionar insumo utilizado;
* vincular insumo à OS;
* vincular insumo ao serviço da OS;
* editar insumo utilizado;
* remover insumo utilizado;
* calcular subtotal de insumos;
* atualizar resumo financeiro.

---

## Marco 6.5 — Pagamentos da OS

Entregáveis:

* registrar pagamento;
* listar pagamentos da OS;
* editar pagamento;
* remover ou cancelar pagamento;
* calcular valor pago;
* calcular saldo pendente;
* atualizar status financeiro.

---

## Marco 6.6 — Melhorias Operacionais

Entregáveis:

* resumo financeiro na tela de detalhes;
* colunas financeiras na listagem;
* filtros por status de pagamento;
* alerta de saldo pendente;
* melhoria de usabilidade no fluxo de finalização.

---

# 20. Testes Manuais Obrigatórios

## 20.1 Cenário 1 — OS sem financeiro

1. Criar uma OS sem serviço financeiro.
2. Abrir detalhes da OS.
3. Validar que os valores aparecem zerados.
4. Validar status de pagamento como pendente.
5. Validar que nenhuma tela quebra.

Resultado esperado:

```text
OS criada com sucesso.
Valores financeiros zerados.
Status financeiro pendente.
```

---

## 20.2 Cenário 2 — OS com um serviço

1. Criar OS.
2. Adicionar um serviço.
3. Informar quantidade 1.
4. Informar valor unitário.
5. Salvar.
6. Validar subtotal.
7. Validar valor total.

Resultado esperado:

```text
Valor dos serviços calculado corretamente.
Valor total atualizado.
Saldo pendente igual ao valor total.
```

---

## 20.3 Cenário 3 — OS com múltiplos serviços

1. Criar OS.
2. Adicionar dois ou mais serviços.
3. Validar soma dos serviços.
4. Editar um dos serviços.
5. Validar recálculo.
6. Remover um serviço.
7. Validar novo recálculo.

Resultado esperado:

```text
Sistema recalcula a OS corretamente após inclusão, edição e remoção.
```

---

## 20.4 Cenário 4 — OS com insumos

1. Criar OS.
2. Adicionar serviço.
3. Adicionar insumo ao serviço.
4. Informar quantidade.
5. Validar custo total do insumo.
6. Validar subtotal de insumos.
7. Validar valor total da OS.

Resultado esperado:

```text
Insumo vinculado corretamente.
Custo calculado corretamente.
Resumo financeiro atualizado.
```

---

## 20.5 Cenário 5 — Pagamento parcial

1. Criar OS com valor total.
2. Registrar pagamento menor que o total.
3. Validar valor pago.
4. Validar saldo pendente.
5. Validar status como parcial.

Resultado esperado:

```text
Pagamento registrado.
Saldo pendente calculado.
Status financeiro parcial.
```

---

## 20.6 Cenário 6 — Pagamento total

1. Criar OS com valor total.
2. Registrar pagamento igual ao total.
3. Validar valor pago.
4. Validar saldo pendente.
5. Validar status como pago.

Resultado esperado:

```text
Pagamento total registrado.
Saldo pendente zerado.
Status financeiro pago.
```

---

## 20.7 Cenário 7 — Desconto

1. Criar OS com serviços e insumos.
2. Aplicar desconto.
3. Validar valor total.
4. Registrar pagamento.
5. Validar saldo.

Resultado esperado:

```text
Desconto aplicado corretamente.
Total recalculado.
Saldo calculado com base no valor com desconto.
```

---

## 20.8 Cenário 8 — OS antiga

1. Abrir uma OS cadastrada antes da Fase 6.
2. Validar tela de detalhes.
3. Validar listagem.
4. Validar que não há erro por ausência de serviços, insumos ou pagamentos.

Resultado esperado:

```text
OS antiga permanece acessível.
Valores financeiros aparecem zerados.
Nenhuma funcionalidade anterior é quebrada.
```

---

# 21. Riscos Técnicos

| Risco                                               |     Impacto | Mitigação                                        |
| --------------------------------------------------- | ----------: | ------------------------------------------------ |
| Quebra do fluxo atual de OS                         |        Alto | Implementar incrementalmente e testar OS antigas |
| Cálculo duplicado em várias telas                   |        Alto | Centralizar em service/camada única              |
| Inconsistência após edição de pagamento             |        Alto | Recalcular OS após toda alteração financeira     |
| Escopo crescer para ERP completo                    |        Alto | Restringir Fase 6 ao financeiro da OS            |
| Dados antigos ficarem incompatíveis                 |       Médio | Usar defaults e tratamento de listas vazias      |
| Usuário confundir custo de insumo com valor cobrado |       Médio | Separar claramente custo interno e valor final   |
| Pagamento maior que total gerar erro                | Baixo/Médio | Tratar saldo mínimo como zero na exibição        |

---

# 22. Recomendações de Implementação

## 22.1 Ordem recomendada

```text
Modelagem
↓
Migrations
↓
Models e relacionamentos
↓
Service de cálculo financeiro
↓
Cadastro de serviços
↓
Cadastro de insumos
↓
Serviços na OS
↓
Insumos na OS
↓
Pagamentos
↓
Resumo financeiro
↓
Filtros e melhorias operacionais
↓
Testes finais
```

## 22.2 Recomendação principal

Não iniciar a fase pelas telas.

A base correta da Fase 6 é:

```text
modelagem + regra de cálculo + consistência dos dados
```

Depois disso, as telas passam a ser apenas uma forma segura de operar os dados.

---

# 23. Relatório Final Esperado da Fase 6

Ao concluir a implementação, deve ser gerado um relatório contendo:

* arquivos criados;
* arquivos alterados;
* migrations executadas;
* entidades adicionadas;
* regras implementadas;
* telas criadas ou alteradas;
* testes executados;
* evidências de funcionamento;
* pendências conhecidas;
* riscos restantes;
* recomendação para próxima fase.

Nome sugerido:

```text
RELATORIO_IMPLEMENTACAO_FASE_6_FINANCEIRO_OS.md
```

---

# 24. Resultado Esperado

Ao final da Fase 6, o sistema UPA do Tênis deverá permitir que cada Ordem de Serviço possua controle financeiro próprio, com registro claro de serviços, insumos, valores, pagamentos e saldo.

O usuário final deverá conseguir abrir uma OS e responder rapidamente:

* quais serviços foram cobrados;
* quais insumos foram utilizados;
* qual é o valor total;
* quanto já foi pago;
* quanto ainda falta pagar;
* se a OS está pendente, parcial ou paga.

A entrega deve manter o MVP v1 estável e preparar o sistema para futuras evoluções financeiras, como caixa, contas a receber, estoque e relatórios gerenciais.

---

# 25. Próximo Passo Técnico

O próximo passo recomendado é executar o **Marco 6.1 — Modelagem Financeira da OS**.

Antes de implementar código, deve ser feita uma análise da estrutura atual do projeto para identificar:

* models existentes;
* tabelas já criadas;
* migrations anteriores;
* estrutura atual da OS;
* controllers e services relacionados;
* telas de listagem e detalhe da OS;
* padrões de nomenclatura usados;
* padrão atual de validação;
* padrão atual de rotas;
* padrão atual de histórico ou auditoria.

Somente após essa análise a implementação deve ser iniciada.