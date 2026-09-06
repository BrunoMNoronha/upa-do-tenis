# Relatório de Homologação Manual — Pós-Fase 11 / Pré-Fase 12

## Ambiente

- **Projeto:** UPA do Tênis - Sapataria Alves
- **Branch:** `main` (sincronizada com `origin/main`, working tree limpo antes do início)
- **Data da homologação:** 04/07/2026
- **Responsável pela execução:** Claude Code (agente), a pedido de Bruno M Noronha
- **Ambiente:** `pnpm run dev` local, Next.js 14.2.35, banco SQLite (`prisma/dev.db`)
- **Método:** Execução manual guiada via browser automatizado (preview), sem alteração de código-fonte durante a execução

## Escopo executado

Fluxo completo de: Ordens de Serviço → Financeiro da OS → Estoque/Insumos → Caixa → Dashboard/Relatórios, usando dados criados na própria sessão para rastreabilidade (cliente "Homologacao QA Fase12", serviço "Solado QA Fase12", insumo "Cola QA Homologacao", OS "OS-04072026-9901").

---

## 1. Fluxo de Ordens de Serviço — ✅ APROVADO

| Cenário | Dado usado | Resultado esperado | Resultado obtido |
|---|---|---|---|
| Cadastrar cliente | Homologacao QA Fase12 / 11999990001 | Cliente criado, contador incrementado | ✅ Total 5→6 |
| Cadastrar serviço | Solado QA Fase12 / R$150,00 | Serviço criado | ✅ Total 9→10 |
| Criar OS | Cliente + serviço acima, valor R$150,00 | OS criada com saldo = valor total | ✅ OS-04072026-9901 criada, saldo R$150,00 |
| Alterar status | Botão "Iniciar Serviço" | Aberta → Em Andamento | ✅ Transição aplicada e refletida na listagem |
| Abrir detalhe | — | Dados consistentes com o cadastro | ✅ Cliente, valores e prazos corretos |
| Conferir histórico | — | Registro de transição com timestamp | ✅ "Aberta -> Em Andamento" registrado com data/hora |

Nenhum problema encontrado neste bloco.

---

## 2. Financeiro da OS — ✅ APROVADO

| Cenário | Dado usado | Esperado | Obtido |
|---|---|---|---|
| Pagamento parcial | R$60,00 (Dinheiro) | Saldo 150→90, status "Parcial" | ✅ |
| Pagamento acima do saldo | R$500,00 | Bloqueio | ✅ "Pagamento acima do saldo pendente não é permitido." |
| Pagamento total | R$90,00 | Saldo → 0, status "Pago" | ✅ |
| Pagamento com saldo já zerado | R$10,00 | Bloqueio | ✅ Mesma mensagem de bloqueio, valores inalterados |
| Pagamento com caixa fechado | R$45,00 em outra OS (saldo real em aberto) | Bloqueio | ✅ "Não há caixa aberto. Abra o caixa primeiro." |

**Observação positiva relevante:** o pagamento de OS está corretamente integrado ao caixa — cada pagamento em dinheiro gera automaticamente uma movimentação de "Entrada" vinculada (`PAGAMENTO_OS`, `OS Vinculada`) no caixa aberto, e o sistema **bloqueia o pagamento se não houver caixa aberto**. Essa é uma regra de negócio importante e está funcionando corretamente.

Nenhum problema encontrado neste bloco.

---

## 3. Estoque / Insumos — ⚠️ APROVADO COM RESSALVA CRÍTICA

| Cenário | Dado usado | Esperado | Obtido |
|---|---|---|---|
| Cadastrar insumo | Cola QA Homologacao, 10un, mínimo 5un | Insumo criado | ✅ |
| Consumo vinculado à OS | 3un + 3un via "Registrar Insumo Utilizado" na OS | Saldo decrementado | ✅ 10→7→4un |
| Alerta de estoque baixo | Saldo cai para 4un (< mínimo 5un) | Badge "Estoque Baixo" | ✅ Badge exibido corretamente em `/insumos` e refletido no Dashboard ("1 insumo abaixo do mínimo") |
| **Registrar movimentação manual (Entrada)** | Tela "Extrato" do insumo, tipo "Entrada", quantidade 5 | Movimentação registrada, saldo +5 | ❌ **FALHA — ver detalhamento abaixo** |
| **Registrar movimentação manual (Ajuste de Saldo)** | Tipo "Ajuste", novo saldo 15, motivo preenchido | Movimentação registrada | ❌ **FALHA — mesmo problema** |

