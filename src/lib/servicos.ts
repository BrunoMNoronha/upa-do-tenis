import { prisma } from "@/lib/prisma";
import { paginarConsulta, type PaginacaoNormalizada } from "@/lib/paginacao";
import { combinarCondicoes, montarCondicaoBusca } from "@/lib/busca-listagem";

/**
 * Listagem operacional: só serviços ativos, para as telas que vinculam
 * serviço a uma ordem de serviço.
 */
export async function listarServicos() {
  return prisma.servico.findMany({
    where: { ativo: true },
    orderBy: {
      nome: "asc",
    },
  });
}

/**
 * Listagem de gestão: inclui os inativos para que a tela de cadastro possa
 * exibir o status e permitir a reativação.
 */
export async function listarServicosParaGestao() {
  return prisma.servico.findMany({
    orderBy: {
      nome: "asc",
    },
  });
}

/**
 * Listagem de gestão paginada server-side (tela de Serviços). A ordenação
 * por nome recebe `id` como desempate para que a paginação seja estável.
 */
export async function listarServicosParaGestaoPaginado(params: {
  busca?: string;
  /** Chips da tela: `true` só ativos, `false` só inativos, indefinido todos. */
  ativo?: boolean;
  paginacao: PaginacaoNormalizada;
}) {
  // Busca por nome/descrição e filtro de status aplicados no mesmo where de count e findMany.
  const where =
    combinarCondicoes(
      montarCondicaoBusca(params.busca, ["nome", "descricao"]),
      params.ativo === undefined ? undefined : { ativo: params.ativo },
    ) ?? {};

  return paginarConsulta({
    paginacao: params.paginacao,
    contar: () => prisma.servico.count({ where }),
    buscar: ({ skip, take }) =>
      prisma.servico.findMany({
        where,
        orderBy: [{ nome: "asc" }, { id: "asc" }],
        skip,
        take,
      }),
  });
}

export type EstatisticasServicos = {
  total: number;
  ativos: number;
  inativos: number;
  /** Média do preço base entre os ativos; `null` sem serviços ativos. */
  precoMedioAtivos: number | null;
};

/** Contadores da tela de Serviços (somente leitura; independem de busca e página). */
export async function contarEstatisticasServicos(): Promise<EstatisticasServicos> {
  const [total, ativos, media] = await Promise.all([
    prisma.servico.count(),
    prisma.servico.count({ where: { ativo: true } }),
    prisma.servico.aggregate({ where: { ativo: true }, _avg: { precoBase: true } }),
  ]);

  const precoMedio = media._avg.precoBase;

  return {
    total,
    ativos,
    inativos: total - ativos,
    precoMedioAtivos: precoMedio === null || precoMedio === undefined ? null : Number(precoMedio),
  };
}
