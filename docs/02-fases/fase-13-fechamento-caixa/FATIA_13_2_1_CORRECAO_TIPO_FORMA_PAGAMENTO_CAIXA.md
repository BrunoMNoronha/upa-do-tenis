# Fatia 13.2.1 — Correção Crítica de FormaPagamento.tipo para Cálculo do Caixa

**Data:** 2026-07-05
**Escopo:** Corrigir a causa raiz do risco crítico encontrado durante a verificação manual da [Fatia 13.3](FATIA_13_3_CONFERENCIA_OPERACIONAL_POR_FORMA.md): a forma de pagamento "Dinheiro" pode ser cadastrada com `tipo` vazio, fazendo o caixa deixar de contabilizar dinheiro no saldo físico (regra introduzida na [Fatia 13.2](FATIA_13_2_BLINDAGEM_CALCULO_CAIXA.md), já publicada em `origin/main`, commit `c6e25ec`).

> Restrições cumpridas: nenhuma migration criada, nenhuma regra de fechamento alterada, `src/lib/caixa.ts` **não** foi tocado (o cálculo em si estava correto — o problema era a validação de dados na origem), venda de balcão/pagamento de OS/estoque **intactos**, sem commit, sem push.

---

## 1. Diagnóstico inicial

```
git status -sb
## main...origin/main
 M src/app/caixa/[id]/caixa-detalhe-client.tsx
 M src/app/caixa/caixa-client.tsx
 M src/app/caixa/historico/historico-client.tsx
?? docs/02-fases/fase-13-fechamento-caixa/FATIA_13_3_CONFERENCIA_OPERACIONAL_POR_FORMA.md

git diff --stat
 src/app/caixa/[id]/caixa-detalhe-client.tsx  | 22 +++++++---
 src/app/caixa/caixa-client.tsx               | 55 +++++++++++++++++++++--
 src/app/caixa/historico/historico-client.tsx |  5 ++-
```

Havia alterações locais pendentes da Fatia 13.3 (não commitadas), conforme esperado.

---

## 2. Estratégia para não misturar com a Fatia 13.3

Antes de editar qualquer arquivo, foi avaliado se a correção 13.2.1 tocaria algum dos arquivos já modificados pela 13.3. **Conclusão: os conjuntos de arquivos são totalmente disjuntos.**

- **Fatia 13.3** (telas de caixa): `caixa-client.tsx`, `caixa-detalhe-client.tsx`, `historico-client.tsx`.
- **Fatia 13.2.1** (formas de pagamento + saneamento): `formas-pagamento-schema.ts`, `formas-pagamento.ts`, `formas-pagamento-form.tsx`, novo script, novos testes, `package.json`, mais um teste adicional em `caixa.test.ts` (arquivo de teste, não de regra).

Como não há sobreposição de arquivos, **não foi necessário usar stash nem criar branch separada**. A estratégia adotada foi:
1. Prosseguir editando apenas os arquivos da correção 13.2.1, sem tocar nos 3 arquivos já modificados pela 13.3.
2. Ao final, confirmar via `git status -sb` que os arquivos da 13.3 permanecem exatamente como estavam (mesmo diff, nenhuma linha a mais).
3. Documentar explicitamente, nesta seção e na seção 4, a lista exata de arquivos por fatia, para que — quando autorizado — o commit da 13.2.1 seja feito com `git add <caminhos explícitos>`, exatamente como já foi feito na Fatia 13.2 (nunca `git add -A`), preservando os arquivos da 13.3 não commitados e intocados para seu próprio commit futuro.

Verificado ao final (seção 6): o diff dos 3 arquivos da 13.3 é **idêntico** ao do início desta tarefa — nenhuma mistura ocorreu.

---

## 3. Causa raiz confirmada

Investigação em `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/formas-pagamento.ts`, `src/lib/formas-pagamento-schema.ts`, `src/app/formas-pagamento/`, `src/app/api/formas-pagamento/`:

