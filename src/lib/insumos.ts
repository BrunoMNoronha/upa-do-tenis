import { prisma } from "@/lib/prisma";

export async function listarInsumos() {
  return prisma.insumo.findMany({
    orderBy: {
      nome: "asc",
    },
  });
}
