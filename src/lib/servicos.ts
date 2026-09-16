import { prisma } from "@/lib/prisma";
import { paginarConsulta, type PaginacaoNormalizada } from "@/lib/paginacao";

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
export async function listarServicosParaGestaoPaginado(params: { paginacao: PaginacaoNormalizada }) {
  const where = {};

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
