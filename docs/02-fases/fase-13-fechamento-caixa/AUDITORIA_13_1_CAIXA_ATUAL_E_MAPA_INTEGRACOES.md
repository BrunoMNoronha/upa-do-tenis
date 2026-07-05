# Fase 13.1 — Auditoria do Caixa Atual e Mapa de Integrações

**Data:** 2026-07-05
**Tipo:** Auditoria técnica e funcional (somente leitura — nenhuma regra alterada)
**Escopo:** Diagnóstico do módulo de caixa antes de planejar o Fechamento de Caixa Diário (Fase 13).
**Restrição da fase:** NÃO implementar fechamento, NÃO alterar regra financeira/pagamento/estoque/venda, NÃO tocar schema, NÃO criar migration, NÃO corrigir bugs, NÃO commitar.

> **Nota importante:** o módulo já possui um fluxo de fechamento funcional entregue na **Fase 10**. A Fase 13 não parte do zero — ela reforça/evolui um fechamento existente. Este relatório mapeia exatamente o que existe hoje.

---

## 1. Diagnóstico inicial (obrigatório)

```
git status -sb   → ## main...origin/main   (sem alterações)
git diff --stat  → (vazio)
```

Repositório limpo e alinhado com `origin/main`. Diagnóstico realizado antes de qualquer escrita. Único arquivo criado nesta fase: este relatório.

---

## 2. Inventário de arquivos do módulo de caixa

| Camada | Arquivo | Função |
|---|---|---|
| Regra de negócio | `src/lib/caixa.ts` | Abrir, fechar, movimentar, obter aberto, detalhar, calcular totais |
| Validação | `src/lib/caixa-schema.ts` | Zod: `abrirCaixaSchema`, `fecharCaixaSchema`, `movimentacaoCaixaSchema` |
| Teste | `src/lib/caixa.test.ts` | 6 testes unitários com prisma mockado |
| API | `src/app/api/caixa/route.ts` | `GET` lista / `POST` abre |
| API | `src/app/api/caixa/atual/route.ts` | `GET` caixa aberto (`force-dynamic`) |
| API | `src/app/api/caixa/[id]/route.ts` | `GET` detalhe |
| API | `src/app/api/caixa/[id]/fechar/route.ts` | `POST` fecha |
| API | `src/app/api/caixa/[id]/movimentacoes/route.ts` | `POST` movimentação manual |
| UI | `src/app/caixa/caixa-client.tsx` | Painel operacional (abrir, movimentar, fechar) |
| UI | `src/app/caixa/[id]/caixa-detalhe-client.tsx` | Detalhe read-only (mostra divergência) |
| UI | `src/app/caixa/historico/historico-client.tsx` | Histórico com filtro por data |
| Integração | `src/lib/ordens-servico-pagamentos.ts` | Pagamento de OS → caixa |
| Integração | `src/lib/vendas.ts` | Venda de balcão → caixa |

---

## 3. Modelo de dados (Prisma — apenas leitura, NÃO alterado)

### `Caixa`
`id, dataAbertura(now), dataFechamento?, saldoInicial, saldoFinalInformado?, saldoFinalCalculado?, divergencia?, status("ABERTO"|"FECHADO", default ABERTO), observacao?, criadoEm, atualizadoEm`

- **Não há vínculo com uma "data-dia".** O caixa é uma **sessão/turno**, não um "dia". Só existe controle por `status`.

### `MovimentacaoCaixa`
`id, caixaId(Restrict), tipo("ENTRADA"|"SAIDA"|"SANGRIA"|"REFORCO"), origem, valor, descricao, formaPagamentoId?(Restrict), pagamentoId?(@unique, SetNull), ordemServicoId?(SetNull), vendaId?(SetNull), criadoEm`

- Comentário no schema diz `origem // MANUAL, PAGAMENTO_OS` — **desatualizado**: hoje também existe `VENDA_BALCAO` (ver §4).
- Já existe FK `vendaId` → `Venda` (adicionada na Fase 12).

---

## 4. Mapa de integrações — como cada valor entra no caixa

Existem **três caminhos de escrita** em `MovimentacaoCaixa`, e eles **não passam pelo mesmo ponto de código**:

