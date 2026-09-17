import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

export interface DevolverEstoqueProdutoVendaParams {
  produtoId: string;
  quantidade: number;
  vendaId: string;
  itemVendaId: string;
  motivo: string;
}

/**
 * Devolve ao estoque a quantidade de um item de venda cancelada
 * (`ESTORNO_VENDA`, entrada). Incremento atômico, com os saldos lidos da
 * própria atualização. Vale também para produto inativado depois da venda:
 * o que saiu fisicamente precisa voltar ao saldo.
 *
 * Deve ser chamada dentro da transação do cancelamento.
 */
export async function devolverEstoqueProdutoVenda(
  params: DevolverEstoqueProdutoVendaParams,
  tx: Prisma.TransactionClient,
) {
  if (params.quantidade <= 0) {
    throw new MovimentacaoEstoqueProdutoError(
      "A quantidade da devolução deve ser maior que zero.",
      400,
    );
  }

  const produto = await tx.produto.update({
    where: { id: params.produtoId },
    data: { quantidadeEstoque: { increment: params.quantidade } },
    select: { quantidadeEstoque: true },
  });

  const saldoPosterior = Number(produto.quantidadeEstoque);

  return tx.movimentacaoEstoqueProduto.create({
    data: {
      produtoId: params.produtoId,
      tipo: TipoMovimentacaoProduto.ESTORNO_VENDA,
      quantidade: params.quantidade,
      saldoAnterior: saldoPosterior - params.quantidade,
      saldoPosterior,
      origem: OrigemMovimentacaoProduto.VENDA_BALCAO,
      vendaId: params.vendaId,
      itemVendaId: params.itemVendaId,
      motivo: params.motivo,
    },
  });
}

export interface CriarProdutoComEstoqueParams {
  nome: string;
  descricao?: string | null;
  precoVenda: number;
  quantidadeInicial?: number;
}

/**
 * Criação de produto com registro de estoque inicial rastreável (Issue #5).
 *
 * Se quantidadeInicial for positiva:
 * - O produto é persistido com quantidadeEstoque = quantidadeInicial.
 * - É criada a movimentação ENTRADA_MANUAL com saldoAnterior = 0 e saldoPosterior = quantidadeInicial.
 *
 * Se quantidadeInicial for 0 ou omitida:
 * - O produto é persistido com quantidadeEstoque = 0.
 * - Nenhuma movimentação artificial é criada.
 *
 * Toda a operação é executada na mesma transação para garantir atomicidade.
 */
export async function criarProdutoComEstoqueInicial(
  params: CriarProdutoComEstoqueParams,
  txClient?: Prisma.TransactionClient,
) {
  const executar = async (tx: Prisma.TransactionClient) => {
    const qtdInicial = params.quantidadeInicial ?? 0;

    if (qtdInicial < 0) {
      throw new MovimentacaoEstoqueProdutoError(
        "A quantidade inicial não pode ser negativa.",
        400,
      );
    }

    if (!Number.isInteger(qtdInicial)) {
      throw new MovimentacaoEstoqueProdutoError(
        "A quantidade inicial deve ser um número inteiro.",
        400,
      );
    }

    const produto = await tx.produto.create({
      data: {
        nome: params.nome,
        descricao: params.descricao,
        precoVenda: params.precoVenda,
        quantidadeEstoque: qtdInicial,
        ativo: true,
      },
    });

    if (qtdInicial > 0) {
      await tx.movimentacaoEstoqueProduto.create({
        data: {
          produtoId: produto.id,
          tipo: TipoMovimentacaoProduto.ENTRADA_MANUAL,
          quantidade: qtdInicial,
          saldoAnterior: 0,
          saldoPosterior: qtdInicial,
          origem: OrigemMovimentacaoProduto.MANUAL,
          observacao: "Estoque inicial no cadastro do produto",
        },
      });
    }

    return produto;
  };

  if (txClient) {
    return executar(txClient);
  }

  return prisma.$transaction(async (tx) => executar(tx));
}

/**
 * Lista o produto e todas as suas movimentações de estoque em ordem cronológica reversa.
 */
export async function listarMovimentacoesProduto(produtoId: string) {
  const produto = await prisma.produto.findUnique({
    where: { id: produtoId },
  });

  if (!produto) {
    throw new MovimentacaoEstoqueProdutoError("Produto não encontrado.", 404);
  }

  const movimentacoes = await prisma.movimentacaoEstoqueProduto.findMany({
    where: { produtoId },
    orderBy: { criadoEm: "desc" },
    include: {
      venda: {
        select: { numero: true },
      },
    },
  });

  return {
    produto: {
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao,
      precoVenda: Number(produto.precoVenda),
      quantidadeEstoque: Number(produto.quantidadeEstoque),
      ativo: produto.ativo,
      criadoEm: produto.criadoEm ? new Date(produto.criadoEm).toISOString() : new Date().toISOString(),
      atualizadoEm: produto.atualizadoEm ? new Date(produto.atualizadoEm).toISOString() : new Date().toISOString(),
    },
    movimentacoes: movimentacoes.map((m) => ({
      id: m.id,
      produtoId: m.produtoId,
      tipo: m.tipo,
      quantidade: Number(m.quantidade),
      saldoAnterior: Number(m.saldoAnterior),
      saldoPosterior: Number(m.saldoPosterior),
      origem: m.origem,
      vendaId: m.vendaId,
      itemVendaId: m.itemVendaId,
      observacao: m.observacao,
      motivo: m.motivo,
      venda: m.venda,
      criadoEm: m.criadoEm ? new Date(m.criadoEm).toISOString() : new Date().toISOString(),
    })),
  };
}
