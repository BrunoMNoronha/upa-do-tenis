import { prisma } from "@/lib/prisma";
import { DUMMY_HASH, verifyPassword } from "@/lib/passwords";
import { usuarioPublicoSelect } from "@/lib/usuarios";

export type UsuarioAutenticado = {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
};

export type ResultadoAutenticacao =
  | { status: "ok"; usuario: UsuarioAutenticado }
  | { status: "credenciais_invalidas" }
  | { status: "usuario_inativo" };

export async function autenticarUsuario(
  email: string,
  senha: string
): Promise<ResultadoAutenticacao> {
  const usuario = await prisma.usuario.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  const senhaValida = verifyPassword(senha, usuario?.senhaHash ?? DUMMY_HASH);

  if (!usuario || !senhaValida) {
    return { status: "credenciais_invalidas" };
  }

  if (!usuario.ativo) {
    return { status: "usuario_inativo" };
  }

  return {
    status: "ok",
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      ativo: usuario.ativo,
    },
  };
}

export async function buscarUsuarioSessao(usuarioId: string): Promise<UsuarioAutenticado | null> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: usuarioPublicoSelect,
  });

  if (!usuario || !usuario.ativo) {
    return null;
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    ativo: usuario.ativo,
  };
}
