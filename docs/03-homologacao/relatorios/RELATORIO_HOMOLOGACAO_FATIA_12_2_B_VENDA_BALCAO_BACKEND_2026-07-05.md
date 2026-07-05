# Relatório de Homologação Técnica — Fatia 12.2B: Venda de Balcão (Base Técnica Backend)

## 1. Resumo executivo

Segunda fatia da Fase 12: implementação da **base técnica de backend** da venda
de balcão de **produtos físicos**. Foram criados os modelos `Venda`,
`ItemVenda` e `MovimentacaoEstoqueProduto`, o campo `Produto.quantidadeEstoque`,
o campo `MovimentacaoCaixa.vendaId`, o serviço de baixa de estoque de produto
(com trava atômica contra estoque negativo), o serviço transacional de venda
(preço e total calculados no backend) e a validação Zod correspondente. O
`DELETE` de produto passou a bloquear exclusão de produto com histórico de
venda (409). **Não há API pública nem tela nesta fatia** — a venda é acionável
apenas pelo serviço `registrarVendaBalcao`, coberto por testes de integração
com banco real. Migration **aditiva**, sem alteração destrutiva. Lint, **214
testes** (17 novos) e build aprovados. **Nenhuma alteração em `Pagamento`,
`OrdemServico`, cálculo financeiro de OS, `Insumo`, `MovimentacaoEstoqueInsumo`,
`caixa.ts`, relatórios ou dashboard.**

### Confirmações explícitas exigidas

- ✅ **A venda é transacional** — tudo roda em uma única `prisma.$transaction`;
  qualquer falha reverte tudo (rollback total), sem venda parcialmente
  persistida.
- ✅ **Preço e total são calculados no backend** — `precoUnitario` vem de
  `Produto.precoVenda` (o payload não é fonte confiável e o campo é descartado
  pelo schema); `precoTotal` por item e `valorTotal` da venda são somados no
  serviço.
- ✅ **Baixa de estoque usa `updateMany` condicional atômico** — `where` exige
  produto ativo e `quantidadeEstoque >= quantidade`, com `decrement`; se
  `count !== 1`, lança erro 409. Não usa `findUnique + update`.
- ✅ **Estoque negativo é bloqueado** — pela condição `quantidadeEstoque >=
  quantidade` na atualização atômica; nenhuma venda derruba o saldo abaixo de
  zero, mesmo sob concorrência.
- ✅ **Movimentação de caixa usa origem `VENDA_BALCAO`** — entrada criada com
  `tipo = "ENTRADA"`, `origem = "VENDA_BALCAO"` e `vendaId` vinculado.
- ✅ **`Pagamento` e `OrdemServico` não foram alterados** — nem o schema, nem os
  serviços, nem o cálculo financeiro de OS.
- ✅ **Não há API pública nem tela nesta fatia** — apenas serviços de backend e
  testes.

## 2. Ambiente

- **Projeto:** UPA do Tênis - Sapataria Alves
- **Data da homologação:** 05/07/2026
- **Responsável pela execução:** Claude Code (agente), a pedido de Bruno M Noronha
- **Runtime:** Next.js 14.2.35, Node/TypeScript, Prisma 5.22.0
- **Banco de desenvolvimento:** PostgreSQL `upa_do_tenis_dev` (container Docker `upa-postgres`, `postgres:16`)
- **Banco de testes:** `upa_do_tenis_test` via `.env.test` (carregado pelo `vitest.config.ts`) — separado do banco de dev; migration nova aplicada com `prisma migrate deploy` antes da suíte
- **Método:** validação por testes automatizados (unitários de schema + integração com banco real + mock de rota) e `lint`/`build`. Fatia de backend, sem homologação de navegador (sem tela).

## 3. Branch e commit base

- **Branch:** `main`
- **Commit base:** `75dda7f` — "feat(produtos): adicionar base de produtos da fatia 12.1"
- **Árvore no início:** limpa
- **Baseline no início:** lint ✅, 197 testes ✅

## 4. Escopo validado

