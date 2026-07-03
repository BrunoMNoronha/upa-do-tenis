import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function listarFormasPagamento() {
  return prisma.formaPagamento.findMany({
    where: { ativo: true },
    orderBy: {
      nome: "asc",
    },
  });
}
