import { NextRequest, NextResponse } from "next/server";
import { servicoFormSchema } from "@/lib/servicos-schema";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = servicoFormSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    const novoServico = await prisma.servico.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        precoBase: data.precoBase,
        ativo: true,
      },
    });

    return NextResponse.json(novoServico, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar serviço:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao criar o serviço." },
      { status: 500 }
    );
  }
}
