# Fatia 13.2 — Blindagem do Cálculo do Caixa e Testes de Integração

**Data:** 2026-07-05
**Escopo:** Substituir o critério de identificação de "dinheiro físico" no cálculo do caixa, deixando de depender do **nome** da forma de pagamento e passando a usar o campo confiável **`formaPagamento.tipo === "DINHEIRO"`**. Reforçar a cobertura de testes.
**Origem:** Achado **A2** da auditoria [Fase 13.1](AUDITORIA_13_1_CAIXA_ATUAL_E_MAPA_INTEGRACOES.md).

> Restrições cumpridas: schema **não** alterado, **nenhuma** migration criada, APIs/telas/venda de balcão/pagamento de OS/estoque **intactos**, sem commit, sem push. Alteração restrita ao mínimo necessário no serviço de caixa + testes.

---

## 1. Diagnóstico inicial

```
git status -sb
## main...origin/main
?? docs/02-fases/fase-13-fechamento-caixa/   (apenas a pasta de docs da Fase 13.1, untracked)

git diff --stat
(vazio — nenhum arquivo de código modificado antes desta fatia)
```

Repositório limpo em código. Prossegui.

---

## 2. Verificação das queries (Tarefa 3)

As três funções que carregam movimentações usam `include: { formaPagamento: true }`, que já materializa o registro completo de `FormaPagamento`, **incluindo o campo `tipo`**:

- `obterCaixaAberto` (`caixa.ts:22-25`)
- `fecharCaixa` (`caixa.ts:62-64`)
- `obterDetalhesCaixa` (`caixa.ts:200-203`)

**Conclusão:** o campo `tipo` já estava disponível em runtime. **Nenhuma query precisou ser alterada.**

---

## 3. Alteração de cálculo (Tarefa 4 e 5)

Arquivo: `src/lib/caixa.ts`, função privada `calcularTotaisCaixa`.

**Antes** (critério frágil por nome):
```ts
const nomeForma = mov.formaPagamento?.nome?.toUpperCase() || "DINHEIRO";
const ehDinheiro = nomeForma === "DINHEIRO" || nomeForma.includes("DINHEIRO");
```

**Depois** (critério confiável por tipo):
```ts
// Chave de agrupamento do "Total Recebido no Dia" (rótulo de exibição).
const nomeForma = mov.formaPagamento?.nome?.toUpperCase() || "DINHEIRO";
// Critério de dinheiro físico (gaveta): usa o campo confiável formaPagamento.tipo,
// não o nome. Movimentação sem forma de pagamento continua sendo tratada como
// dinheiro (comportamento preservado — ex.: sangrias/reforços e entradas avulsas).
const ehDinheiro = !mov.formaPagamento || mov.formaPagamento.tipo === "DINHEIRO";
```

### O que mudou e o que foi preservado
- **Mudou:** a decisão "isto é dinheiro físico?" agora se baseia em `formaPagamento.tipo === "DINHEIRO"`.
- **Preservado — movimentação sem forma:** continua tratada como dinheiro (`!mov.formaPagamento`). Cobre sangrias, reforços e entradas/saídas manuais avulsas sem forma.
- **Preservado — agrupamento de exibição:** a chave `nomeForma` (rótulo do "Total Recebido no Dia") continua vindo do `nome`. Só o critério do físico mudou.
- **Preservado — PIX/cartão:** permanecem fora do saldo físico (tipo diferente de DINHEIRO).
- **Preservado — sangria/reforço:** continuam afetando o físico independentemente de forma; continuam fora do total por forma.
- **Preservado — divergência:** `fecharCaixa` recalcula via `calcularTotaisCaixa` e mantém `divergencia = saldoFinalInformado − saldoFisicoCalculado`.

### Diferença comportamental intencional (blindagem)
No critério antigo, uma forma cujo **nome** contivesse "DINHEIRO" mas com **tipo** diferente (ex.: "Dinheiro Eletrônico"/PIX) entraria erroneamente no físico; e uma forma de dinheiro com **nome** divergente (ex.: "Espécie", tipo DINHEIRO) **não** entraria. Ambos os casos agora são resolvidos corretamente pelo `tipo`. Formas com `tipo` nulo passam a ser tratadas como **não-dinheiro** — no seed atual todas as formas têm `tipo` definido, então não há impacto nos dados existentes.

---

## 4. Testes criados/ajustados

Arquivo: `src/lib/caixa.test.ts`.