| Origem | Disparado por | Como grava | `tipo` | `origem` | Passa pelo serviço `caixa.ts`? |
|---|---|---|---|---|---|
| Pagamento de OS | `ordens-servico-pagamentos.ts` | `registrarMovimentacaoAutomaticaCaixa(...)` | `ENTRADA` | `PAGAMENTO_OS` | **Sim** |
| Venda de balcão | `vendas.ts` | `tx.movimentacaoCaixa.create(...)` **direto** | `ENTRADA` | `VENDA_BALCAO` | **Não** (bypass consciente) |
| Manual (sangria, reforço, saída, entrada avulsa) | UI `/caixa` → rota `movimentacoes` | `registrarMovimentacaoCaixa(...)` | qualquer | `MANUAL` | **Sim** |

### Detalhes de cada caminho

- **Pagamento de OS** (`ordens-servico-pagamentos.ts:65-122`): dentro de `$transaction`, valida caixa `ABERTO` (senão erro 400), cria `Pagamento` e chama `registrarMovimentacaoAutomaticaCaixa` passando `tx`. Vincula `pagamentoId` + `ordemServicoId`.
- **Venda de balcão** (`vendas.ts:45-207`): dentro de `$transaction`, valida caixa `ABERTO` (senão erro 400), baixa estoque e **cria a movimentação diretamente na transação** (`vendas.ts:181`), com comentário explícito: *"Criada diretamente na transação para não tocar o serviço de caixa compartilhado com o fluxo homologado de pagamento de OS."* Vincula `vendaId`. **Não** cria `Pagamento`.
- **Manual** (`caixa.ts:98-133`): valida caixa existe e não está `FECHADO`, cria com `origem: "MANUAL"`.

> **Consequência arquitetural:** a validação "não movimentar caixa fechado" que existe em `registrarMovimentacaoAutomaticaCaixa`/`registrarMovimentacaoCaixa` **não protege** a venda de balcão, que reimplementa a checagem de `status: "ABERTO"` por conta própria. Hoje as duas checagens são equivalentes, mas **qualquer nova regra adicionada ao serviço de caixa não será herdada pela venda de balcão**. Ponto de atenção para a Fase 13.

---

## 5. Regras de cálculo (núcleo — `calcularTotaisCaixa`, `caixa.ts:217-266`)

Percorre `movimentacoes` e acumula:

- **Saldo físico (gaveta):** `saldoInicial + entradasFisicas − saidasFisicas − sangrias + reforcos`.
  - Uma movimentação conta como "física" (dinheiro) se **`formaPagamento.nome` (uppercase) for ou contiver `"DINHEIRO"`**, ou se **não houver forma** (default assume `"DINHEIRO"`).
  - `SANGRIA` subtrai e `REFORCO` soma no físico **sempre**, independentemente de forma.
- **Total por forma de pagamento (`totaisPorFormaPagamento`):** soma `ENTRADA` e subtrai `SAIDA` por nome de forma. **`SANGRIA` e `REFORCO` NÃO entram** neste dicionário.
- **`totalGeralRecebido`:** soma de todos os valores do dicionário por forma.
- `origem` **não influencia** o cálculo — só `tipo` e `formaPagamento`. Portanto vendas de balcão (`ENTRADA`) **são corretamente contabilizadas** nos totais e, se em dinheiro, no físico.

### Fechamento (`fecharCaixa`, `caixa.ts:58-96`)
Dentro de `$transaction`: carrega o caixa, recalcula totais, e grava:
- `saldoFinalInformado` = valor digitado pelo operador (dinheiro na gaveta);
- `saldoFinalCalculado` = **`saldoFisicoCalculado`** (apenas dinheiro, **não** o total geral);
- `divergencia` = `saldoFinalInformado − saldoFinalCalculado` (**positivo = sobra, negativo = falta**);
- `status = "FECHADO"`, `dataFechamento = now`.
- Bloqueia refechamento (`"Caixa já está fechado."`). Fechamento é **terminal** — não há reabertura.

---

## 6. Cobertura de testes

- `caixa.test.ts` (unitário, prisma mockado): abrir (ok/bloqueio duplicado), movimentar (ok/bloqueio fechado), obter aberto com totais físicos (exclui PIX do físico), fechar com divergência. **6 testes.**
- `vendas.test.ts` (integração, banco de teste real): confirma que a venda cria `MovimentacaoCaixa` `ENTRADA`/`VENDA_BALCAO` vinculada, e que **sem caixa aberto nada é persistido**.
- **Lacuna:** não há teste cobrindo o cálculo de totais/físico com **as três origens misturadas** (OS + venda + manual) no mesmo caixa, nem teste do fechamento considerando venda de balcão em dinheiro.

