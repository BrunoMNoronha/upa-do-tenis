import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obterUsuarioSessaoDaRequest } from "@/lib/auth-server";
import { hashPassword } from "@/lib/passwords";
import { usuarioCriarSchema } from "@/lib/usuarios-schema";
import { usuarioPublicoSelect } from "@/lib/usuarios";

export async function POST(req: NextRequest) {
  try {
    const sessao = await obterUsuarioSessaoDaRequest(req);

    if (!sessao) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json();
    const result = usuarioCriarSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const nome = result.data.nome.trim();
    const email = result.data.email.trim().toLowerCase();

    const existente = await prisma.usuario.findUnique({ where: { email } });

    if (existente) {
      return NextResponse.json(
        { message: "Já existe um usuário cadastrado com este e-mail." },
        { status: 409 }
      );
    }

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senhaHash: hashPassword(result.data.senha),
        ativo: true,
      },
      select: usuarioPublicoSelect,
    });

    return NextResponse.json(novoUsuario, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { message: "Já existe um usuário cadastrado com este e-mail." },
        { status: 409 }
      );
    }

    console.error("Erro ao criar usuário:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao criar o usuário." },
      { status: 500 }
    );
  }
}
