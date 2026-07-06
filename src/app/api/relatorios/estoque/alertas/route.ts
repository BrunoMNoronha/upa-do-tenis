import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { getResumoAlertasEstoque } from "@/lib/relatorio-estoque-service";

// A rota lê cookies de sessão; não pode ser pré-renderizada estaticamente.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(request);
    if (naoAutenticado) return naoAutenticado;

    const alertas = await getResumoAlertasEstoque();
    return NextResponse.json(alertas);
  } catch (error: any) {
    console.error("Erro ao buscar alertas:", error);
    return NextResponse.json({ error: "Erro ao buscar alertas" }, { status: 500 });
  }
}
