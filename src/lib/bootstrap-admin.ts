import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";
import { usuarioCriarSchema } from "@/lib/usuarios-schema";
import { usuarioPublicoSelect } from "@/lib/usuarios";

export type UsuarioPublico = {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
};

export type ResultadoBootstrap =
  | { status: "criado"; usuario: UsuarioPublico }
  | { status: "bloqueado"; totalUsuarios: number }
  | { status: "dados_invalidos"; erros: string[] };

export async function criarPrimeiroAdmin(input: {
  nome: string;
  email: string;
  senha: string;
}): Promise<ResultadoBootstrap> {
  const result = usuarioCriarSchema.safeParse(input);

  if (!result.success) {
    return {
      status: "dados_invalidos",
      erros: result.error.issues.map((issue) => issue.message),
    };
  }

  const totalUsuarios = await prisma.usuario.count();

  if (totalUsuarios > 0) {
    return { status: "bloqueado", totalUsuarios };
  }

  const usuario = await prisma.usuario.create({
    data: {
      nome: result.data.nome.trim(),
      email: result.data.email.trim().toLowerCase(),
      senhaHash: hashPassword(result.data.senha),
      ativo: true,
    },
    select: usuarioPublicoSelect,
  });

  return { status: "criado", usuario };
}
