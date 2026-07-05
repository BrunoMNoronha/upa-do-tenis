# Fase 12 — Fatia 12.2B: Venda de Balcão (Base Técnica Backend)

## Objetivo

Implementar a base técnica de backend da venda de balcão de **produtos
físicos**: schema, migration, serviço de movimentação de estoque de produto,
serviço transacional de venda, validações e testes automatizados. **Sem API
pública e sem tela** (ficam para a Fatia 12.2C). Relatórios e dashboard por
origem de receita ficam para a Fatia 12.2D.

## Decisão funcional

A venda de balcão desta fatia vende **somente `Produto`**. Serviço avulso sem
OS está fora do escopo (depende de atributos ainda inexistentes em `Servico`,
como `requerOS`/`consomeEstoque`, e será tratado em fatia própria).

## Schema criado (migration `20260705140627_create_venda_balcao`)

Migration **aditiva** — apenas `ADD COLUMN` e `CREATE TABLE`, nenhuma alteração
destrutiva em tabelas existentes. Aplicada em `upa_do_tenis_dev` e
`upa_do_tenis_test`.

### Novos modelos

- **`Venda`** — cabeçalho da venda: `id`, `numero` (único, `VD-DDMMAAAA-XXXX`),
  `clienteId?`, `status` (default `CONCLUIDA`), `valorTotal`, `valorDesconto`,
  `formaPagamentoId`, `dataVenda`, `observacoes?`, `criadoEm`, `atualizadoEm`.
- **`ItemVenda`** — linha da venda: `vendaId`, `produtoId`, `descricao`,
  `quantidade`, `precoUnitario`, `precoTotal`. FK para `Venda` com `onDelete:
  Cascade`; FK para `Produto` com `onDelete: Restrict`.
- **`MovimentacaoEstoqueProduto`** — rastreabilidade de estoque de produto,
  espelhando `MovimentacaoEstoqueInsumo`: `produtoId`, `tipo`, `quantidade`,
  `saldoAnterior`, `saldoPosterior`, `origem`, `vendaId?`, `itemVendaId?`,
  `observacao?`, `motivo?`, `criadoEm`.

### Campos adicionados em modelos existentes (autorizados)

- **`Produto.quantidadeEstoque`** `Decimal @default(0)` — controle de estoque de
  produto (separado de `Insumo`).
- **`MovimentacaoCaixa.vendaId`** `String?` + relação opcional com `Venda`
  (`onDelete: SetNull`) — rastreabilidade da entrada de caixa de venda.
- Relações reversas exigidas pelo Prisma: `Cliente.vendas`,
  `FormaPagamento.vendas`, `Produto.itensVenda`, `Produto.movimentacoes`.

## Serviços criados

### `src/lib/movimentacao-estoque-produto-service.ts`

- `baixarEstoqueProdutoVenda(params, tx)` — baixa de estoque por venda, sempre
  dentro de uma transação.
- **Baixa atômica condicional:** usa `updateMany` com `where` exigindo produto
  ativo e `quantidadeEstoque >= quantidade`, com `decrement`. Se `count !== 1`,
  lança erro `409` (estoque insuficiente). **Não** usa `findUnique + update`,
  evitando janela de corrida entre duas vendas concorrentes do mesmo produto.
- Registra `saldoAnterior`/`saldoPosterior`, `origem = "VENDA_BALCAO"`, e vincula
  `vendaId`/`itemVendaId`.
- Enums locais `TipoMovimentacaoProduto` e `OrigemMovimentacaoProduto`
  (separados dos enums de insumo).

### `src/lib/vendas-schema.ts`

- `registrarVendaBalcaoSchema` (Zod): `formaPagamentoId` obrigatória,
  `clienteId?`, `observacoes?`, `itens` obrigatórios (mínimo 1), cada item com
  `produtoId` e `quantidade > 0`.
- **Proíbe produto duplicado** no mesmo payload (via `superRefine`).
- **Não aceita `precoUnitario` do frontend** — o campo é descartado; o preço é
  sempre recalculado no backend.

### `src/lib/vendas.ts`

