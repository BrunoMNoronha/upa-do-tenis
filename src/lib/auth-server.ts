import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";

import { SESSAO_COOKIE_NOME, verificarTokenSessao } from "@/lib/auth-session";
import { buscarUsuarioSessao, type UsuarioAutenticado } from "@/lib/auth-service";

async function resolverSessao(token: string | undefined): Promise<UsuarioAutenticado | null> {
  if (!token) {
    return null;
  }

  const payload = verificarTokenSessao(token);

  if (!payload) {
    return null;
  }

  return buscarUsuarioSessao(payload.sub);
}

export async function obterUsuarioSessao(): Promise<UsuarioAutenticado | null> {
  return resolverSessao(cookies().get(SESSAO_COOKIE_NOME)?.value);
}

export async function exigirSessao(): Promise<UsuarioAutenticado> {
  const usuario = await obterUsuarioSessao();

  if (!usuario) {
    redirect("/login");
  }

  return usuario;
}

export async function obterUsuarioSessaoDaRequest(
  req: NextRequest
): Promise<UsuarioAutenticado | null> {
  return resolverSessao(req.cookies.get(SESSAO_COOKIE_NOME)?.value);
}

/**
 * Enforcement de sessão para route handlers de API.
 * Retorna a resposta 401 padronizada quando não há sessão válida de usuário
 * ativo, ou null quando a requisição está autenticada e pode prosseguir.
 */
export async function exigirSessaoApi(req: NextRequest): Promise<NextResponse | null> {
  const sessao = await obterUsuarioSessaoDaRequest(req);

  if (!sessao) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  return null;
}
