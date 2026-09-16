import { prisma } from "@/lib/prisma";
import { paginarConsulta, type PaginacaoNormalizada } from "@/lib/paginacao";

function montarWhereInsumos(estoqueBaixo?: boolean) {
  return estoqueBaixo
    ? { quantidadeEstoque: { lte: prisma.insumo.fields.estoqueMinimo } }
    : undefined;
}

export async function listarInsumos(estoqueBaixo?: boolean) {
  return prisma.insumo.findMany({
    where: montarWhereInsumos(estoqueBaixo),
    orderBy: {
      nome: "asc",
    },
  });
}

/**
 * Listagem paginada server-side da tela de Insumos. O filtro de estoque
 * baixo (alerta) é aplicado igualmente no `count` e no `findMany`.
 */
export async function listarInsumosPaginado(params: {
  estoqueBaixo?: boolean;
  paginacao: PaginacaoNormalizada;
}) {
  const where = montarWhereInsumos(params.estoqueBaixo);

  return paginarConsulta({
    paginacao: params.paginacao,
    contar: () => prisma.insumo.count({ where }),
    buscar: ({ skip, take }) =>
      prisma.insumo.findMany({
        where,
        orderBy: [{ nome: "asc" }, { id: "asc" }],
        skip,
        take,
      }),
  });
}
