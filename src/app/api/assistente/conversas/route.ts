import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi, obterUsuarioSessaoDaRequest } from "@/lib/auth-server";
import { criarConversaComMensagens, listarConversas } from "@/lib/assistente-conversas";
import { responderPergunta } from "@/lib/assistente-ia";
import { novaConversaSchema } from "@/lib/assistente-schema";
import { obterChaveClaude } from "@/lib/insights-config";
import { ErroInsightsIA, STATUS_HTTP_ERRO_INSIGHTS } from "@/lib/insights-ia";

export const dynamic = "force-dynamic";
// Perguntas com várias consultas de dados podem levar dezenas de segundos.
export const maxDuration = 60;

const SEM_CACHE_HTTP = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const usuario = (await obterUsuarioSessaoDaRequest(req))!;

    const paginaInformada = Number(req.nextUrl.searchParams.get("pagina") ?? "1");
    const pagina = Number.isInteger(paginaInformada) && paginaInformada > 0 ? paginaInformada : 1;

    return NextResponse.json(await listarConversas(usuario.id, pagina), { status: 200, headers: SEM_CACHE_HTTP });
  } catch (error) {
    console.error("Erro ao listar conversas do Assistente:", error);
    return NextResponse.json(
      { message: "Erro interno ao carregar as conversas." },
      { status: 500, headers: SEM_CACHE_HTTP },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const usuario = (await obterUsuarioSessaoDaRequest(req))!;

    const body = await req.json().catch(() => null);
    const parsed = novaConversaSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dados inválidos.", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const apiKey = await obterChaveClaude();
    if (!apiKey) {
      return NextResponse.json(
        { message: "Cadastre a chave da Claude API em Configurações para usar o Assistente.", codigo: "CHAVE_NAO_CONFIGURADA" },
        { status: 409 },
      );
    }

    const { persona, modelo, pergunta } = parsed.data;
    const resultado = await responderPergunta({ apiKey, persona, opcaoModelo: modelo, historico: [], pergunta });
    const conversa = await criarConversaComMensagens({
      usuarioId: usuario.id,
      persona,
      pergunta,
      mensagens: resultado.mensagens,
    });

    return NextResponse.json({ conversa, resposta: resultado.resposta }, { status: 200 });
  } catch (error) {
    if (error instanceof ErroInsightsIA) {
      return NextResponse.json(
        { message: error.message, codigo: error.codigo },
        { status: STATUS_HTTP_ERRO_INSIGHTS[error.codigo] },
      );
    }
    console.error("Erro ao iniciar conversa do Assistente:", error);
    return NextResponse.json({ message: "Erro interno ao processar a pergunta." }, { status: 500 });
  }
}
