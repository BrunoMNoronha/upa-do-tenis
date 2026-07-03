import { NextRequest, NextResponse } from "next/server";
import { formaPagamentoFormSchema } from "@/lib/formas-pagamento-schema";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = formaPagamentoFormSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    const novaForma = await prisma.formaPagamento.create({
      data: {
        nome: data.nome,
        tipo: data.tipo,
        ativo: true,
      },
    });

    return NextResponse.json(novaForma, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar forma de pagamento:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao criar a forma de pagamento." },
      { status: 500 }
    );
  }
}
