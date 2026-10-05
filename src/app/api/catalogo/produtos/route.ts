import { NextRequest, NextResponse } from "next/server";

import { buscarProdutosCatalogoPorIds } from "@/lib/catalogo-publico";
import { ITENS_MAXIMOS_CARRINHO, idProdutoValido } from "@/lib/carrinho-catalogo";

const SEM_CACHE = { "Cache-Control": "no-store" };

/**
 * PÚBLICA (#273): revalida o carrinho antes do WhatsApp. Recebe `?ids=a,b,c`
 * e devolve somente id, nome e preço (centavos) dos que continuam visíveis.
 * Não lista o catálogo inteiro nem aceita escrita.
 */
export async function GET(req: NextRequest) {
  const bruto = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = [...new Set(bruto.split(",").map((id) => id.trim()).filter(Boolean))];

  if (ids.length === 0 || ids.length > ITENS_MAXIMOS_CARRINHO || !ids.every(idProdutoValido)) {
    return NextResponse.json({ message: "Informe de 1 a 50 produtos válidos." }, { status: 400, headers: SEM_CACHE });
  }

  try {
    const produtos = await buscarProdutosCatalogoPorIds(ids);
    return NextResponse.json(
      { produtos: produtos.map(({ id, nome, precoCentavos }) => ({ id, nome, precoCentavos })) },
      { headers: SEM_CACHE },
    );
  } catch (error) {
    console.error("Erro ao revalidar produtos do catálogo.", error);
    return NextResponse.json({ message: "Não foi possível conferir os produtos agora." }, { status: 503, headers: SEM_CACHE });
  }
}
