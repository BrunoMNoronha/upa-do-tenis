import { NextRequest, NextResponse } from "next/server";

import { loginSchema } from "@/lib/auth-schema";
import { autenticarUsuario } from "@/lib/auth-service";
import {
  SESSAO_COOKIE_NOME,
  SESSAO_DURACAO_SEGUNDOS,
  criarTokenSessao,
} from "@/lib/auth-session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const resultado = await autenticarUsuario(result.data.email, result.data.senha);

    if (resultado.status === "credenciais_invalidas") {
      return NextResponse.json(
        { message: "E-mail ou senha inválidos." },
        { status: 401 }
      );
    }

    if (resultado.status === "usuario_inativo") {
      return NextResponse.json(
        { message: "Usuário inativo. Procure o administrador do sistema." },
        { status: 403 }
      );
    }

    const response = NextResponse.json(
      {
        usuario: {
          id: resultado.usuario.id,
          nome: resultado.usuario.nome,
          email: resultado.usuario.email,
        },
      },
      { status: 200 }
    );

    response.cookies.set(SESSAO_COOKIE_NOME, criarTokenSessao(resultado.usuario.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSAO_DURACAO_SEGUNDOS,
    });

    return response;
  } catch (error) {
    console.error("Erro ao autenticar usuário:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao autenticar." },
      { status: 500 }
    );
  }
}