1. **Schema Prisma:** `FormaPagamento.tipo` é `String?` (opcional) — correto manter assim, pois mudar para obrigatório exigiria migration (fora de escopo/autorização).
2. **Validação (`formas-pagamento-schema.ts`):** `tipo: z.string().optional()` — **nenhuma obrigatoriedade, nenhuma normalização**. Esta é a causa raiz: a única porta de entrada de novos cadastros (tela `/formas-pagamento` → `POST /api/formas-pagamento`) aceitava `tipo` vazio, nulo ou com qualquer grafia.
3. **`prisma/seed.ts`:** já cria "Dinheiro" corretamente com `tipo: "DINHEIRO"` — **não precisou de correção**. Porém o script tem uma guarda (`if (countClientes > 0) return`) que **pula toda a execução** se o banco já tiver clientes — proteção correta contra sobrescrita de dados reais, mas que também significa que o seed **não é reexecutável** para corrigir bancos já populados (como o banco de dev usado na verificação da 13.3, que tinha um registro "Dinheiro" com `tipo: ""` criado antes desta correção).
4. **Não existe rota de edição** de forma de pagamento (`src/app/api/formas-pagamento/route.ts` só tem `POST`, sem `PUT`/`PATCH`) — logo "impedir edição com tipo vazio" não se aplicava; só havia o caminho de criação a proteger.
5. **Confirmado por grep:** `formaPagamento.tipo` só é usado para cálculo em `src/lib/caixa.ts` (linha 234); em todo o resto do código é apenas exibição (rótulo). Ou seja, tornar `tipo` obrigatório e normalizado não tem efeito colateral em nenhuma outra regra (venda, pagamento de OS, estoque, relatórios).

---

## 4. Arquivos alterados (Fatia 13.2.1 — disjuntos da 13.3)

| Arquivo | Mudança |
|---|---|
| `src/lib/formas-pagamento-schema.ts` | `tipo` passa a ser obrigatório (`min(1)`), com `.trim()` e normalização para maiúsculas via `.transform()` |
| `src/app/formas-pagamento/formas-pagamento-form.tsx` | Rótulo "Tipo Interno (Opcional)" → "Tipo Interno"; adicionado texto de ajuda explicando a criticidade para o caixa |
| `src/lib/formas-pagamento.ts` | Nova função `sanearTipoFormaPagamentoDinheiro()` — saneamento seguro e idempotente |
| `scripts/saneamento-forma-pagamento-dinheiro.ts` | Novo script CLI (mesmo padrão de `scripts/bootstrap-admin.ts`), chama a função acima |
| `package.json` | Novo script `"saneamento:forma-dinheiro"` |
| `src/lib/formas-pagamento-schema.test.ts` | **Novo** — testes da validação (obrigatoriedade + normalização) |
| `src/lib/formas-pagamento.test.ts` | **Novo** — testes da função de saneamento (prisma mockado) |
| `src/lib/caixa.test.ts` | +1 teste reproduzindo literalmente o cenário do achado (nome "Dinheiro", tipo corrigido) |

**Não alterados:** `prisma/schema.prisma` (sem migration), `prisma/seed.ts` (já estava correto), `src/lib/caixa.ts` (cálculo do caixa intocado — o problema era de dado/validação, não de lógica), `src/app/api/formas-pagamento/route.ts` (a validação já delega ao schema, que agora bloqueia corretamente), venda de balcão, pagamento de OS, estoque.

---

## 5. Correção implementada

### 5.1 Bloqueio de cadastro com tipo vazio (schema)
```ts
tipo: z
  .string()
  .trim()
  .min(1, "Informe o tipo (ex: DINHEIRO, PIX, CARTAO_CREDITO, CARTAO_DEBITO). É usado para identificar dinheiro físico no caixa.")
  .transform((valor) => valor.toUpperCase()),
```
- Bloqueia string vazia, string só com espaços, e ausência do campo.
- Normaliza para maiúsculas (`"dinheiro"` → `"DINHEIRO"`), eliminando divergência de grafia — **sem** impor uma lista fechada de valores (mantém flexibilidade para tipos futuros, ex.: `"TRANSFERENCIA"`).
- Não é uma mudança de "cálculo do caixa": é validação de entrada na tela de cadastro. `src/lib/caixa.ts` permanece com a mesma comparação (`tipo === "DINHEIRO"`) já corrigida na Fatia 13.2.

