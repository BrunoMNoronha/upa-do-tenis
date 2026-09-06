# Fatia 13.3 — Conferência Operacional por Forma de Pagamento

**Data:** 2026-07-05
**Escopo:** Melhorar a apresentação do caixa (aberto, fechamento e detalhe) para exibir com clareza os totais esperados por forma de pagamento (dinheiro, PIX, cartão, outras), deixando explícito que a divergência persistida continua sendo apenas do dinheiro físico.
**Origem:** Evolução natural após a [Fase 13.1 (auditoria)](AUDITORIA_13_1_CAIXA_ATUAL_E_MAPA_INTEGRACOES.md) e a [Fatia 13.2 (blindagem do cálculo)](FATIA_13_2_BLINDAGEM_CALCULO_CAIXA.md), já publicada em `origin/main` (commit `c6e25ec`).

> Restrições cumpridas: schema **não** alterado, nenhuma migration, nenhuma API alterada, venda de balcão/pagamento de OS/estoque **intactos**, nenhum cálculo financeiro recalculado no frontend, sem commit, sem push.

---

## 1. Diagnóstico inicial

```
git status -sb
## main...origin/main   (limpo, sem alterações pendentes)

git diff --stat
(vazio)
```

Repositório limpo e alinhado com `origin/main` antes de iniciar.

---

## 2. Inspeção e confirmação de disponibilidade dos dados (Tarefa 4)

Inspecionados: `src/lib/caixa.ts`, `caixa-client.tsx`, `caixa-detalhe-client.tsx`, `historico-client.tsx`, `api/caixa/atual/route.ts`, `api/caixa/[id]/route.ts`.

**Confirmado:** `obterCaixaAberto()` e `obterDetalhesCaixa()` já retornam, via `calcularTotaisCaixa`, o objeto `totais` completo:
```ts
totais: {
  entradasFisicas, saidasFisicas, sangrias, reforcos,
  saldoFisicoCalculado, totalGeralRecebido, totaisPorFormaPagamento
}
```
- `GET /api/caixa/atual` → `{ caixa: obterCaixaAberto() }` — já consumido por `caixa-client.tsx`.
- `GET /api/caixa/[id]` → `obterDetalhesCaixa(id)` — já consumido por `caixa-detalhe-client.tsx`.

**Conclusão:** todos os dados exigidos (dinheiro físico, totais por forma, total geral) **já chegavam ao frontend antes desta fatia**. Nenhum ajuste de retorno/tipagem em `src/lib/caixa.ts` foi necessário. A fatia inteira é de apresentação (Tarefa 5).

`listarCaixas()` (usado no histórico) não inclui `totais` — por desenho, é uma listagem resumida; o detalhe por forma é acessado via "Ver Detalhes", que já carrega `obterDetalhesCaixa`. Nenhuma mudança foi necessária aqui além de rótulo/texto.

---

## 3. Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/app/caixa/caixa-client.tsx` | Painel do caixa aberto: textos de esclarecimento + estado vazio de recebimentos; formulário de fechamento ganhou bloco de prévia ("Resumo antes de fechar") |
| `src/app/caixa/[id]/caixa-detalhe-client.tsx` | Rótulos mais claros ("Dinheiro Esperado", "Dinheiro Informado no Fechamento") + textos de esclarecimento + estado vazio |
| `src/app/caixa/historico/historico-client.tsx` | Cabeçalho da coluna renomeado para "Divergência (Dinheiro)" + nota explicativa abaixo da tabela |
| `src/lib/caixa.ts` | **Não alterado** |
| `src/lib/caixa.test.ts` | **Não alterado** |

Nenhum arquivo de API, schema, venda de balcão, pagamento de OS ou estoque foi tocado.

---

## 4. Resumo da melhoria

### 4.1 Painel do caixa aberto (`caixa-client.tsx`)
- Card "Resumo Físico (Gaveta)": adicionado texto "Divergência calculada apenas sobre dinheiro físico."
- Card "Total Recebido no Dia": título do total renomeado para "Total Geral Recebido"; adicionado estado vazio ("Nenhum recebimento registrado ainda.") quando `totaisPorFormaPagamento` está vazio; adicionado texto "PIX, cartão e outras formas são exibidos aqui apenas para conferência operacional. Total geral recebido não representa dinheiro em gaveta."

### 4.2 Fluxo de fechamento (mesmo arquivo, card "Fechar Caixa")
Adicionado bloco **"Resumo antes de fechar"**, exibido junto ao formulário, antes da confirmação:
- **Dinheiro Físico Esperado** — vem direto de `caixa.totais.saldoFisicoCalculado` (já calculado pelo backend).
- **Divergência Prevista** — só aparece quando o operador já digitou um valor; calculada como `valorDigitado − saldoFisicoCalculado`. É uma **prévia de UX** feita em cima de dois números (um vindo do backend, outro ainda não enviado ao servidor); a divergência **oficial e persistida** continua sendo calculada exclusivamente por `fecharCaixa()` no backend, no momento da confirmação. Cor verde (sobra), vermelha (falta) ou neutra (exato).
- **Totais por forma (conferência operacional)** — lista `totaisPorFormaPagamento` tal como vem do backend, sem qualquer recomputação.
- **Total Geral Recebido**.
- Texto fixo: "Divergência calculada apenas sobre dinheiro físico. PIX/cartão são exibidos para conferência operacional."

