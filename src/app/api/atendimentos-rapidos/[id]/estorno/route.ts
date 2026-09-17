import { NextRequest, NextResponse } from "next/server";

import { exigirSessaoApi, obterUsuarioSessaoDaRequest } from "@/lib/auth-server";
import { CaixaError } from "@/lib/caixa";
import { AtendimentoRapidoError } from "@/lib/atendimento-rapido";
import { estornarAtendimentoRapido } from "@/lib/atendimento-rapido-estorno";
import {
  estornarAtendimentoRapidoSchema,
  estornoAtendimentoRapidoParamsSchema,
} from "@/lib/atendimento-rapido-estorno-schema";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const parsedParams = estornoAtendimentoRapidoParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { message: "Parâmetros inválidos.", errors: parsedParams.error.flatten() },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsedBody = estornarAtendimentoRapidoSchema.safeParse(body ?? {});
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          message: parsedBody.error.issues[0]?.message ?? "Dados inválidos.",
          errors: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const usuario = await obterUsuarioSessaoDaRequest(req);
    if (!usuario) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const resultado = await estornarAtendimentoRapido(parsedParams.data.id, parsedBody.data, usuario.id);

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof AtendimentoRapidoError || error instanceof CaixaError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error("Erro ao estornar atendimento rápido:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao estornar o atendimento rápido." },
      { status: 500 },
    );
  }
}