### 5.2 Saneamento de dados existentes (script seguro e restrito)
Nova função `sanearTipoFormaPagamentoDinheiro()`:
- Busca **apenas** formas cujo `nome` seja exatamente `"Dinheiro"` (case-insensitive) — nenhuma outra forma é tocada.
- Dentre essas, corrige apenas as que têm `tipo` vazio/nulo, setando `tipo = "DINHEIRO"`.
- **Deliberadamente não** tenta adivinhar ou corrigir nomes ambíguos (ex.: "Dinheiro Físico", "Espécie", "Caixa") — consistente com a restrição do projeto de não alterar dados de forma automática sem regra clara. Esses casos exigem revisão manual pela tela `/formas-pagamento`.
- Idempotente: rodar novamente não altera nada se já estiver corrigido (testado).
- Exposto via `npm run saneamento:forma-dinheiro` (script `scripts/saneamento-forma-pagamento-dinheiro.ts`, mesmo padrão de `bootstrap-admin.ts`).

### 5.3 Execução do saneamento no ambiente de dev (verificação)
Para fechar o ciclo e confirmar a correção de ponta a ponta, o script foi executado no banco de **desenvolvimento** local (`upa_do_tenis_dev`, o mesmo onde o bug foi encontrado na Fatia 13.3):

```
npm run saneamento:forma-dinheiro
Formas chamadas "Dinheiro" encontradas: 1
✅ Corrigidas 1 forma(s) para tipo = "DINHEIRO":
  - cmr6u027e000753c6nv3ucwue
```
Reexecução confirmou idempotência:
```
Formas chamadas "Dinheiro" encontradas: 1
✅ Nenhuma correção necessária — tipo já preenchido corretamente.
```

**Nota:** esta execução alterou apenas o dado (um campo de um registro) no banco de desenvolvimento local, não código nem schema. Rodar este mesmo script em ambientes de homologação/produção é uma decisão operacional separada, a ser tomada e executada pelo responsável por esses ambientes — este relatório não presume autorização para isso.

---

## 6. Testes criados/ajustados

| Arquivo | Cobertura |
|---|---|
| `src/lib/formas-pagamento-schema.test.ts` (novo, 6 testes) | Aceita `tipo: "DINHEIRO"`; normaliza minúsculas/misto para maiúsculas; rejeita string vazia; rejeita string só com espaços; rejeita ausência do campo; remove espaços nas bordas antes de normalizar |
| `src/lib/formas-pagamento.test.ts` (novo, 4 testes) | Corrige "Dinheiro" com tipo vazio; corrige "Dinheiro" com tipo nulo; **não** altera "Dinheiro" que já tem tipo DINHEIRO (idempotência); não altera nomes diferentes de "Dinheiro" (filtro exato validado) |
| `src/lib/caixa.test.ts` (+1 teste) | Reproduz o cenário exato do achado: forma "Dinheiro" com tipo corrigido para "DINHEIRO" volta a contar no saldo físico |

PIX/cartão fora do saldo físico e a blindagem por `tipo` (nome divergente, nome enganoso) **já estavam cobertos** pelos testes da Fatia 13.2 — não foram duplicados.

---

## 7. Comandos executados e resultados

| Comando | Resultado |
|---|---|
| `git status -sb` / `git diff --stat` (antes) | 3 arquivos modificados da Fatia 13.3, nenhuma sobreposição com esta correção |
| `npm run lint` | ⚠️ Falhou na primeira execução (aspas retas não escapadas em JSX) → ✅ corrigido (`&quot;`) → **aprovado** |
| `npm run test` | ✅ **29 arquivos / 275 testes** passaram (264 anteriores + 11 novos) |
| `npm run build` | ✅ Build de produção concluído sem erros |
| Verificação manual em preview | ✅ Ver seção 8 |
| `git status -sb` (depois) | Confirma que os 3 arquivos da Fatia 13.3 permanecem com o **mesmo diff**, sem mistura |

---

## 8. Verificação manual em preview (navegador)

1. Acessada a tela `/formas-pagamento`: rótulo "Tipo Interno" (sem "(Opcional)") e texto de ajuda visíveis.
2. Tentativa de cadastro de uma forma sem preencher `tipo`: **bloqueado** pelo formulário, com a mensagem de validação exibida; nenhum registro foi criado (contagem "Total" permaneceu 1).
3. Executado `npm run saneamento:forma-dinheiro` contra o banco de dev: 1 registro corrigido (o mesmo identificado na Fatia 13.3).
4. Reaberto um caixa e registradas movimentações vinculadas à forma "Dinheiro" (já corrigida): uma `ENTRADA` de R$ 500,00 e uma `SAÍDA` de R$ 200,00.
5. Consulta a `GET /api/caixa/atual` confirmou:
   ```json
   { "entradasFisicas": 500, "saidasFisicas": 200, "saldoFisicoCalculado": 400, ... }
   ```
   Com saldo inicial de R$ 100,00: `100 + 500 − 200 = 400` ✅ — o saldo físico agora responde corretamente a movimentações em dinheiro, tanto entradas quanto saídas, confirmando a correção de ponta a ponta (schema → dado → cálculo já existente do caixa).

