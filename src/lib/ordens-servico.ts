import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type OsStatus = "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "ENTREGUE";

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
    },
    orderBy: {
      criadoEm: "desc",
    },
  });
}