1. Schema de venda de balcão de produtos (3 modelos novos + 2 campos + relações reversas).
2. Migration aditiva aplicada em dev e teste.
3. Serviço de baixa de estoque de produto, transacional e atômico.
4. Serviço transacional de venda, com cálculo de preço/total no backend.
5. Validação Zod (forma de pagamento obrigatória, itens obrigatórios, quantidade positiva, produto não duplicado, preço não confiado ao frontend).
6. Guard de `DELETE` de produto (409 com histórico de venda).
7. Testes automatizados cobrindo os cenários críticos.
8. Documentação técnica da fatia.

## 5. Escopo excluído (fatias futuras)

- API pública (`POST /api/vendas`) e tela de atendimento de balcão → **12.2C**.
- Relatórios/dashboard separando receita por origem (OS vs Balcão) → **12.2D**.
- Entrada/ajuste manual de estoque de produto (o estoque começa em 0 e só decrementa por venda) → fatia posterior ou 12.2C conforme priorização.
- Serviço avulso sem OS (depende de atributos ainda inexistentes em `Servico`).
- Venda vinculada à OS.

## 6. Arquivos alterados

| Arquivo | Tipo | Descrição |
|---|---|---|
| `prisma/schema.prisma` | modificado | 3 modelos novos + `Produto.quantidadeEstoque` + `MovimentacaoCaixa.vendaId` + relações reversas |
| `prisma/migrations/20260705140627_create_venda_balcao/` | novo | Migration aditiva |
| `src/lib/movimentacao-estoque-produto-service.ts` | novo | Baixa de estoque de produto (atômica) |
| `src/lib/vendas-schema.ts` | novo | Validação Zod da venda |
| `src/lib/vendas.ts` | novo | Serviço transacional `registrarVendaBalcao` |
| `src/app/api/produtos/[id]/route.ts` | modificado | Guard `DELETE` 409 com histórico de venda |
| `src/lib/vendas-schema.test.ts` | novo | 7 testes de validação |
| `src/lib/vendas.test.ts` | novo | 7 testes de integração (banco real) |
| `src/app/api/produtos/[id]/produtos-delete.test.ts` | novo | 3 testes do guard DELETE |
| `docs/02-fases/.../FATIA_12_2_B_VENDA_BALCAO_BACKEND.md` | novo | Documentação técnica da fatia |

## 7. Migration criada

`20260705140627_create_venda_balcao` — **100% aditiva**: apenas `ADD COLUMN`
(em `Produto` e `MovimentacaoCaixa`) e `CREATE TABLE` (`Venda`, `ItemVenda`,
`MovimentacaoEstoqueProduto`) com seus índices e foreign keys. Nenhuma alteração
destrutiva em tabela existente. Aplicada em `upa_do_tenis_dev` e
`upa_do_tenis_test`.

## 8. Modelos / campos adicionados

- **`Venda`** — `id`, `numero` (único, `VD-DDMMAAAA-XXXX`), `clienteId?`,
  `status` (default `CONCLUIDA`), `valorTotal`, `valorDesconto`,
  `formaPagamentoId`, `dataVenda`, `observacoes?`, `criadoEm`, `atualizadoEm`.
- **`ItemVenda`** — `vendaId` (Cascade), `produtoId` (Restrict), `descricao`,
  `quantidade`, `precoUnitario`, `precoTotal`, `criadoEm`.
- **`MovimentacaoEstoqueProduto`** — `produtoId` (Restrict), `tipo`,
  `quantidade`, `saldoAnterior`, `saldoPosterior`, `origem`, `vendaId?`
  (SetNull), `itemVendaId?`, `observacao?`, `motivo?`, `criadoEm`.
- **`Produto.quantidadeEstoque`** `Decimal @default(0)`.
- **`MovimentacaoCaixa.vendaId`** `String?` + relação opcional com `Venda`
  (SetNull).
- Relações reversas: `Cliente.vendas`, `FormaPagamento.vendas`,
  `Produto.itensVenda`, `Produto.movimentacoes`.

## 9. Serviços criados

- **`src/lib/movimentacao-estoque-produto-service.ts`** — `baixarEstoqueProdutoVenda(params, tx)`:
  baixa atômica via `updateMany` condicional; registra saldo anterior/posterior,
  `origem = "VENDA_BALCAO"`, `vendaId`/`itemVendaId`; enums locais
  `TipoMovimentacaoProduto`/`OrigemMovimentacaoProduto`; erro próprio
  `MovimentacaoEstoqueProdutoError`.
