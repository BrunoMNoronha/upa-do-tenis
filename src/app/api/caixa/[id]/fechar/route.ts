import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { fecharCaixa, CaixaError } from "@/lib/caixa";
import { fecharCaixaSchema } from "@/lib/caixa-schema";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const body = await req.json();
    const parsed = fecharCaixaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const caixa = await fecharCaixa(params.id, parsed.data);
    return NextResponse.json(caixa);
  } catch (error) {
    if (error instanceof CaixaError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("Erro ao fechar caixa:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao fechar o caixa." },
      { status: 500 }
    );
  }
}
