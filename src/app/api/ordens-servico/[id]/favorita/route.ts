import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import {
  ordemServicoFavoritaSchema,
  ordemServicoIdParamsSchema,
} from "@/lib/ordens-servico-schema";
import {
  definirFavoritaOrdemServico,
  OrdemServicoDetalheError,
} from "@/lib/ordens-servico";

/**
 * PATCH /api/ordens-servico/[id]/favorita
 * Marcador operacional (issue #153): não altera status, valores, pagamentos,
 * caixa, estoque ou insumos. Idempotente: repetir a chamada com o mesmo
 * valor devolve o mesmo estado sem nova gravação.
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const parsedParams = ordemServicoIdParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }

    const result = ordemServicoFavoritaSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 },
      );
    }

    const ordemServico = await definirFavoritaOrdemServico(
      parsedParams.data.id,
      result.data.favorita,
    );

    return NextResponse.json(ordemServico, { status: 200 });
  } catch (error) {
    if (error instanceof OrdemServicoDetalheError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error("Erro ao atualizar favorito da OS:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao atualizar o favorito da OS." },
      { status: 500 },
    );
  }
}
