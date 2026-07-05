# Fase 12 — Fatia 12.1: Base de Produtos

## Objetivo

Criar a entidade `Produto` separada de `Insumo`, com CRUD básico (cadastro,
listagem, edição, ativação/inativação e exclusão), validação frontend e
backend, API e tela — sem qualquer integração com venda, OS, caixa ou
estoque nesta fatia.

## Decisões aplicadas

- `Produto` é entidade própria, separada de `Insumo` (preço de venda ≠ custo
  de insumo; produto é exposto ao cliente).
- Valores monetários seguem o padrão do projeto: `Decimal` no banco e
  `sanitizeCurrency` na validação.
- Nomenclatura de datas segue o padrão do projeto: `criadoEm` /
  `atualizadoEm`.
- Exclusão é física nesta fatia porque `Produto` ainda não possui vínculos.
  Quando `Venda`/`ItemVenda` existirem (fatias futuras), a exclusão deverá
  passar a bloquear produtos com vendas vinculadas (padrão 409 usado em
  serviços/insumos/clientes) — registrado como pendência da fatia de vendas.
- Inativação (`ativo = false`) é o caminho recomendado para tirar um produto
  de circulação preservando histórico.

## Escopo excluído (fatias futuras)

- `Venda` / `ItemVenda` / Atendimento de Balcão.
- Baixa de estoque de produto.
- Pagamento de balcão e movimentação de caixa.
- Venda vinculada à OS.
- Controle de quantidade em estoque de produto.

## Alterações

### Schema / Migration

- `prisma/schema.prisma`: novo modelo `Produto` (`id`, `nome`, `descricao?`,
  `precoVenda Decimal`, `ativo`, `criadoEm`, `atualizadoEm`; índices em
  `nome` e `ativo`). Nenhum outro modelo alterado.
- Migration: `prisma/migrations/20260705124947_create_produto/` (aditiva —
  apenas `CREATE TABLE`). Aplicada em `upa_do_tenis_dev` e
  `upa_do_tenis_test`.

### Backend

- `src/lib/produtos-schema.ts`: `produtoFormSchema` (criação) e
  `produtoAtualizarSchema` (edição parcial + `ativo`).
- `src/lib/produtos.ts`: `listarProdutos()`.
- `src/app/api/produtos/route.ts`: `POST` (criação).
- `src/app/api/produtos/[id]/route.ts`: `PATCH` (edição/ativação) e
  `DELETE` (exclusão, 404 para produto inexistente).

### Frontend

- `src/app/produtos/page.tsx`: página server com listagem.
- `src/app/produtos/produtos-client.tsx`: formulário criar/editar com máscara
  monetária, inativar/reativar, excluir com confirmação, loading, erro e
  estado vazio.
- `src/config/navigation.tsx`: item "Produtos" no grupo Operação.

### Testes

- `src/lib/produtos-schema.test.ts`: validação e sanitização monetária
  (máscara BRL, vazio → 0, negativo rejeitado, atualização parcial).

## Roteiro de homologação manual

1. Acessar `/produtos` pelo menu Operação → Produtos.
2. Cadastrar produto com nome e preço digitado com máscara (ex.: digitar
   "15990" e conferir "R$ 159,90").
3. Conferir o produto na lista com preço e badge "Ativo".
4. Editar o produto (nome, descrição e preço) e conferir a atualização.
5. Inativar e reativar o produto, conferindo a badge.
6. Excluir um produto e confirmar a remoção da lista.
7. Tentar cadastrar com nome de 1 caractere → erro de validação no campo.
8. Conferir que OS, caixa, insumos, relatórios e dashboard permanecem
   intocados (nenhuma tela ou cálculo alterado).

## Confirmação de não-alteração

Nenhuma mudança em: `Pagamento`, `OrdemServico`, `Caixa`,
`MovimentacaoCaixa`, `Insumo`, `MovimentacaoEstoqueInsumo`, relatórios,
dashboard, cálculos financeiros ou sanitizadores/formatadores existentes.
