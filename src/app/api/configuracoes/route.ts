import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { configuracaoAvaliacaoSchema } from "@/lib/configuracoes-schema";
import { salvarLinkAvaliacaoGoogle } from "@/lib/configuracoes";
import { invalidarCacheLinkAvaliacaoGoogle, obterLinkAvaliacaoGoogleComCache } from "@/lib/dados-cache";

const SEM_CACHE_HTTP = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) {
      naoAutenticado.headers.set("Cache-Control", "private, no-store");
      return naoAutenticado;
    }

    const linkAvaliacaoGoogle = await obterLinkAvaliacaoGoogleComCache();
    return NextResponse.json({ linkAvaliacaoGoogle }, { status: 200, headers: SEM_CACHE_HTTP });
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    return NextResponse.json(
      { message: "Erro interno ao carregar as configurações." },
      { status: 500, headers: SEM_CACHE_HTTP }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const body = await req.json().catch(() => ({}));
    const parseResult = configuracaoAvaliacaoSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          message: "URL de avaliação inválida. Deve ser uma URL HTTPS válida ou vazia.",
          errors: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const novoLink = parseResult.data.linkAvaliacaoGoogle ?? null;
    await salvarLinkAvaliacaoGoogle(novoLink);
    invalidarCacheLinkAvaliacaoGoogle();

    return NextResponse.json(
      {
        message: "Configuração atualizada com sucesso.",
        linkAvaliacaoGoogle: novoLink,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    return NextResponse.json(
      { message: "Erro interno ao salvar as configurações." },
      { status: 500 }
    );
  }
}
