# Relatório de Re-homologação Manual — Correção dos 2 Bugs Críticos (Fase 12)

## Ambiente

- **Projeto:** UPA do Tênis - Sapataria Alves
- **Branch:** `main`
- **Commit atual (HEAD):** `b3e347f` — *working tree com alterações pendentes (correção ainda não commitada)*
- **Data da re-homologação:** 04/07/2026 (~14h, `America/Sao_Paulo`, UTC−3)
- **Responsável pela execução:** Claude Code (agente), a pedido de Bruno M Noronha
- **Stack:** `pnpm run dev` local, Next.js 14.2.x, Node v24.14.1, Prisma + SQLite
- **Método:** Execução manual guiada via browser automatizado (preview), sem alteração de código-fonte durante a execução
- **Fuso confirmado no browser:** `America/Sao_Paulo`, offset +180 min (UTC−3) — relevante para os bugs de data

## Objetivo

Re-homologação focada **exclusivamente** nos dois bugs corrigidos após a homologação Pré-Fase 12:

1. **Bug A — Movimentação manual de insumos** (Entrada/Saída/Ajuste e validação de formulário).
2. **Bug B — Filtros de data em relatórios e dashboard** (registros do próprio dia "hoje" eram excluídos por conversão UTC/dia-shift).

---

## Arquivos alterados pela correção (diff pendente)

| Arquivo | Papel na correção |
|---|---|
| `src/lib/date-range.ts` *(novo)* | Helper `parseDataLocal` + intervalo semiaberto `inicioDoDia`/`inicioDoDiaSeguinte` |
| `src/lib/date-range.test.ts` *(novo)* | Testes do helper de datas |
| `src/lib/insumos-movimentacoes-schema.ts` | `numeroOpcional` trata `NaN`/`null`/`""`; `superRefine` com erros por campo |
| `src/lib/insumos-movimentacoes-schema.test.ts` *(novo)* | Testes do schema de movimentação |
| `src/app/insumos/[id]/movimentacoes/movimentacoes-client.tsx` | Exibe erro do campo `custoUnitario` |
| `src/lib/dashboard-service.ts` | Intervalo semiaberto (`gte`/`lt`) |
| `src/app/api/dashboard/route.ts` | `parseDataLocal` no parsing dos filtros |
| `src/lib/relatorio-estoque-service.ts` | Intervalo semiaberto |
| `src/app/api/relatorios/estoque/route.ts` | `parseDataLocal` |
| `src/lib/relatorio-financeiro-os-service.ts` | `parseDataLocal` + intervalo semiaberto |
| `src/app/api/relatorios/financeiro-os/route.ts` | Formatação de data padrão via componentes locais |
| `src/__tests__/dashboard-service.test.ts`, `src/__tests__/relatorio-financeiro-os-service.test.ts`, `src/lib/relatorio-estoque-service.test.ts` | Cobertura de teste dos ajustes |

---

## Estado inicial (validações automatizadas)

| Comando | Resultado |
|---|---|
| `git status` | Alterações pendentes (não commitadas) nos arquivos acima |
| `pnpm run lint` | ✅ **No ESLint warnings or errors** |
| `pnpm run test` | ✅ **104 testes / 15 arquivos — todos passaram** (8,3 s) |
| `pnpm run build` | ✅ **Build concluído com sucesso** (todas as rotas compiladas) |

> **Nota de ambiente:** conforme já documentado, `pnpm run test` usa o banco do `.env` e **zera as tabelas de insumos/movimentações**. Por isso a suíte foi executada **antes** da validação manual, e o insumo de teste foi criado em seguida (dados de OS/clientes reais são preservados pelos testes).

---

## Cenários executados

### Bug A — Movimentação manual de insumos ✅ APROVADO

Insumo de teste criado: **"HOMOLOG FASE12 - REMOVER"** (un, custo R$ 10,00, saldo inicial 100) — `POST /api/insumos → 201`.

