import { prisma } from "@/lib/prisma";

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