---

## 9. Riscos remanescentes

- **Formas ambíguas não cobertas pelo saneamento automático:** qualquer forma de pagamento que represente dinheiro mas tenha um nome diferente de exatamente "Dinheiro" (ex.: "Espécie", "Dinheiro Físico") e `tipo` vazio **não é corrigida automaticamente** — por design, para não alterar dados de forma ambígua sem regra clara. Recomenda-se auditoria manual pontual das formas cadastradas em produção (`/formas-pagamento`) para garantir que todas as que representam dinheiro tenham `tipo = "DINHEIRO"`.
- **Ambientes além do dev:** o saneamento foi executado apenas no banco de desenvolvimento local. Homologação e produção exigem decisão e execução separadas pelo responsável pelo ambiente.
- **Tipo ainda é texto livre (não enum):** a correção torna `tipo` obrigatório e normalizado em maiúsculas, mas continua sendo um campo de texto livre (não um select fechado). Um operador ainda pode digitar um valor diferente de "DINHEIRO" para uma forma que deveria ser física (ex.: "MOEDA"). Isso reduz drasticamente o risco (bloqueia o caso mais comum — campo vazio — e elimina divergência de caixa), mas não o elimina 100%. Uma evolução futura (fora deste escopo, por envolver mudança de UI mais ampla) seria substituir o campo livre por um seletor com opções controladas.
- **Nenhuma migration foi criada** — o campo `tipo` continua opcional no schema Prisma (`String?`), por não haver autorização para alterar schema nesta fatia. A obrigatoriedade é garantida apenas na camada de aplicação (Zod), não no banco.

---

## 10. Roteiro de homologação manual

1. Acesse `/formas-pagamento` e tente cadastrar uma forma sem preencher "Tipo Interno": deve ser bloqueado com mensagem de erro clara.
2. Cadastre uma forma com `tipo` em minúsculas (ex.: "pix") e confirme, na listagem, que foi salva como "PIX" (maiúsculas).
3. Rode `npm run saneamento:forma-dinheiro` no ambiente desejado (dev/homologação, mediante autorização) e confirme no console que apenas a forma "Dinheiro" é avaliada e corrigida quando necessário.
4. Rode o comando novamente e confirme a mensagem "Nenhuma correção necessária" (idempotência).
5. Abra um caixa, registre uma entrada e uma saída vinculadas à forma "Dinheiro" e confirme, em `/caixa`, que o "Saldo Físico" responde corretamente às duas movimentações.
6. Revise manualmente, em `/formas-pagamento`, se existe alguma forma de pagamento que representa dinheiro com nome diferente de "Dinheiro" (não coberta pelo saneamento automático) e corrija seu `tipo` manualmente se necessário.

---

## 11. Confirmação

**Nenhum commit e nenhum push foram realizados.** Ao final desta tarefa, o `git status` mostra 8 arquivos modificados/novos referentes exclusivamente à Fatia 13.2.1, mais os 4 já pendentes da Fatia 13.3 (3 modificados + 1 relatório), sem qualquer sobreposição. Quando autorizado, recomenda-se commitar cada fatia separadamente, com `git add` explícito por caminho:

```
# Fatia 13.2.1
git add src/lib/formas-pagamento-schema.ts src/lib/formas-pagamento.ts \
  src/app/formas-pagamento/formas-pagamento-form.tsx \
  scripts/saneamento-forma-pagamento-dinheiro.ts package.json \
  src/lib/formas-pagamento-schema.test.ts src/lib/formas-pagamento.test.ts \
  src/lib/caixa.test.ts \
  docs/02-fases/fase-13-fechamento-caixa/FATIA_13_2_1_CORRECAO_TIPO_FORMA_PAGAMENTO_CAIXA.md

# Fatia 13.3 (separadamente, quando decidido)
git add src/app/caixa/caixa-client.tsx src/app/caixa/[id]/caixa-detalhe-client.tsx \
  src/app/caixa/historico/historico-client.tsx \
  docs/02-fases/fase-13-fechamento-caixa/FATIA_13_3_CONFERENCIA_OPERACIONAL_POR_FORMA.md
```