| # | Cenário | Esperado | Obtido |
|---|---|---|---|
| A1 | **Entrada** qtd 25, **custo unitário vazio** | POST criado, saldo sobe | ✅ `POST .../movimentacoes → 201`; **saldo 100 → 125** (sem erro "received nan") |
| A2 | **Saída** qtd 10 | POST criado, saldo desce | ✅ `→ 201`; **saldo 125 → 115** |
| A3 | **Ajuste de Saldo** novoSaldo 50 + motivo | POST criado, saldo ajustado | ✅ `→ 201`; **saldo 115 → 50**; motivo registrado |
| A4 | **Entrada sem quantidade** (submit) | Erro visível, **sem requisição** | ✅ Mensagem *"Informe a quantidade da movimentação."* exibida; **nenhum POST novo** (contagem permaneceu 3) |
| A5 | Conferir extrato | 3 movimentações do dia | ✅ Extrato lista ENTRADA_MANUAL (+25), SAIDA_MANUAL (−10), AJUSTE (→50), todas 04/07/2026 |

**Evidências:** POSTs 201 confirmados na aba de rede; saldo recalculado a cada operação; erro de validação renderizado em vermelho abaixo do campo Quantidade; ausência de erro "received nan" ao deixar custo unitário vazio.

### Bug B — Relatório Financeiro de OS ✅ APROVADO

Dados: OS criadas hoje já existentes — `OS-04072026-9901` (R$150, paga) e `OS-04072026-2154` (R$45, **Aberta/Pendente** = saldo em aberto).

| # | Cenário | Esperado | Obtido |
|---|---|---|---|
| B1 | Filtro **01/07 → 04/07** (inclui hoje) | OS de hoje aparecem | ✅ 5 OS; Valor Total **R$ 510,00**; Saldo aberto R$ 125,00; as 2 OS de hoje presentes |
| B2 | Filtro **04/07 → 04/07** (só hoje) | OS de hoje aparecem, não zera | ✅ 2 OS; Valor Total **R$ 195,00**; Saldo R$ 45,00; ambas as OS de hoje presentes |
| B3 | Total geral ≥ filtro Hoje | Consistência | ✅ R$ 510,00 (período) ≥ R$ 195,00 (hoje) |

**Evidência-chave:** `GET /api/relatorios/financeiro-os?inicio=2026-07-04&fim=2026-07-04 → 200` retornando as OS do próprio dia — cenário que falhava antes da correção por conversão UTC.

### Bug B — Relatório de Estoque ✅ APROVADO

| # | Cenário | Esperado | Obtido |
|---|---|---|---|
| C1 | Filtro **04/07 → 04/07** (data final = hoje) | Movimentações de hoje aparecem | ✅ Extrato lista as 3 movimentações criadas hoje (Ajuste +65, Saída −10, Entrada +25), todas 04/07/2026 |

**Evidência:** `GET /api/relatorios/estoque?dataInicio=2026-07-04&dataFim=2026-07-04 → 200` com as movimentações do dia.

### Bug B — Dashboard ⚠️ APROVADO COM RESSALVA

| # | Cenário | Esperado | Obtido |
|---|---|---|---|
| D1 | Visão padrão (Mês atual, 01/07→04/07) | Métricas do período | ✅ Recebido R$ 385,00; Pendente R$ 125,00; Abertas 3; Pagas 3 |
| D2 | Filtro **Hoje** | Registros de hoje entram nas métricas | ✅ Recebido R$ 0,00; Pendente R$ 45,00; Abertas 1; Pagas 1; Pend. Pgto 1 — serviços de hoje ("Solado QA Fase12", "Hidratação de Couro") listados |
| D3 | Total geral ≥ filtro Hoje | Sem inconsistência lógica | ✅ Recebido 385 ≥ 0; Pendente 125 ≥ 45 |

Todos os critérios de aprovação do dashboard foram atendidos: os registros de hoje entram nas métricas e o total geral não fica menor que o filtro Hoje. **Porém**, ver ressalva abaixo.

---

## Problemas encontrados

