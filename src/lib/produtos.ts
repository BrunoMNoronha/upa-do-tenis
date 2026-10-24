import { prisma } from "@/lib/prisma";
import { paginarConsulta, type PaginacaoNormalizada } from "@/lib/paginacao";
import { combinarCondicoes, montarCondicaoBusca } from "@/lib/busca-listagem";
import { somarValorEstoque } from "@/lib/valor-estoque";

/** Produtos sem unidade em estoque (bloqueados na venda de balcão). */
const SEM_ESTOQUE = { quantidadeEstoque: { lte: 0 } };

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
export async function listarProdutosPaginado(params: {
  busca?: string;
  /** Chips da tela: `true` só ativos, `false` só inativos, indefinido todos. */
  ativo?: boolean;
  /** `sem`: apenas produtos sem estoque. */
  estoque?: "sem";
  paginacao: PaginacaoNormalizada;
}) {
  // Busca, status e estoque aplicados no mesmo where de count e findMany.
  const where =
    combinarCondicoes(
      montarCondicaoBusca(params.busca, ["nome", "descricao"]),
      params.ativo === undefined ? undefined : { ativo: params.ativo },
      params.estoque === "sem" ? SEM_ESTOQUE : undefined,
    ) ?? {};

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

export type EstatisticasProdutos = {
  total: number;
  ativos: number;
  /** Ativos sem unidade em estoque (bloqueados na venda). */
  semEstoque: number;
  /** Soma de preço de venda × quantidade dos produtos ativos. */
  valorEstoqueVenda: number;
};

/**
 * Contadores da tela de Produtos (somente leitura; independem de busca e
 * página). O valor em estoque é calculado em memória porque o Prisma não
 * multiplica colunas em `aggregate`; o catálogo da sapataria é pequeno.
 */
export async function contarEstatisticasProdutos(): Promise<EstatisticasProdutos> {
  const [total, ativos, semEstoque, emEstoque] = await Promise.all([
    prisma.produto.count(),
    prisma.produto.count({ where: { ativo: true } }),
    prisma.produto.count({ where: { ativo: true, ...SEM_ESTOQUE } }),
    prisma.produto.findMany({ where: { ativo: true }, select: { precoVenda: true, quantidadeEstoque: true } }),
  ]);

  return {
    total,
    ativos,
    semEstoque,
    valorEstoqueVenda: somarValorEstoque(emEstoque.map((p) => ({ preco: p.precoVenda, quantidade: p.quantidadeEstoque }))),
  };
}
