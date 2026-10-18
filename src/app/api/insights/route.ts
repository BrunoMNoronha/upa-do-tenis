import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi, obterUsuarioSessaoDaRequest } from "@/lib/auth-server";
import { obterChaveClaude } from "@/lib/insights-config";
import { listarAnalisesInsight, registrarAnaliseInsight } from "@/lib/insights-historico";
import { ErroInsightsIA, STATUS_HTTP_ERRO_INSIGHTS, gerarAnaliseInsights } from "@/lib/insights-ia";
import { gerarInsightsRequestSchema } from "@/lib/insights-schema";
import { montarPayloadInsights } from "@/lib/insights-service";

export const dynamic = "force-dynamic";
// A análise com o modelo inteligente pode levar dezenas de segundos.
export const maxDuration = 60;

const SEM_CACHE_HTTP = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const paginaInformada = Number(req.nextUrl.searchParams.get("pagina") ?? "1");
    const pagina = Number.isInteger(paginaInformada) && paginaInformada > 0 ? paginaInformada : 1;

    return NextResponse.json(await listarAnalisesInsight(pagina), { status: 200, headers: SEM_CACHE_HTTP });
  } catch (error) {
    console.error("Erro ao listar o histórico de insights:", error);
    return NextResponse.json(
      { message: "Erro interno ao carregar o histórico de análises." },
      { status: 500, headers: SEM_CACHE_HTTP },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const usuario = await obterUsuarioSessaoDaRequest(req);
    if (!usuario) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = gerarInsightsRequestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dados inválidos.", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const apiKey = await obterChaveClaude();
    if (!apiKey) {
      return NextResponse.json(
        {
          message: "Cadastre a chave da Claude API em Configurações para gerar análises.",
          codigo: "CHAVE_NAO_CONFIGURADA",
        },
        { status: 409 },
      );
    }

    const { inicio, fim, modelo } = parsed.data;
    const payload = await montarPayloadInsights({ inicio, fim });
    const resultado = await gerarAnaliseInsights(apiKey, modelo, payload);
    const meta = {
      modelo: resultado.modelo,
      periodoInicio: inicio,
      periodoFim: fim,
      tokensEntrada: resultado.tokensEntrada,
      tokensSaida: resultado.tokensSaida,
    };

    try {
      const salva = await registrarAnaliseInsight({ ...meta, analise: resultado.analise, usuarioId: usuario.id });
      return NextResponse.json({ ...salva, salva: true }, { status: 200 });
    } catch (error) {
      // A análise já foi gerada (e cobrada): devolve mesmo sem conseguir salvar no histórico.
      console.error("Erro ao salvar a análise de insights no histórico:", error);
      return NextResponse.json(
        {
          id: null,
          ...meta,
          criadoEm: new Date().toISOString(),
          usuarioNome: usuario.nome,
          analise: resultado.analise,
          salva: false,
        },
        { status: 200 },
      );
    }
  } catch (error) {
    if (error instanceof ErroInsightsIA) {
      return NextResponse.json(
        { message: error.message, codigo: error.codigo },
        { status: STATUS_HTTP_ERRO_INSIGHTS[error.codigo] },
      );
    }
    console.error("Erro ao gerar análise de insights:", error);
    return NextResponse.json({ message: "Erro interno ao gerar a análise." }, { status: 500 });
  }
}
