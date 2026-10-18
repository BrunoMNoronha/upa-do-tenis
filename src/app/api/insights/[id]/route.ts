import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { obterAnaliseInsight } from "@/lib/insights-historico";

export const dynamic = "force-dynamic";

const SEM_CACHE_HTTP = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const analise = await obterAnaliseInsight(id);
    if (!analise) {
      return NextResponse.json({ message: "Análise não encontrada." }, { status: 404, headers: SEM_CACHE_HTTP });
    }

    return NextResponse.json(analise, { status: 200, headers: SEM_CACHE_HTTP });
  } catch (error) {
    console.error("Erro ao carregar análise de insights:", error);
    return NextResponse.json(
      { message: "Erro interno ao carregar a análise." },
      { status: 500, headers: SEM_CACHE_HTTP },
    );
  }
}