### 4.3 Detalhe do caixa fechado (`caixa-detalhe-client.tsx`)
- Rótulo "Saldo Físico Calculado" → **"Dinheiro Esperado (Saldo Físico Calculado)"** (mesmo valor, rótulo mais claro).
- Rótulo "Informado no Fechamento" → **"Dinheiro Informado no Fechamento"**.
- Adicionado texto "Divergência calculada apenas sobre dinheiro físico." sob o resumo físico.
- Card "Total Recebido no Dia": mesmo tratamento de estado vazio e texto de esclarecimento do painel aberto.

### 4.4 Histórico (`historico-client.tsx`)
- Cabeçalho de coluna: "Divergência" → **"Divergência (Dinheiro)"**.
- Nota abaixo da tabela: "Divergência calculada apenas sobre dinheiro físico. Totais por forma de pagamento estão disponíveis em Ver Detalhes."

### 4.5 Estados de tela tratados (Tarefa 11)
- **Carregando:** já existente (`LoadingState`), inalterado.
- **Erro:** já existente (`ErrorState`), inalterado.
- **Caixa sem movimentações:** já existente ("Nenhuma movimentação registrada."); **novo:** estado vazio específico para "Total Recebido no Dia" quando não há nenhuma entrada/saída por forma (ex.: caixa só com sangria/reforço).
- **Caixa fechado:** já existente no detalhe; rótulos reforçados.
- **Caixa aberto:** estado principal, reforçado com os textos de conferência.

---

## 5. Confirmação: alteração backend

**Não houve alteração de backend.** `src/lib/caixa.ts` e as rotas de API permanecem exatamente como estavam após a Fatia 13.2. Toda a informação exibida já era retornada pelas funções `obterCaixaAberto`, `fecharCaixa` (via recálculo interno) e `obterDetalhesCaixa`.

## 6. Confirmação: alteração em testes

**Não houve alteração em testes.** Como nenhuma regra de cálculo ou retorno de backend mudou, `src/lib/caixa.test.ts` e `src/lib/vendas.test.ts` permanecem inalterados. A suíte completa (264 testes) foi executada para confirmar ausência de regressão.

---

## 7. Comandos executados e resultados

| Comando | Resultado |
|---|---|
| `git status -sb` / `git diff --stat` | Limpo antes de iniciar; ao final, apenas os 3 arquivos de tela listados na seção 3 |
| `pnpm run lint` | ✅ No ESLint warnings or errors |
| `pnpm run test` | ✅ 27 arquivos / 264 testes passaram |
| `pnpm run build` | ✅ Build de produção concluído sem erros |
| Verificação manual em preview (`pnpm run dev`) | ✅ Ver seção 8 |

---

## 8. Verificação manual em preview (navegador)

Fluxo completo testado no preview local:
1. Abertura de caixa (saldo inicial R$ 1,00) → painel "Caixa Aberto" com os novos textos de esclarecimento visíveis.
2. Registro de uma movimentação `ENTRADA` de R$ 200,00 vinculada à forma "Dinheiro" cadastrada no ambiente → card "Total Recebido no Dia" passou a exibir `DINHEIRO: R$ 200,00` e "Total Geral Recebido: R$ 200,00", com o texto de conferência operacional visível.
3. Abertura do formulário de fechamento com valor informado R$ 50,00 → bloco "Resumo antes de fechar" exibiu corretamente: Dinheiro Físico Esperado R$ 1,00, Divergência Prevista R$ 49,00 (em verde, cor de sobra), lista de totais por forma e total geral — tudo consistente com os dados do backend.
4. Confirmação do fechamento → tela de detalhe do caixa (`/caixa/[id]`) exibiu corretamente "Dinheiro Esperado", "Dinheiro Informado no Fechamento" (R$ 50,00), "Divergência" (R$ 49,00) e os totais por forma, com os textos de esclarecimento.
5. Histórico (`/caixa/historico`) exibiu a coluna "Divergência (Dinheiro)" e a nota explicativa abaixo da tabela.

Todos os elementos exigidos pelos critérios de aceite foram confirmados visualmente, não apenas por leitura de código.

---

## 9. Achado crítico encontrado durante a verificação (fora do escopo desta fatia — decisão necessária)

Durante o teste manual (item 2 da seção 8), foi identificado que **a `FormaPagamento` "Dinheiro" cadastrada neste ambiente tem o campo `tipo` vazio (`""`)**, não `"DINHEIRO"`. Como consequência, uma entrada de R$ 200,00 registrada com essa forma foi corretamente excluída do "Saldo Físico Calculado" pelo critério introduzido na Fatia 13.2 (`formaPagamento.tipo === "DINHEIRO"`) — ou seja, o código se comportou exatamente como projetado e testado, **mas o dado real do ambiente não satisfaz a premissa da regra**.

