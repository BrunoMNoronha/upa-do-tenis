import { NextRequest, NextResponse } from "next/server";
import { obterUsuarioSessaoDaRequest } from "@/lib/auth-server";
import {
  LIMITE_PERGUNTAS_POR_CONVERSA,
  excluirConversa,
  obterConversaCompleta,
} from "@/lib/assistente-conversas";

export const dynamic = "force-dynamic";

const SEM_CACHE_HTTP = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const usuario = await obterUsuarioSessaoDaRequest(req);
    if (!usuario) return NextResponse.json({ message: "Não autenticado." }, { status: 401 });

    const conversa = await obterConversaCompleta(id, usuario.id);
    if (!conversa) {
      return NextResponse.json({ message: "Conversa não encontrada." }, { status: 404, headers: SEM_CACHE_HTTP });
    }

    return NextResponse.json(
      {
        conversa: conversa.resumo,
        mensagens: conversa.visiveis,
        limiteAtingido: conversa.perguntas >= LIMITE_PERGUNTAS_POR_CONVERSA,
      },
      { status: 200, headers: SEM_CACHE_HTTP },
    );
  } catch (error) {
    console.error("Erro ao carregar conversa do Assistente:", error);
    return NextResponse.json(
      { message: "Erro interno ao carregar a conversa." },
      { status: 500, headers: SEM_CACHE_HTTP },
    );
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const usuario = await obterUsuarioSessaoDaRequest(req);
    if (!usuario) return NextResponse.json({ message: "Não autenticado." }, { status: 401 });

    if (!(await excluirConversa(id, usuario.id))) {
      return NextResponse.json({ message: "Conversa não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ message: "Conversa excluída." }, { status: 200 });
  } catch (error) {
    console.error("Erro ao excluir conversa do Assistente:", error);
    return NextResponse.json({ message: "Erro interno ao excluir a conversa." }, { status: 500 });
  }
}
