import { prisma } from "@/lib/prisma";
import { paginarConsulta, type PaginacaoNormalizada } from "@/lib/paginacao";
import { combinarCondicoes, montarCondicaoBusca } from "@/lib/busca-listagem";
import { somarValorEstoque } from "@/lib/valor-estoque";

/** Insumos zerados (bloqueiam o consumo na OS). */
const ZERADOS = { quantidadeEstoque: { lte: 0 } };

/** Abaixo do mínimo cadastrado; inclui os zerados (mesma regra do alerta do dashboard). */
function whereAbaixoDoMinimo() {
  return { quantidadeEstoque: { lte: prisma.insumo.fields.estoqueMinimo } };
}

function montarWhereInsumos(estoqueBaixo?: boolean) {
  return estoqueBaixo ? whereAbaixoDoMinimo() : undefined;
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
  /** Legado (`?alerta=true`): equivale a `estoque: "baixo"`. */
  estoqueBaixo?: boolean;
  /** Chips da tela: `baixo` (abaixo do mínimo, inclui zerados) ou `zerado`. */
  estoque?: "baixo" | "zerado";
  /** `true` só ativos, `false` só inativos, indefinido todos. */
  ativo?: boolean;
  busca?: string;
  paginacao: PaginacaoNormalizada;
}) {
  // Estoque, status e busca se combinam (AND); todos entram igualmente no count e no findMany.
  const whereEstoque =
    params.estoque === "zerado" ? ZERADOS : montarWhereInsumos(params.estoqueBaixo || params.estoque === "baixo");
  const whereBusca = montarCondicaoBusca(params.busca, ["nome", "descricao", "unidadeMedida"]);
  const where = combinarCondicoes(
    whereEstoque,
    whereBusca,
    params.ativo === undefined ? undefined : { ativo: params.ativo },
  );

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

export type EstatisticasInsumos = {
  total: number;
  /** Quantidade menor ou igual ao mínimo (inclui zerados). */
  abaixoDoMinimo: number;
  zerados: number;
  /** Soma de custo unitário × quantidade dos insumos ativos. */
  custoEstoque: number;
};

/**
 * Contadores da tela de Insumos (somente leitura; independem de busca e
 * página). O custo em estoque é calculado em memória (ver produtos).
 */
export async function contarEstatisticasInsumos(): Promise<EstatisticasInsumos> {
  const [total, abaixoDoMinimo, zerados, emEstoque] = await Promise.all([
    prisma.insumo.count(),
    prisma.insumo.count({ where: whereAbaixoDoMinimo() }),
    prisma.insumo.count({ where: ZERADOS }),
    prisma.insumo.findMany({ where: { ativo: true }, select: { custoUnitario: true, quantidadeEstoque: true } }),
  ]);

  return {
    total,
    abaixoDoMinimo,
    zerados,
    custoEstoque: somarValorEstoque(emEstoque.map((i) => ({ preco: i.custoUnitario, quantidade: i.quantidadeEstoque }))),
  };
}
