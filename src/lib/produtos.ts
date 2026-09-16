import { prisma } from "@/lib/prisma";
import { paginarConsulta, type PaginacaoNormalizada } from "@/lib/paginacao";

export async function listarProdutos() {
  return prisma.produto.findMany({
    orderBy: {
      nome: "asc",
    },
  });
}

/**
 * Listagem paginada server-side da tela de Produtos. `listarProdutos()`
 * continua disponível para telas que precisam do catálogo inteiro
 * (venda de balcão).
 */
export async function listarProdutosPaginado(params: { paginacao: PaginacaoNormalizada }) {
  const where = {};

  return paginarConsulta({
    paginacao: params.paginacao,
    contar: () => prisma.produto.count({ where }),
    buscar: ({ skip, take }) =>
      prisma.produto.findMany({
        where,
        orderBy: [{ nome: "asc" }, { id: "asc" }],
        skip,
        take,
      }),
  });
}
