import { NextResponse } from "next/server";
import { obterCaixaAberto, CaixaError } from "@/lib/caixa";

// Forçar para não tentar gerar estaticamente (Next.js 14)
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const caixa = await obterCaixaAberto();
    return NextResponse.json({ caixa });
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