- **`src/lib/vendas-schema.ts`** — `registrarVendaBalcaoSchema`: forma de
  pagamento obrigatória, cliente/observações opcionais, itens obrigatórios
  (mín. 1), quantidade positiva, produto não duplicado, `precoUnitario`
  descartado.
- **`src/lib/vendas.ts`** — `registrarVendaBalcao(payload)`: transação única
  (caixa aberto → validações → cálculo backend → `Venda` + `ItemVenda[]` →
  baixa de estoque → `MovimentacaoCaixa` origem `VENDA_BALCAO`). Contrato de
  erro único `VendaBalcaoError` (traduz a falha de estoque preservando
  status/mensagem).

### Decisão arquitetural relevante

A entrada de caixa é criada **diretamente na transação de venda** via
`tx.movimentacaoCaixa.create`, e **não** reutilizando
`registrarMovimentacaoAutomaticaCaixa`. Motivo: essa função é compartilhada com
o fluxo homologado de pagamento de OS; alterá-la ampliaria o blast radius numa
área crítica. A criação direta mantém `src/lib/caixa.ts` **100% intocado**.

## 10. Cenários de teste executados — ✅ TODOS APROVADOS (17 novos)

### Validação de schema (`vendas-schema.test.ts`, 7)

| # | Cenário | Resultado |
|---|---|---|
| 1 | Venda válida com um item | ✅ aceita |
| 2 | Cliente e observações opcionais | ✅ aceita |
| 3 | Venda sem forma de pagamento | ✅ rejeitada |
| 4 | Venda sem itens | ✅ rejeitada |
| 5 | Quantidade zero ou negativa | ✅ rejeitada |
| 6 | Produto duplicado no payload | ✅ rejeitada com mensagem clara |
| 7 | `precoUnitario` no payload | ✅ descartado (não confiado ao frontend) |

### Integração com banco real (`vendas.test.ts`, 7)

| # | Cenário | Resultado |
|---|---|---|
| 8 | Estoque suficiente | ✅ cria Venda, ItemVenda, baixa estoque (10→8), MovimentacaoCaixa origem `VENDA_BALCAO`, **não cria Pagamento** |
| 9 | Total no backend com múltiplos itens | ✅ `valorTotal` = soma de `precoVenda × qtd` (31,80 + 30,00 = 61,80) |
| 10 | Sem caixa aberto | ✅ rejeitada, nada persistido, estoque inalterado |
| 11 | Estoque insuficiente | ✅ rejeitada (409), nada persistido, estoque inalterado |
| 12 | Múltiplos itens, um insuficiente | ✅ **atomicidade**: item ok não é baixado, tudo revertido |
| 13 | Produto inativo | ✅ rejeitada, nada persistido |
| 14 | Forma de pagamento inexistente | ✅ rejeitada, nada persistido |

### Guard DELETE de produto (`produtos-delete.test.ts`, 3)

| # | Cenário | Resultado |
|---|---|---|
| 15 | Produto com venda vinculada | ✅ 409, `delete` não chamado |
| 16 | Produto sem histórico | ✅ 204, `delete` chamado |
| 17 | Produto inexistente | ✅ 404 |

### Observação de execução (não mascarada)

Na primeira execução, os cenários 11 e 12 falharam por **tipo de erro**: a falha
de estoque insuficiente vinha como `MovimentacaoEstoqueProdutoError` em vez de
`VendaBalcaoError`. O comportamento já estava correto (nada persistido); faltava
o serviço de venda traduzir o erro para ser o contrato único da futura API.
Corrigido (translação de erro preservando status/mensagem) e reexecutado — todos
verdes.

## 11. Comandos executados e resultados

| Comando | Resultado |
|---|---|
| `git status` / `git diff --stat` | Base limpa (`75dda7f`); ao final: 2 modificados, 8 novos |
| `git diff -- prisma/schema.prisma` | ✔ Somente escopo autorizado (revisado linha a linha) |
| `npx prisma migrate dev --name create_venda_balcao` | ✔ Migration criada e aplicada no dev |
| `npx prisma migrate deploy` (DATABASE_URL do `.env.test`) | ✔ Banco de teste sincronizado |
| `npm run lint` | ✔ Sem erros ou warnings |
| `npm run test` | ✔ 25 arquivos, **214 testes** aprovados (197 anteriores + 17 novos) |
| `npm run build` | ✔ Compiled successfully, 28 rotas |

