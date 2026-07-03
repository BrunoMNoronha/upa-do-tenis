import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { insumoFormSchema } from "@/lib/insumos-schema";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = insumoFormSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    const novoInsumo = await prisma.insumo.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        unidadeMedida: data.unidadeMedida,
        quantidadeEstoque: data.quantidadeEstoque,
        estoqueMinimo: data.estoqueMinimo,
        custoUnitario: data.custoUnitario,
        ativo: true,
      },
    });

    return NextResponse.json(novoInsumo, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar insumo:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao criar o insumo." },
      { status: 500 }
    );
  }
}