### ⚠️ Off-by-one residual no filtro de data do Dashboard (client-side) — NÃO corrigido pela alteração

- **Onde:** `src/components/date-range-picker.tsx` (linhas 19, 22, 30, 36, 43, 47, 50) e `src/components/dashboard/DashboardFiltros.tsx` (linhas 24–25).
- **O quê:** ao selecionar **Hoje** (04/07), a requisição enviada foi `GET /api/dashboard?inicio=2026-07-04&fim=2026-07-05` — **`fim` deslocado +1 dia**. Os relatórios (financeiro-os e estoque), que usam outro client, enviaram corretamente `fim=2026-07-04`.
- **Causa raiz:** o picker cria `to = new Date("2026-07-04T23:59:59")` (local) e o serializa com `toISOString().split("T")[0]`. Em UTC−3, `2026-07-04T23:59:59` local → `2026-07-05T02:59:59Z` → string `"2026-07-05"`. Confirmado no browser: `new Date("2026-07-04T23:59:59").toISOString()` = `"2026-07-05T02:59:59.000Z"`.
- **Efeito:** o filtro "Hoje" do dashboard cobre, na prática, **hoje + amanhã** (intervalo `[04/07, 06/07)` no servidor). Também afeta seleção manual de data final (ex.: escolher 03/07 passa a incluir 04/07).
- **Por que passou nos critérios:** como amanhã (05/07) ainda não possui dados, o total exibido para "Hoje" é numericamente igual ao esperado e não há inconsistência visível **hoje**. É um defeito **latente**.
- **Observação importante:** a correção do Bug B foi aplicada **no lado servidor** (`parseDataLocal` + intervalo semiaberto). A serialização de datas **no client do dashboard** ainda usa `toISOString`, reintroduzindo o dia-shift. Os clients dos relatórios não têm esse problema.

---

## Riscos remanescentes

1. **Latente:** o filtro "Hoje"/data final do dashboard engloba o dia seguinte. Sem impacto visível hoje, mas produzirá contagens incorretas caso existam dados no dia posterior ao `fim` selecionado (ex.: filtrar um dia passado incluirá o dia seguinte). Recomenda-se estender o padrão do fix (formatação por componentes locais) aos componentes `date-range-picker.tsx` e `DashboardFiltros.tsx`. **Fora do escopo desta re-homologação; não corrigido.**
2. **Dado de teste remanescente:** insumo **"HOMOLOG FASE12 - REMOVER"** (saldo 50) com 3 movimentações foi deixado no banco de dev. O DELETE da API bloqueia insumo com movimentações; será zerado no próximo `pnpm run test`. Recomenda-se remoção via script Prisma se necessário antes de novos testes manuais.

---

## Veredito

### ⚠️ APROVADO COM RESSALVAS

Todos os critérios obrigatórios de aprovação foram atendidos:

- ✅ Entrada manual de insumo funciona (inclusive com custo unitário vazio, sem erro "received nan").
- ✅ Saída manual funciona.
- ✅ Ajuste de saldo funciona.
- ✅ Erros de formulário são visíveis e bloqueiam a requisição.
- ✅ Relatórios (financeiro-os e estoque) incluem registros criados hoje, inclusive com filtro só de hoje.
- ✅ Dashboard não apresenta total geral menor que o filtro Hoje; registros de hoje entram nas métricas.
- ✅ Lint, testes (104) e build continuam aprovados.

**Ressalva:** persiste um off-by-one **latente** de data no *client* do dashboard (`fim` +1 dia via `toISOString`), não coberto pela correção server-side. Não viola os critérios atuais nem produz erro visível hoje, mas deve ser tratado em correção separada antes de cenários com dados no dia seguinte ao filtro.

## Recomendação

Liberar o commit dos dois bugs corrigidos. Abrir tarefa separada para o off-by-one do client do dashboard (`date-range-picker.tsx` / `DashboardFiltros.tsx`), aplicando formatação de data por componentes locais em vez de `toISOString`.