## 12. Confirmação de não-alteração em áreas críticas

Diff do schema revisado linha a linha. **Intocados:** `Pagamento` (incl.
`ordemServicoId`), `OrdemServico`, `ordens-servico-financeiro.ts` (cálculo
financeiro de OS), `ordens-servico-pagamentos.ts`, `Insumo`,
`MovimentacaoEstoqueInsumo`, `movimentacao-estoque-service.ts`, `caixa.ts`,
relatórios (`relatorio-financeiro-os-service.ts`, `relatorio-estoque-service.ts`)
e dashboard (`dashboard-service.ts`). Nenhuma dependência instalada. Nenhuma API
pública nem tela criada.

## 13. Riscos remanescentes

- **Lacuna de visibilidade conhecida:** a receita de venda entra no caixa
  (somada por `calcularTotaisCaixa`) mas **ainda não aparece** no dashboard
  ("Total Recebido" só lê `Pagamento`) nem no relatório financeiro-OS. Fecha na
  12.2D. Deve ser comunicado como limitação temporária.
- **Estoque de produto começa em 0** e só decrementa por venda; sem entrada
  manual ainda, uma venda real depende de popular estoque antes (fatia
  posterior ou 12.2C).
- **Numeração diária** usa `count + 1` com índice único como guarda: sob
  concorrência rara, uma colisão aborta a venda inteira (rollback), nunca
  persiste parcial — seguro para balcão single-operator; alto volume exigiria
  retry.
- **Exclusão de produto:** agora bloqueada (409) com histórico de venda;
  inativação é o caminho recomendado.

## 14. Pendências para 12.2C / 12.2D

- **12.2C** — API pública `POST /api/vendas` (validação Zod já pronta) + tela de
  atendimento de balcão; avaliar entrada manual de estoque de produto.
- **12.2D** — dashboard e relatórios passam a ler `MovimentacaoCaixa.origem`
  para separar receita OS vs Balcão, fechando a lacuna de visibilidade.
- **12.2E** — homologação final da Fase 12.

## 15. Roteiro de re-homologação técnica

Como não há tela nesta fatia, a re-homologação é por testes e inspeção opcional:

1. `npm run test` — conferir os 17 novos testes verdes (25 arquivos, 214 total).
2. (Opcional) Prisma Studio no banco dev: criar forma de pagamento, abrir caixa,
   criar produto com `quantidadeEstoque` > 0, chamar `registrarVendaBalcao` por
   script e conferir: `Venda` criada, `ItemVenda` com preço do backend,
   `quantidadeEstoque` decrementado, `MovimentacaoEstoqueProduto` com saldo
   anterior/posterior, `MovimentacaoCaixa` com `origem = "VENDA_BALCAO"` e
   `vendaId`, e **nenhum `Pagamento` novo**.
3. Conferir que venda sem caixa aberto e venda com estoque insuficiente não
   persistem nada.
4. Conferir que OS, pagamentos e relatórios financeiros de OS permanecem sem
   alteração de comportamento.

## 16. Veredito

```markdown
# Veredito — Fatia 12.2B: Venda de Balcão (Base Técnica Backend)

[x] Aprovado
[ ] Aprovado com ressalvas
[ ] Reprovado

Observações:
- Venda transacional e atômica; rollback total validado por teste de multi-item.
- Preço e total calculados no backend a partir de Produto.precoVenda.
- Baixa de estoque por updateMany condicional atômico; estoque negativo bloqueado.
- Movimentação de caixa com origem VENDA_BALCAO e vínculo à venda.
- Pagamento, OrdemServico, cálculo financeiro de OS, Insumo, caixa.ts,
  relatórios e dashboard intocados.
- Migration aditiva e limitada ao escopo autorizado.
- Sem API pública e sem tela nesta fatia (backend puro).
- Lint, 214 testes e build aprovados.
```

## Recomendação

Fatia apta para commit (`feat(vendas): base tecnica de venda de balcao (fatia
12.2B)`). Push é decisão do responsável pelo projeto. Próxima etapa: Fatia 12.2C
— API pública e tela de atendimento de balcão.
