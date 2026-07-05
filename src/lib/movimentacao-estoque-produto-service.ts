import { Prisma } from "@prisma/client";

export enum TipoMovimentacaoProduto {
  VENDA = "VENDA",
  ESTORNO_VENDA = "ESTORNO_VENDA",
  ENTRADA_MANUAL = "ENTRADA_MANUAL",
  SAIDA_MANUAL = "SAIDA_MANUAL",
  AJUSTE = "AJUSTE",
}

export enum OrigemMovimentacaoProduto {
  VENDA_BALCAO = "VENDA_BALCAO",
  MANUAL = "MANUAL",
  AJUSTE_ESTOQUE = "AJUSTE_ESTOQUE",
}

export class MovimentacaoEstoqueProdutoError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "MovimentacaoEstoqueProdutoError";
    this.status = status;
  }
}

export interface BaixarEstoqueProdutoParams {
  produtoId: string;
  quantidade: number;
  vendaId?: string;
  itemVendaId?: string;
  observacao?: string;
}

/**
 * Baixa de estoque de produto vinculada a uma venda de balcão.
 *
 * A subtração do saldo é feita por atualização condicional atômica
 * (`updateMany` com `where` exigindo produto ativo e saldo suficiente +
 * `decrement`). Só assim duas vendas concorrentes do mesmo produto não
 * conseguem, cada uma, ler o mesmo saldo e derrubá-lo abaixo de zero:
 * quem perde a corrida recebe `count === 0` e falha. Não usar
 * `findUnique` + `update`, que abre janela de corrida.
 *
 * Deve ser chamada dentro de uma transação (`tx`), junto da criação da
 * venda e da movimentação de caixa, para garantir rollback total.
 */
export async function baixarEstoqueProdutoVenda(
  params: BaixarEstoqueProdutoParams,
  tx: Prisma.TransactionClient,
) {
  if (params.quantidade <= 0) {
    throw new MovimentacaoEstoqueProdutoError(
      "A quantidade da baixa deve ser maior que zero.",
      400,
    );
  }

  const produto = await tx.produto.findUnique({
    where: { id: params.produtoId },
    select: { id: true, ativo: true, quantidadeEstoque: true },
  });

  if (!produto) {
    throw new MovimentacaoEstoqueProdutoError("Produto não encontrado.", 404);
  }

  if (!produto.ativo) {
    throw new MovimentacaoEstoqueProdutoError(
      "Produto inativo não pode ser vendido.",
      400,
    );
  }

  const saldoAnterior = Number(produto.quantidadeEstoque);

  const atualizacao = await tx.produto.updateMany({
    where: {
      id: params.produtoId,
      ativo: true,
      quantidadeEstoque: { gte: params.quantidade },
    },
    data: {
      quantidadeEstoque: { decrement: params.quantidade },
    },
  });

  if (atualizacao.count !== 1) {
    throw new MovimentacaoEstoqueProdutoError(
      "Estoque insuficiente para a venda.",
      409,
    );
  }

  const saldoPosterior = saldoAnterior - params.quantidade;

  const movimentacao = await tx.movimentacaoEstoqueProduto.create({
    data: {
      produtoId: params.produtoId,
      tipo: TipoMovimentacaoProduto.VENDA,
      quantidade: params.quantidade,
      saldoAnterior,
      saldoPosterior,
      origem: OrigemMovimentacaoProduto.VENDA_BALCAO,
      vendaId: params.vendaId,
      itemVendaId: params.itemVendaId,
      observacao: params.observacao,
    },
  });

  return movimentacao;
}
