import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import {
  listarMovimentacoesProduto,
  MovimentacaoEstoqueProdutoError,
} from "@/lib/movimentacao-estoque-produto-service";
import { z } from "zod";

const idParamsSchema = z.object({
  id: z.string().min(1, "ID do produto inválido"),
});

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const parsedParams = idParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { message: "Parâmetros inválidos.", errors: parsedParams.error.flatten() },
        { status: 400 },
      );
    }

    const dados = await listarMovimentacoesProduto(parsedParams.data.id);
    return NextResponse.json(dados);
  } catch (error) {
    if (error instanceof MovimentacaoEstoqueProdutoError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error("Erro ao listar movimentações de produto:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao listar movimentações do produto." },
      { status: 500 },
    );
  }
}
