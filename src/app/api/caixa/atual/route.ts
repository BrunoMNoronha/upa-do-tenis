import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { obterCaixaAberto, CaixaError } from "@/lib/caixa";
import { classificarEstadoCaixa } from "@/lib/caixa-alerta";

// Forçar para não tentar gerar estaticamente (Next.js 14)
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const caixa = await obterCaixaAberto();
    // Classificar a mesma leitura evita divergência entre caixa e alerta.
    // Mantém `caixa` e acrescenta metadados, sem alterar valores financeiros.
    const alerta = classificarEstadoCaixa(caixa
      ? { id: caixa.id, dataAbertura: new Date(caixa.dataAbertura) }
      : null);
    return NextResponse.json({ caixa, alerta });
  } catch (error) {
    if (error instanceof CaixaError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("Erro ao obter caixa atual:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno." },
      { status: 500 }
    );
  }
}
