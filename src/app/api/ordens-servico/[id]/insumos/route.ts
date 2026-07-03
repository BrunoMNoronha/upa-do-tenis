import { NextRequest, NextResponse } from "next/server";

import { ordemServicoIdParamsSchema } from "@/lib/ordens-servico-schema";
import { registrarInsumoItemOrdemServicoSchema } from "@/lib/ordens-servico-insumos-schema";
import {
  InsumoItemOrdemServicoError,
  listarInsumosOrdemServico,
  registrarInsumoItemOrdemServico,
} from "@/lib/ordens-servico-insumos";

function resolverErro(error: unknown) {
  if (error instanceof InsumoItemOrdemServicoError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  console.error("Erro no fluxo de insumos da OS:", error);
  return NextResponse.json(
    { message: "Ocorreu um erro interno no fluxo de insumos da OS." },
    { status: 500 },
  );
}

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

    const insumos = await listarInsumosOrdemServico(parsedParams.data.id);

    return NextResponse.json({ insumos });
  } catch (error) {
    return resolverErro(error);
  }
}

export async function POST(
  req: NextRequest,
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

    const body = await req.json();
    const parsedBody = registrarInsumoItemOrdemServicoSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos.",
          errors: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const resultado = await registrarInsumoItemOrdemServico(parsedParams.data.id, parsedBody.data);

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    return resolverErro(error);
  }
}