---

## 7. Achados e pontos de atenção (para planejamento da Fase 13)

Nenhum achado bloqueante/crítico que exija parada imediata. Nenhum foi corrigido (proibido nesta fase). Classificados por relevância para o Fechamento Diário:

| # | Achado | Severidade | Implicação para a Fase 13 |
|---|---|---|---|
| A1 | **Caixa é sessão, não "dia".** `abrirCaixa` só bloqueia se houver algum `ABERTO` global; um caixa pode ficar aberto por vários dias. Não há amarração com data. | Conceitual | "Fechamento **diário**" ainda não é um conceito do domínio. Definir se a Fase 13 introduz corte por data ou mantém o modelo por turno. |
| A2 | **Físico depende do `nome` da forma, não do `tipo`.** `calcularTotaisCaixa` usa `nome.includes("DINHEIRO")`, mas o modelo `FormaPagamento` tem o campo confiável `tipo` (`"DINHEIRO"`). Com o seed atual (`nome: "Dinheiro"`) funciona; renomear a forma ou cadastrar variante (ex.: "Espécie") quebraria a conta física silenciosamente. | Média | Conferência do físico é o coração do fechamento. Avaliar migrar o critério para `formaPagamento.tipo`. |
| A3 | **Conferência só cobre dinheiro.** O fechamento compara apenas gaveta física vs `saldoFisicoCalculado`. Não há conferência de PIX/cartão contra o esperado por forma. | Média | Provável **núcleo da Fase 13**: conferência por forma de pagamento. |
| A4 | **Três caminhos de escrita não compartilham validação** (venda de balcão faz bypass do serviço — §4). | Média | Nova regra de fechamento/bloqueio precisa ser aplicada nos 3 pontos, ou o serviço precisa ser o gargalo único. |
| A5 | **`saldoFinalCalculado` guarda só o físico**, não o total geral — nome potencialmente ambíguo em relatórios futuros. | Baixa | Clareza de nomenclatura ao expandir o fechamento. |
| A6 | **Abertura sem trava de concorrência.** `abrirCaixa` faz `findFirst` + `create` sem lock/constraint único em `status`. Dois requests simultâneos poderiam criar dois caixas `ABERTO`. Risco prático baixo (operador único). | Baixa | Considerar constraint/serialização se a Fase 13 depender de "um caixa por dia". |
| A7 | **Rota `movimentacoes/[id]` aceita qualquer caixa por id** (desde que `ABERTO`), não valida ser o caixa aberto atual. Seguro hoje porque só há um aberto por vez. | Baixa | Registrar como premissa. |
| A8 | **Comentário do schema desatualizado** (`origem // MANUAL, PAGAMENTO_OS` não menciona `VENDA_BALCAO`). Documental. | Informativo | Atualizar comentário quando houver autorização para tocar o schema. |

---

## 8. Conclusão

O módulo de caixa está **funcional e homologado desde a Fase 10**, com fechamento de turno já operante (cálculo de divergência incluído). A Fase 12 acoplou a venda de balcão via um **quarto vínculo** (`vendaId`) gravando movimentação **fora do serviço de caixa**, mas os cálculos de totais continuam corretos porque dependem só de `tipo` + `forma`.

Para a Fase 13 (Fechamento Diário), os pontos de decisão mais relevantes são **A1** (modelo dia vs turno), **A2** (critério de dinheiro por `tipo`) e **A3/A4** (conferência por forma + unificação dos caminhos de escrita).

## 9. Perguntas para decisão antes de qualquer implementação

1. **Modelo temporal (A1):** o fechamento da Fase 13 deve introduzir corte "por dia" (data), ou mantemos o modelo atual "por sessão/turno" (um caixa aberto por vez, fechado manualmente)?
2. **Conferência (A3):** o fechamento deve passar a conferir também PIX/cartão (esperado por forma vs informado), ou permanece só a conferência de dinheiro físico?
3. **Critério de dinheiro (A2):** autorizado a planejar a troca de `nome.includes("DINHEIRO")` por `formaPagamento.tipo === "DINHEIRO"`? (mudança de regra financeira — exigiria teste; nesta fase apenas planejamento.)
4. Algum dos achados A2/A4/A6 deve virar correção priorizada **antes** do fechamento, ou todos entram no plano da própria Fase 13?
