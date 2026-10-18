import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { obterChaveClaude } from "@/lib/insights-config";
import { ErroInsightsIA, STATUS_HTTP_ERRO_INSIGHTS, testarChaveClaude } from "@/lib/insights-ia";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const apiKey = await obterChaveClaude();
    if (!apiKey) {
      return NextResponse.json(
        { message: "Nenhuma chave da Claude API configurada.", codigo: "CHAVE_NAO_CONFIGURADA" },
        { status: 409 },
      );
    }

    await testarChaveClaude(apiKey);
    return NextResponse.json({ ok: true, message: "Conexão com a Claude API verificada." }, { status: 200 });
  } catch (error) {
    if (error instanceof ErroInsightsIA) {
      return NextResponse.json(
        { message: error.message, codigo: error.codigo },
        { status: STATUS_HTTP_ERRO_INSIGHTS[error.codigo] },
      );
    }
    console.error("Erro ao testar a chave da Claude API:", error);
    return NextResponse.json({ message: "Erro interno ao testar a conexão." }, { status: 500 });
  }
}
