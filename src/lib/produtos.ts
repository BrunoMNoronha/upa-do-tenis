import { prisma } from "@/lib/prisma";

export async function listarProdutos() {
  return prisma.produto.findMany({
    orderBy: {
      nome: "asc",
    },
  });
}
