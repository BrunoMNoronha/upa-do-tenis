import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { obterResumoCaixaAberto } from "@/lib/caixa";
import { classificarEstadoCaixa } from "@/lib/caixa-alerta";

// A rota lê cookies de sessão; não pode ser pré-renderizada estaticamente.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const caixa = await obterResumoCaixaAberto();
    return NextResponse.json(classificarEstadoCaixa(caixa));
  } catch (error) {
    console.error("Erro ao obter alerta de caixa:", error);
    return NextResponse.json({ message: "Ocorreu um erro interno." }, { status: 500 });
  }
}