Investigação da causa raiz:
- O campo `tipo` em `FormaPagamento` é **texto livre e opcional** na tela de cadastro (`src/app/formas-pagamento/formas-pagamento-form.tsx`, rótulo "Tipo Interno (Opcional)"), validado apenas como `z.string().optional()` (`src/lib/formas-pagamento-schema.ts`). Não há enum, não há obrigatoriedade, não há normalização de caixa (maiúsculas/minúsculas).
- Isso significa que qualquer forma de pagamento — inclusive uma nomeada "Dinheiro" — pode ter `tipo` vazio, nulo, ou grafado de forma diferente (`"dinheiro"`, `"Especie"`, etc.), caso tenha sido cadastrada manualmente pela tela em vez de via `prisma/seed.ts` (que define `tipo: "DINHEIRO"` corretamente).
- **Consequência prática:** em qualquer ambiente (inclusive produção, se o mesmo padrão de cadastro ocorreu) onde a forma "Dinheiro" tenha `tipo` vazio, o saldo físico deixará de contabilizar corretamente as entradas em dinheiro — a divergência do fechamento ficará incorreta **silenciosamente**, sem erro visível, pois o cálculo simplesmente classifica a movimentação como "não física".

Este é exatamente o tipo de risco que a auditoria 13.1 (achado A2) já havia sinalizado como consequência de depender de um campo não obrigatório. A Fatia 13.2 resolveu o problema do **nome livre**, mas introduziu uma nova dependência sobre um campo (`tipo`) que **também é livre e opcional hoje**.

**Este achado NÃO foi corrigido nesta fatia**, por estar fora do escopo (Fatia 13.3 é só apresentação; alterar a regra de cadastro ou fazer backfill de dados é uma decisão financeira/operacional que exige autorização explícita, conforme as restrições do projeto). Fica registrado para decisão.

---

## 10. Riscos remanescentes

- **CRÍTICO (achado da seção 9):** dependência do campo `tipo` de `FormaPagamento`, hoje opcional e sem validação, para o cálculo correto do dinheiro físico. Recomenda-se, como próxima decisão: (a) tornar `tipo` obrigatório e com opções controladas (select/enum) na tela de cadastro; e/ou (b) conferir e corrigir manualmente os registros existentes de `FormaPagamento` que representam dinheiro, garantindo `tipo = "DINHEIRO"`. Nenhuma dessas ações foi tomada nesta fatia.
- **Prévia de divergência no frontend:** o valor "Divergência Prevista" é calculado no navegador a partir de um número já fornecido pelo backend (`saldoFisicoCalculado`) e do valor ainda não confirmado que o operador está digitando. Isso é inerente a qualquer prévia de UX antes do envio; a divergência oficial persistida continua sendo calculada e gravada exclusivamente por `fecharCaixa()` no backend.
- **Filtragem por nome não foi usada:** deliberadamente não foi implementada nenhuma lógica de exclusão de "dinheiro" na lista `totaisPorFormaPagamento` exibida na prévia de fechamento (isso reintroduziria fragilidade por nome, o mesmo padrão que a Fatia 13.2 eliminou). Como resultado, uma forma de dinheiro pode aparecer tanto em "Dinheiro Físico Esperado" quanto na lista "Totais por forma" — isso é intencional e inofensivo (informação duplicada para conferência), não um erro.

---

## 11. Roteiro de homologação manual

1. Abra o caixa com saldo inicial (ex.: R$ 50,00).
2. Verifique o texto "Divergência calculada apenas sobre dinheiro físico." no card "Resumo Físico (Gaveta)".
3. Registre uma movimentação em dinheiro e, se disponível, uma em PIX/cartão. Confira que o card "Total Recebido no Dia" lista cada forma e exibe o texto de conferência operacional.
4. **Antes de cadastrar movimentações, verifique se a forma "Dinheiro" tem `tipo = DINHEIRO`** em `/formas-pagamento` (achado crítico da seção 9) — caso contrário, o saldo físico não refletirá entradas em dinheiro corretamente.
5. Clique em "Iniciar Fechamento" e digite um valor de dinheiro físico. Confirme que o bloco "Resumo antes de fechar" mostra Dinheiro Físico Esperado, Divergência Prevista (cor correta) e os totais por forma, antes de confirmar.
6. Confirme o fechamento e acesse o detalhe do caixa (`/caixa/[id]`): confira "Dinheiro Esperado", "Dinheiro Informado no Fechamento", "Divergência" e os totais por forma.
7. Acesse `/caixa/historico` e confira a coluna "Divergência (Dinheiro)" e a nota explicativa.
8. Teste o estado vazio: abra um novo caixa sem registrar nenhuma movimentação por forma (ex.: apenas sangria/reforço) e confirme a mensagem "Nenhum recebimento registrado ainda." no card de totais.
