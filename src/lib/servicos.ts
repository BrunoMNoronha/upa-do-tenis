import { prisma } from "@/lib/prisma";

export async function listarServicos() {
  return prisma.servico.findMany({
    where: { ativo: true },
    orderBy: {
      nome: "asc",
    },
  });
}
