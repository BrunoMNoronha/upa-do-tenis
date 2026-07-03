import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function listarServicos() {
  return prisma.servico.findMany({
    where: { ativo: true },
    orderBy: {
      nome: "asc",
    },
  });
}
