import { prisma } from "@/lib/prisma";

export async function listarFormasPagamento() {
  return prisma.formaPagamento.findMany({
    where: { ativo: true },
    orderBy: {
      nome: "asc",
    },
  });
}
