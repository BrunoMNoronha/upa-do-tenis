import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";
import { usuarioAtualizarSchema } from "@/lib/usuarios-schema";
import { usuarioPublicoSelect } from "@/lib/usuarios";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const result = usuarioAtualizarSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const usuarioId = params.id;
    const data: {
      nome?: string;
      email?: string;
      senhaHash?: string;
      ativo?: boolean;
    } = {};

    if (result.data.nome !== undefined) {
      data.nome = result.data.nome.trim();
    }

    if (result.data.email !== undefined) {
      const email = result.data.email.trim().toLowerCase();

      const existente = await prisma.usuario.findUnique({ where: { email } });

      if (existente && existente.id !== usuarioId) {
        return NextResponse.json(
          { message: "Já existe um usuário cadastrado com este e-mail." },
          { status: 409 }
        );
      }

      data.email = email;
    }

    if (result.data.senha !== undefined) {
      data.senhaHash = hashPassword(result.data.senha);
    }

    if (result.data.ativo !== undefined) {
      data.ativo = result.data.ativo;
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data,
      select: usuarioPublicoSelect,
    });

    return NextResponse.json(usuarioAtualizado, { status: 200 });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json(
        { message: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    if (error?.code === "P2002") {
      return NextResponse.json(
        { message: "Já existe um usuário cadastrado com este e-mail." },
        { status: 409 }
      );
    }

    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao atualizar o usuário." },
      { status: 500 }
    );
  }
}
