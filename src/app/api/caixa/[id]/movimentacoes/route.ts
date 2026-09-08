import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { registrarMovimentacaoCaixa, CaixaError } from "@/lib/caixa";
import { movimentacaoCaixaSchema } from "@/lib/caixa-schema";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const body = await req.json();
    const parsed = movimentacaoCaixaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const movimentacao = await registrarMovimentacaoCaixa(id, parsed.data);
    return NextResponse.json(movimentacao, { status: 201 });
  } catch (error) {
    if (error instanceof CaixaError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("Erro ao registrar movimentação no caixa:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao registrar a movimentação." },
      { status: 500 }
    );
  }
}