### Ajustados (mocks passaram a incluir `tipo`)
- `obterCaixaAberto` › "deve retornar o caixa e calcular os totais fisicos": mocks de forma agora têm `tipo` (`DINHEIRO`/`PIX`). Resultado inalterado (físico 130, geral 230).
- `fecharCaixa` › "deve fechar o caixa e calcular a divergência": mock com `tipo: "DINHEIRO"`. Resultado inalterado (calculado 150, informado 140, divergência −10).

### Novos (bloco `calcularTotaisCaixa - blindagem por formaPagamento.tipo`)
1. **Forma com `tipo: "DINHEIRO"` e nome ≠ "Dinheiro"** ("Espécie") → entra no físico (100 + 60 = 160).
2. **Nome contém "Dinheiro" mas `tipo` = PIX** ("Dinheiro Eletrônico") → **fora** do físico (fica em 100). Prova que o critério antigo por nome foi eliminado.
3. **Origens misturadas no mesmo caixa** (`PAGAMENTO_OS` + `VENDA_BALCAO` + `MANUAL`), cobrindo simultaneamente:
   - dinheiro com nome divergente (físico);
   - PIX e cartão fora do físico, mas presentes no total por forma;
   - saída manual em dinheiro reduzindo o físico;
   - **sangria** subtraindo do físico;
   - **reforço** somando no físico;
   - entrada manual **sem forma** tratada como dinheiro implícito.
   - Assertivas: `saldoFisicoCalculado = 150`, `totalGeralRecebido = 350`, e totais por forma (PIX 200, Cartão 80, Dinheiro Espécie 50, Dinheiro 20).

O teste de integração **venda de balcão → caixa** (`src/lib/vendas.test.ts`) **não foi alterado** e continua passando.

---

## 5. Comandos executados e resultados

| Comando | Resultado |
|---|---|
| `git status -sb` / `git diff --stat` | Limpo (só docs untracked) |
| `npm run lint` | ✅ `No ESLint warnings or errors` |
| `npx vitest run src/lib/caixa.test.ts` | ✅ 9 passed (6 originais + 3 novos) |
| `npm run test` (suíte completa) | ✅ **27 arquivos / 264 testes** passaram |
| `npm run build` | ✅ Build de produção concluído sem erros |

---

## 6. Riscos remanescentes

- **Dependência de `tipo` bem preenchido:** o cálculo do físico agora depende de `FormaPagamento.tipo`. Formas cadastradas com `tipo` nulo/incorreto seriam classificadas como não-dinheiro. Mitigação: seed atual preenche `tipo` em todas as formas; recomenda-se tornar `tipo` obrigatório na tela de cadastro de formas em fatia futura (fora do escopo desta — não altera telas).
- **Escopo de nomenclatura:** `saldoFinalCalculado` continua representando apenas o físico (achado A5 da auditoria) — não abordado aqui.
- Nenhuma regra de pagamento, venda, estoque ou schema foi tocada; risco de regressão baixo, confirmado pela suíte completa verde.

---

## 7. Roteiro de homologação manual

1. Garanta que exista uma `FormaPagamento` com `tipo = "DINHEIRO"` (o seed já cria "Dinheiro"). Opcional: crie uma forma de teste com nome diferente (ex.: "Espécie") e `tipo` DINHEIRO.
2. Abra o caixa com um fundo inicial (ex.: R$ 100).
3. Registre um pagamento de OS **em dinheiro** e outro **em PIX**. No painel `/caixa`:
   - o **Saldo Físico** sobe apenas com o valor em dinheiro;
   - o **Total Recebido no Dia** mostra dinheiro **e** PIX.
4. Registre uma **sangria** (ex.: R$ 10) e um **reforço** (ex.: R$ 5): o Saldo Físico cai/sobe corretamente.
5. Registre uma **venda de balcão** em dinheiro: deve somar ao Saldo Físico; em PIX/cartão, não.
6. Feche o caixa informando o valor real da gaveta e confira a **divergência** (positiva = sobra, negativa = falta).
7. Confira o mesmo caixa em `/caixa/historico` → **Ver Detalhes**: divergência e totais consistentes.

---

## 8. Confirmação

**Nenhum commit e nenhum push foram realizados.** As mudanças estão apenas na árvore de trabalho:
- `src/lib/caixa.ts` (critério de dinheiro)
- `src/lib/caixa.test.ts` (mocks ajustados + 3 testes novos)
- `docs/02-fases/fase-13-fechamento-caixa/FATIA_13_2_BLINDAGEM_CALCULO_CAIXA.md` (este relatório)
