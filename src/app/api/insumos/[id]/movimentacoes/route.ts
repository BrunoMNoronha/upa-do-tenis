import { NextRequest, NextResponse } from "next/server";
import { 
  listarMovimentacoesInsumo, 
  registrarMovimentacaoManual, 
  InsumoMovimentacaoError 
} from "@/lib/insumos-movimentacoes";
import { registrarMovimentacaoManualSchema } from "@/lib/insumos-movimentacoes-schema";
import { z } from "zod";

const idParamsSchema = z.object({
  id: z.string().cuid("ID do insumo inválido"),
});

function resolverErro(error: unknown) {
  if (error instanceof InsumoMovimentacaoError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  console.error("Erro no fluxo de movimentações de insumo:", error);
  return NextResponse.json(
    { message: "Ocorreu um erro interno no fluxo de movimentações." },
    { status: 500 },
  );
}

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const parsedParams = idParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { message: "Parâmetros inválidos.", errors: parsedParams.error.flatten() },
        { status: 400 },
      );
    }

    const dados = await listarMovimentacoesInsumo(parsedParams.data.id);
    return NextResponse.json(dados);
  } catch (error) {
    return resolverErro(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const parsedParams = idParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { message: "Parâmetros inválidos.", errors: parsedParams.error.flatten() },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsedBody = registrarMovimentacaoManualSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    const resultado = await registrarMovimentacaoManual(parsedParams.data.id, parsedBody.data);
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    return resolverErro(error);
  }
}