### 🔴 Bug confirmado — Formulário "Nova Movimentação" (extrato do insumo) não envia a requisição

**Tela:** `/insumos/[id]/movimentacoes` (extrato do insumo)
**Arquivo:** [movimentacoes-client.tsx](src/app/insumos/[id]/movimentacoes/movimentacoes-client.tsx) combinado com [insumos-movimentacoes-schema.ts:10-11](src/lib/insumos-movimentacoes-schema.ts#L10-L11)

**Comportamento esperado:** ao preencher "Quantidade" (ou "Novo Saldo" + "Motivo" para Ajuste) com um valor válido e clicar em "Registrar", a movimentação deveria ser enviada a `POST /api/insumos/{id}/movimentacoes` e o saldo do insumo deveria ser atualizado.

**Comportamento obtido:**
- Na primeira tentativa (tipo "Entrada", quantidade "5"), o formulário exibiu o erro `Expected number, received nan` sob o campo Quantidade, mesmo com o campo preenchido corretamente (confirmado via inspeção do DOM: `value: "5"`, `valueAsNumber: 5`).
- Em tentativas subsequentes (inclusive após reload da página, preenchimento limpo via digitação simulada e disparo correto dos eventos `input`/`change` nativos do React), **nenhuma requisição HTTP chega a ser disparada** — confirmado via inspeção da aba de rede: não há nenhum `POST /api/insumos/.../movimentacoes` em nenhuma das tentativas, nem mesmo retornando erro 400.
- O mesmo ocorre para o tipo "Ajuste de Saldo" (campo "Novo Saldo" + "Motivo").
- **Nenhum feedback é exibido ao usuário** nas tentativas após a primeira — o botão "Registrar" simplesmente não faz nada, sem mensagem de erro visível, o que agrava o problema do ponto de vista de UX (o usuário do balcão não saberia que a operação falhou).

**Impacto:** este é o único canal de UI para registrar entradas manuais de estoque, ajustes de saldo e saídas manuais (compra de insumos, perdas, correções de inventário) que **não estejam vinculadas a uma OS**. Atualmente, o único caminho funcional para movimentar estoque é o consumo vinculado a uma Ordem de Serviço (que funciona corretamente). Isso significa que **não é possível repor estoque, registrar perdas/quebras ou corrigir contagem de inventário pela interface** no estado atual.

**Hipótese técnica (não corrigida, apenas observada):** o schema usa `z.number().min(0.01).optional()` para `quantidade` e `novoSaldo` ([insumos-movimentacoes-schema.ts:10-11](src/lib/insumos-movimentacoes-schema.ts#L10-L11)), e o formulário usa `register(campo, { valueAsNumber: true })`. A combinação parece resultar em `NaN` sendo enviado ao invés de `undefined` ou do número digitado, fazendo a validação Zod falhar antes mesmo do envio da requisição. Como o schema não usa `z.coerce.number()`, pequenas inconsistências entre o valor do DOM e o valor rastreado pelo react-hook-form (nesta versão/combinação de libs) resultam em falha silenciosa. **Recomenda-se investigação e correção antes do próximo marco**, pois esta é uma área crítica (estoque).

### Observação secundária (não bloqueante)
Na lista de "Formas de Pagamento" foi observada uma entrada duplicada: **"PIX - PIX"** aparece duas vezes com IDs distintos (`cmr57wbi10001hbvnuge9kuio` e `cmr58qdqx0002bmwkacicko5x`). Não impede o uso, mas é um dado de cadastro duplicado que pode confundir o operador de caixa.

---

## 4. Caixa — ✅ APROVADO

| Cenário | Dado usado | Esperado | Obtido |
|---|---|---|---|
| Abrir caixa | Saldo inicial R$100,00 | Caixa aberto, saldo físico = inicial | ✅ |
| Registrar entrada | R$50,00 | Saldo 100→150 | ✅ |
| Registrar saída | R$20,00 | Saldo 150→130 | ✅ |
| Pagamento de OS vinculado ao caixa | R$60,00 e R$90,00 (Dinheiro) | Entradas automáticas "PAGAMENTO_OS (OS Vinculada)" | ✅ Saldo 130→190→280, rastreável por OS |
| Conferir saldo esperado | — | Saldo físico = soma de todas movimentações | ✅ R$280,00 (100+50-20+60+90) |
| Fechar caixa com divergência proposital | Informado R$270,00 (esperado R$280,00) | Divergência de -R$10,00 registrada | ✅ Histórico mostra corretamente "-R$ 10,00" |
| Operação inválida com caixa fechado | Tentativa de pagamento de OS (saldo R$45,00) | Bloqueio | ✅ "Não há caixa aberto. Abra o caixa primeiro." |

Nenhum problema encontrado neste bloco. Este é o módulo com comportamento mais robusto observado na homologação — todas as regras críticas (rastreabilidade, vínculo com OS, divergência, bloqueio de operação sem caixa aberto) funcionaram como esperado.

---

## 5. Dashboard e Relatórios — ⚠️ APROVADO COM RESSALVA CRÍTICA

| Cenário | Esperado | Obtido |
|---|---|---|
| Alerta de insumo crítico no Dashboard | Refletir estoque baixo | ✅ "1 insumo abaixo do mínimo" exibido corretamente |
| Filtro "Hoje" no Dashboard | Restringir a métricas do dia | ✅ Filtro aplica e atualiza os valores |
| Estado vazio | Listas vazias devem exibir mensagem apropriada | ✅ Observado em Insumos e Extrato antes do primeiro cadastro ("Nenhum item cadastrado", "Nenhuma movimentação registrada") |
| **Consistência entre "sem filtro" e "Hoje"** | Total "sem filtro" deveria ser ≥ total "Hoje" (Hoje é subconjunto) | ❌ **FALHA — ver detalhamento abaixo** |

### 🔴 Bug confirmado — Ordens de Serviço/movimentações criadas "hoje" são excluídas de relatórios filtrados por data quando a data final é o próprio dia

**Telas afetadas:** `/dashboard` (métricas sem filtro), `/relatorios/financeiro-os`, `/relatorios/estoque`

**Evidência 1 (Dashboard):** Sem nenhum filtro aplicado (estado inicial de carregamento da página), o Dashboard mostrou **Total Pendente = R$80,00**. Ao aplicar explicitamente o filtro rápido "Hoje" (data inicial = data final = 04/07/2026), o mesmo indicador passou a mostrar **Total Pendente = R$125,00** — um valor **maior** que o "sem filtro", o que é logicamente impossível (o total geral deveria ser sempre ≥ que qualquer subconjunto filtrado por data).

**Evidência 2 (Relatório Financeiro de OS):** Ao aplicar filtro de 01/01/2026 a 04/07/2026 (cobrindo, portanto, o dia de hoje), o relatório listou apenas 4 das 6 Ordens de Serviço existentes no banco — **excluindo exatamente as duas OS criadas durante esta sessão de testes (hoje)**: `OS-04072026-9901` (saldo já quitado) e `OS-04072026-2154` (saldo em aberto de R$45,00). Isso explica a Evidência 1: o saldo de R$45,00 dessa OS não está sendo somado no "Total Pendente" quando a consulta usa uma data final igual a hoje.

**Evidência 3 (Relatório de Estoque):** O quadro "Últimas Movimentações" apareceu vazio mesmo após dois consumos de insumo registrados nesta sessão (hoje), com o filtro de data padrão cobrindo o dia atual.

**Causa provável (código, não alterado):** em [relatorio-financeiro-os-service.ts:43-55](src/lib/relatorio-financeiro-os-service.ts#L43-L55) e de forma análoga em [relatorio-estoque-service.ts:135-141,198-204](src/lib/relatorio-estoque-service.ts#L135-L141), a data final recebida como string (`"YYYY-MM-DD"`) é convertida com `new Date(filtros.fim)` — que o JavaScript interpreta como **meia-noite UTC** — e em seguida sofre `.setHours(23, 59, 59, 999)`, que opera no **fuso horário local** do processo Node. Dependendo do fuso horário configurado no ambiente, esse cálculo pode resultar em um horário de corte várias horas **antes** do fim real do dia local, cortando registros criados à tarde/noite do próprio dia. O filtro rápido "Hoje" do Dashboard aparenta usar uma lógica diferente (por isso mostrou o valor "correto" de R$125,00, incluindo a OS de saldo aberto).

**Impacto:** este é um problema **crítico de confiabilidade de relatórios financeiros e de estoque** — o valor "sem filtro"/padrão do Dashboard e o Relatório Financeiro de OS podem estar sub-relatando o saldo em aberto real e as movimentações do dia corrente, o que compromete diretamente a área crítica de "relatórios financeiros" listada nas regras do projeto. **Recomenda-se investigação e correção antes do próximo marco.**

---

## Resumo de problemas encontrados

| # | Severidade | Módulo | Descrição | Arquivo(s) de referência |
|---|---|---|---|---|
| 1 | 🔴 Crítica | Estoque/Insumos | Formulário de movimentação manual (Entrada/Saída/Ajuste) não envia a requisição; falha silenciosa após primeira tentativa | [movimentacoes-client.tsx](src/app/insumos/[id]/movimentacoes/movimentacoes-client.tsx), [insumos-movimentacoes-schema.ts](src/lib/insumos-movimentacoes-schema.ts) |
| 2 | 🔴 Crítica | Relatórios/Dashboard | OS e movimentações criadas "hoje" excluídas de relatórios cuja data final é o dia atual, causando totais financeiros/estoque inconsistentes | [relatorio-financeiro-os-service.ts](src/lib/relatorio-financeiro-os-service.ts), [relatorio-estoque-service.ts](src/lib/relatorio-estoque-service.ts) |
| 3 | 🟡 Menor | Cadastro (Formas de Pagamento) | Entrada duplicada "PIX - PIX" com IDs distintos | — (dado de seed/cadastro) |

## Riscos remanescentes

- Impossibilidade de repor estoque ou corrigir inventário pela UI enquanto o bug #1 não for corrigido — risco operacional direto para o dia a dia da sapataria.
- Relatórios financeiros e de estoque podem estar sub-relatando valores do dia corrente enquanto o bug #2 não for corrigido — risco de decisão gerencial baseada em dado incompleto.
- Não foi possível validar "erro de carregamento" do Dashboard/Relatórios de forma controlada (exigiria simular falha de rede/backend), item do roteiro não coberto nesta rodada.

## Pendências

- Investigar e corrigir os bugs #1 e #2 antes de iniciar novo marco funcional.
- Revisar dado duplicado de forma de pagamento "PIX".
- Repetir a validação dos cenários de estoque/relatórios após a correção, cobrindo especificamente: registrar entrada manual de insumo, registrar saída manual, e conferir se relatórios com data final = hoje passam a incluir registros do próprio dia.

## Veredito

**⚠️ APROVADO COM RESSALVAS**

Os módulos de Ordens de Serviço, Financeiro da OS e Caixa foram homologados integralmente sem ressalvas, incluindo o encadeamento entre pagamento de OS e caixa (regra crítica) e o bloqueio de operações financeiras sem caixa aberto. Estoque/Insumos e Relatórios/Dashboard apresentaram **dois problemas críticos confirmados e reproduzidos** que afetam diretamente áreas classificadas como críticas no projeto (estoque e relatórios financeiros).

## Recomendação

**Não avançar para o próximo marco funcional antes de corrigir os itens #1 e #2 listados acima.** Ambos são bugs confirmados (não hipóteses), com evidência de rede reproduzida e caminho de causa identificado no código. Após a correção, recomenda-se nova rodada de homologação manual focada especificamente nesses dois pontos antes da liberação para produção ou início de novas funcionalidades.
