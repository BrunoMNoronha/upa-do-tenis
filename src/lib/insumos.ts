import { prisma } from "@/lib/prisma";

export async function listarInsumos(estoqueBaixo?: boolean) {
  return prisma.insumo.findMany({
    where: estoqueBaixo
      ? { quantidadeEstoque: { lte: prisma.insumo.fields.estoqueMinimo } }
      : undefined,
    orderBy: {
      nome: "asc",
    },
  });
}