- `registrarVendaBalcao(payload)` — orquestra tudo em **uma única
  `prisma.$transaction`**:
  1. valida caixa aberto (dentro da transação);
  2. valida forma de pagamento e cliente (se informado);
  3. carrega produtos e bloqueia inexistente/inativo;
  4. calcula `precoUnitario` a partir de `Produto.precoVenda`, `precoTotal` por
     item e `valorTotal` da venda — **tudo no backend**;
  5. gera número sequencial diário (índice único como garantia final);
  6. cria `Venda` + `ItemVenda[]`;
  7. baixa estoque de cada produto (atômico, bloqueia negativo);
  8. cria `MovimentacaoCaixa` de `ENTRADA` com `origem = "VENDA_BALCAO"` e
     `vendaId`.
- Qualquer falha reverte tudo (rollback total). É o **contrato de erro único**
  (`VendaBalcaoError`): traduz a falha de estoque preservando status/mensagem.

### Ajuste em `src/app/api/produtos/[id]/route.ts`

- `DELETE` passa a bloquear exclusão de produto com `ItemVenda` vinculado
  (retorna `409`, mesmo padrão de serviços/insumos/clientes). Inativação é o
  caminho recomendado para produto com histórico.

## Decisão arquitetural relevante

A entrada de caixa da venda é criada **diretamente na transação de venda** via
`tx.movimentacaoCaixa.create`, e **não** reutilizando
`registrarMovimentacaoAutomaticaCaixa`. Motivo: essa função é compartilhada com
o fluxo homologado de pagamento de OS; alterá-la (para aceitar `origem
"VENDA_BALCAO"` e `vendaId`) ampliaria o blast radius numa área crítica. A
criação direta mantém `src/lib/caixa.ts` **100% intocado**.

## Testes criados (17 novos, total 214)

- `src/lib/vendas-schema.test.ts` (7): venda válida, cliente/observações
  opcionais, sem forma de pagamento, sem itens, quantidade inválida, produto
  duplicado, `precoUnitario` descartado.
- `src/lib/vendas.test.ts` (7, integração com banco real): venda com estoque
  suficiente (cria Venda/ItemVenda/baixa estoque/MovimentacaoCaixa, não cria
  Pagamento), total no backend com múltiplos itens, sem caixa aberto,
  estoque insuficiente, atomicidade (um item entre vários estoura), produto
  inativo, forma de pagamento inexistente.
- `src/app/api/produtos/[id]/produtos-delete.test.ts` (3): DELETE 409 com venda
  vinculada, 204 sem histórico, 404 para inexistente.

## Confirmação de não-alteração

Intocados: `Pagamento` (inclusive `ordemServicoId`), `OrdemServico`, cálculo
financeiro de OS (`ordens-servico-financeiro.ts`), `Insumo`,
`MovimentacaoEstoqueInsumo`, `movimentacao-estoque-service.ts`, `caixa.ts`,
relatórios e dashboard.

## Limitações desta fatia (registradas)

- **Sem API pública e sem tela** — a venda só é acionável via serviço
  `registrarVendaBalcao` (Fatia 12.2C entrega API + tela).
- **Receita de venda ainda não aparece** no dashboard ("Total Recebido" só lê
  `Pagamento`) nem no relatório financeiro-OS. O dinheiro entra no caixa e é
  somado por `calcularTotaisCaixa`, mas a separação de receita por origem
  (OS vs Balcão) fica para a Fatia 12.2D.
- **Sem entrada/ajuste manual de estoque de produto** ainda — o estoque começa
  em 0 e só é decrementado por venda. Entrada de estoque de produto será tratada
  em fatia posterior (ou em 12.2C conforme priorização).

## Roteiro de homologação técnica (backend)

Como não há tela nesta fatia, a homologação é via testes automatizados e,
opcionalmente, script/Prisma Studio:

1. `npm run test` — conferir os 17 novos testes verdes.
2. (Opcional, manual) Em Prisma Studio no banco dev: criar forma de pagamento,
   abrir caixa, criar produto com `quantidadeEstoque` > 0, chamar o serviço via
   script e conferir: `Venda`, `ItemVenda`, `quantidadeEstoque` decrementado,
   `MovimentacaoEstoqueProduto` com saldo anterior/posterior, `MovimentacaoCaixa`
   com `origem = "VENDA_BALCAO"` e `vendaId` preenchido, nenhum `Pagamento` novo.
3. Conferir que tentativa de venda sem caixa aberto ou com estoque insuficiente
   não persiste nada.

## Próximas fatias

- **12.2C** — API pública `POST /api/vendas` + tela de atendimento de balcão.
- **12.2D** — relatórios/dashboard separando receita por origem
  (OS vs Balcão), lendo `MovimentacaoCaixa.origem`.
- **12.2E** — homologação final da Fase 12.
