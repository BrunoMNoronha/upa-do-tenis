import { NextRequest, NextResponse } from "next/server";

import { ordemServicoIdParamsSchema } from "@/lib/ordens-servico-schema";
import {
  obterDetalheOrdemServico,
  OrdemServicoDetalheError,
} from "@/lib/ordens-servico";

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const parsedParams = ordemServicoIdParamsSchema.safeParse(params);

    if (!parsedParams.success) {
      return NextResponse.json(
        {
          message: "Parâmetros inválidos.",
          errors: parsedParams.error.flatten(),
        },
        { status: 400 },
      );
    }

    const ordemServico = await obterDetalheOrdemServico(parsedParams.data.id);

    return NextResponse.json({ ordemServico });
  } catch (error) {
    if (error instanceof OrdemServicoDetalheError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error("Erro ao buscar detalhe da OS:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao buscar o detalhe da OS." },
      { status: 500 },
    );
  }
}