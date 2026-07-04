import { prisma } from "@/lib/prisma";

export const usuarioPublicoSelect = {
  id: true,
  nome: true,
  email: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
} as const;

export async function listarUsuarios() {
  return prisma.usuario.findMany({
    orderBy: { nome: "asc" },
    select: usuarioPublicoSelect,
  });
}
