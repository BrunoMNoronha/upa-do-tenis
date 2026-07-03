import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function listarInsumos() {
  return prisma.insumo.findMany({
    orderBy: {
      nome: "asc",
    },
  });
}
