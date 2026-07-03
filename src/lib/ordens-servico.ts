import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type OsStatus = "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "ENTREGUE";

export const transicoesPermitidas: Record<OsStatus, OsStatus[]> = {
  ABERTA: ["EM_ANDAMENTO"],
  EM_ANDAMENTO: ["CONCLUIDA"],
  CONCLUIDA: ["ENTREGUE"],
  ENTREGUE: [], // Estado final
};

export async function listarOrdensServico() {
  return prisma.ordemServico.findMany({
    include: {
      cliente: true,
      itens: {
        include: {
          servicos: {
            include: {
              servico: true,
            },
          },
        },
      },
      historicosStatus: {
        orderBy: {
          criadoEm: "desc",
        },
      },
    },
    orderBy: {
      criadoEm: "desc",
    },
  });
}
