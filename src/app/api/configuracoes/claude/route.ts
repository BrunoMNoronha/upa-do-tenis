import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import {
  chaveClaudeSchema,
  obterStatusChaveClaude,
  removerChaveClaude,
  salvarChaveClaude,
} from "@/lib/insights-config";

export const dynamic = "force-dynamic";

const SEM_CACHE_HTTP = { "Cache-Control": "private, no-store" };

// Nenhuma resposta desta rota devolve a chave em claro: apenas o status e os últimos 4 caracteres.

export async function GET(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) {
      naoAutenticado.headers.set("Cache-Control", "private, no-store");
      return naoAutenticado;
    }

    return NextResponse.json(await obterStatusChaveClaude(), { status: 200, headers: SEM_CACHE_HTTP });
  } catch (error) {
    console.error("Erro ao carregar status da chave da Claude API:", error);
    return NextResponse.json(
      { message: "Erro interno ao carregar a configuração da IA." },
      { status: 500, headers: SEM_CACHE_HTTP },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const body = await req.json().catch(() => ({}));
    const parsed = chaveClaudeSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Chave inválida.", errors: parsed.error.flatten() },
        { status: 400, headers: SEM_CACHE_HTTP },
      );
    }

    const status = await salvarChaveClaude(parsed.data.apiKey);
    return NextResponse.json(
      { message: "Chave da Claude API salva com sucesso.", ...status },
      { status: 200, headers: SEM_CACHE_HTTP },
    );
  } catch (error) {
    console.error("Erro ao salvar a chave da Claude API:", error);
    return NextResponse.json(
      { message: "Erro interno ao salvar a chave da Claude API." },
      { status: 500, headers: SEM_CACHE_HTTP },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    await removerChaveClaude();
    return NextResponse.json(
      { message: "Chave da Claude API removida.", configurada: false, ultimosQuatro: null },
      { status: 200, headers: SEM_CACHE_HTTP },
    );
  } catch (error) {
    console.error("Erro ao remover a chave da Claude API:", error);
    return NextResponse.json(
      { message: "Erro interno ao remover a chave da Claude API." },
      { status: 500, headers: SEM_CACHE_HTTP },
    );
  }
}
