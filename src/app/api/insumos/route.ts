import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { insumoFormSchema } from "@/lib/insumos-schema";
import { listarInsumos } from "@/lib/insumos";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const insumos = await listarInsumos();
    return NextResponse.json(insumos, { status: 200 });
  } catch (error) {
    console.error("Erro ao listar insumos:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao listar os insumos." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

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
