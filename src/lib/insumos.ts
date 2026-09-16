import { prisma } from "@/lib/prisma";
import { paginarConsulta, type PaginacaoNormalizada } from "@/lib/paginacao";
import { montarCondicaoBusca } from "@/lib/busca-listagem";

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
  busca?: string;
  paginacao: PaginacaoNormalizada;
}) {
  // Alerta e busca se combinam (AND); ambos entram igualmente no count e no findMany.
  const whereAlerta = montarWhereInsumos(params.estoqueBaixo);
  const whereBusca = montarCondicaoBusca(params.busca, ["nome", "descricao", "unidadeMedida"]);
  const where =
    whereAlerta && whereBusca ? { AND: [whereAlerta, whereBusca] } : (whereAlerta ?? whereBusca);

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
