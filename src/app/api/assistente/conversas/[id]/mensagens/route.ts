import { NextRequest, NextResponse } from "next/server";
import { obterUsuarioSessaoDaRequest, exigirSessaoApi } from "@/lib/auth-server";
import {
  LIMITE_PERGUNTAS_POR_CONVERSA,
  acrescentarMensagens,
  obterConversaCompleta,
} from "@/lib/assistente-conversas";
import { responderPergunta } from "@/lib/assistente-ia";
import { novaMensagemSchema } from "@/lib/assistente-schema";
import { obterChaveClaude } from "@/lib/insights-config";
import { ErroInsightsIA, STATUS_HTTP_ERRO_INSIGHTS } from "@/lib/insights-ia";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const usuario = (await obterUsuarioSessaoDaRequest(req))!;

    const body = await req.json().catch(() => null);
    const parsed = novaMensagemSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dados inválidos.", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const conversa = await obterConversaCompleta(id, usuario.id);
    if (!conversa) return NextResponse.json({ message: "Conversa não encontrada." }, { status: 404 });

    if (conversa.perguntas >= LIMITE_PERGUNTAS_POR_CONVERSA) {
      return NextResponse.json(
        {
          message: `Esta conversa atingiu o limite de ${LIMITE_PERGUNTAS_POR_CONVERSA} perguntas. Inicie uma nova conversa.`,
          codigo: "LIMITE_CONVERSA",
        },
        { status: 409 },
      );
    }

    const apiKey = await obterChaveClaude();
    if (!apiKey) {
      return NextResponse.json(
        { message: "Cadastre a chave da Claude API em Configurações para usar o Assistente.", codigo: "CHAVE_NAO_CONFIGURADA" },
        { status: 409 },
      );
    }

    const resultado = await responderPergunta({
      apiKey,
      persona: conversa.resumo.persona,
      opcaoModelo: parsed.data.modelo,
      historico: conversa.historico,
      pergunta: parsed.data.pergunta,
    });
    await acrescentarMensagens(id, conversa.historico.length, resultado.mensagens);

    return NextResponse.json({ resposta: resultado.resposta }, { status: 200 });
  } catch (error) {
    if (error instanceof ErroInsightsIA) {
      return NextResponse.json(
        { message: error.message, codigo: error.codigo },
        { status: STATUS_HTTP_ERRO_INSIGHTS[error.codigo] },
      );
    }
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { message: "A conversa foi atualizada em outra aba. Recarregue e tente novamente.", codigo: "CONFLITO" },
        { status: 409 },
      );
    }
    console.error("Erro ao responder no Assistente:", error);
    return NextResponse.json({ message: "Erro interno ao processar a pergunta." }, { status: 500 });
  }
}
