import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

import { idProdutoValido } from "@/lib/carrinho-catalogo";
import { obterImagemProdutoCatalogo } from "@/lib/catalogo-publico";
import { pathnamePertenceAoProduto } from "@/lib/produtos-imagem";

type RouteProps = { params: Promise<{ id: string }> };

// Revalida a cada uso (ETag/304): produto retirado do catálogo deixa de ter
// imagem pública na próxima requisição, sem cache obsoleto em CDN.
const CACHE = "public, no-cache";

function naoEncontrada() {
  return NextResponse.json({ message: "Imagem não encontrada." }, { status: 404, headers: { "Cache-Control": "no-store" } });
}

/** PÚBLICA (#273): imagem comercial apenas de produto visível no catálogo. */
export async function GET(req: NextRequest, props: RouteProps) {
  const { id } = await props.params;
  if (!idProdutoValido(id)) return naoEncontrada();

  try {
    const pathname = await obterImagemProdutoCatalogo(id);
    // Defesa extra: nunca servir arquivo fora da pasta do catálogo deste produto.
    if (!pathname || !pathnamePertenceAoProduto(pathname, id)) return naoEncontrada();

    const resultado = await get(pathname, { access: "private", ifNoneMatch: req.headers.get("if-none-match") ?? undefined });
    if (!resultado) return naoEncontrada();
    if (resultado.statusCode === 304) {
      return new NextResponse(null, { status: 304, headers: { ETag: resultado.blob.etag, "Cache-Control": CACHE } });
    }
    return new NextResponse(resultado.stream, { headers: {
      "Content-Type": resultado.blob.contentType,
      "Content-Length": String(resultado.blob.size),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      ETag: resultado.blob.etag,
      "Cache-Control": CACHE,
    } });
  } catch (error) {
    console.error("Erro ao carregar imagem do catálogo.", error);
    return NextResponse.json({ message: "Não foi possível carregar a imagem." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
