import { NextRequest, NextResponse } from "next/server";

import { exigirSessaoApi } from "@/lib/auth-server";
import {
  registrarPagamentoOrdemServicoSchema,
} from "@/lib/ordens-servico-pagamentos-schema";
import { ordemServicoIdParamsSchema } from "@/lib/ordens-servico-schema";
import {
  listarPagamentosOrdemServico,
  PagamentoOrdemServicoError,
  registrarPagamentoOrdemServico,
} from "@/lib/ordens-servico-pagamentos";

function resolverErro(error: unknown) {
  if (error instanceof PagamentoOrdemServicoError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  console.error("Erro no fluxo de pagamentos da OS:", error);
  return NextResponse.json(
    { message: "Ocorreu um erro interno no fluxo de pagamentos." },
    { status: 500 },
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

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

    const pagamentos = await listarPagamentosOrdemServico(parsedParams.data.id);

    return NextResponse.json({ pagamentos });
  } catch (error) {
    return resolverErro(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

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
    const parsedBody = registrarPagamentoOrdemServicoSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos.",
          errors: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const resultado = await registrarPagamentoOrdemServico(
      parsedParams.data.id,
      parsedBody.data,
    );

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    return resolverErro(error);
  }
}