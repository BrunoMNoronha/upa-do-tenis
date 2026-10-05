import { createHash } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { paraCentavos } from "@/lib/centavos";
import { prisma } from "@/lib/prisma";

/**
 * Leitura pública do catálogo (#273). Única porta do banco para visitantes sem
 * sessão: seleciona só campos comerciais e aplica a mesma regra de
 * `situacaoNoCatalogo()` (publicado + ativo + estoque > 0). Estoque, datas,
 * movimentações e o pathname da imagem nunca saem daqui.
 */
export const ONDE_PRODUTO_VISIVEL = {
  publicadoNoCatalogo: true,
  ativo: true,
  quantidadeEstoque: { gt: 0 },
} satisfies Prisma.ProdutoWhereInput;

export const LIMITE_PRODUTOS_CATALOGO = 500;

export type ProdutoCatalogo = {
  id: string;
  nome: string;
  descricao: string | null;
  precoCentavos: number;
  /** Muda quando a imagem é trocada; serve de cache-busting sem expor o pathname. */
  versaoImagem: string | null;
};

const SELECAO_PUBLICA = {
  id: true,
  nome: true,
  descricao: true,
  precoVenda: true,
  imagemPathname: true,
} satisfies Prisma.ProdutoSelect;

type ProdutoSelecionado = Prisma.ProdutoGetPayload<{ select: typeof SELECAO_PUBLICA }>;

function paraProjecaoPublica(produto: ProdutoSelecionado): ProdutoCatalogo | null {
  const precoCentavos = paraCentavos(produto.precoVenda.toFixed(2));
  if (precoCentavos === null) {
    console.error("Produto publicado com preço fora do formato monetário; omitido do catálogo.", { id: produto.id });
    return null;
  }
  return {
    id: produto.id,
    nome: produto.nome,
    descricao: produto.descricao?.trim() ? produto.descricao.trim() : null,
    precoCentavos,
    versaoImagem: produto.imagemPathname
      ? createHash("sha256").update(produto.imagemPathname).digest("hex").slice(0, 16)
      : null,
  };
}

function projetar(produtos: ProdutoSelecionado[]) {
  return produtos.flatMap((produto) => paraProjecaoPublica(produto) ?? []);
}

export async function listarProdutosCatalogo(): Promise<ProdutoCatalogo[]> {
  const produtos = await prisma.produto.findMany({
    where: ONDE_PRODUTO_VISIVEL,
    select: SELECAO_PUBLICA,
    orderBy: [{ nome: "asc" }, { id: "asc" }],
    take: LIMITE_PRODUTOS_CATALOGO,
  });
  return projetar(produtos);
}

/** Revalidação do carrinho: devolve só os ids pedidos que continuam visíveis. */
export async function buscarProdutosCatalogoPorIds(ids: readonly string[]): Promise<ProdutoCatalogo[]> {
  if (ids.length === 0) return [];
  const produtos = await prisma.produto.findMany({
    where: { ...ONDE_PRODUTO_VISIVEL, id: { in: [...ids] } },
    select: SELECAO_PUBLICA,
  });
  return projetar(produtos);
}

/** Pathname da imagem apenas para produto visível; caso contrário `null`. */
export async function obterImagemProdutoCatalogo(id: string): Promise<string | null> {
  const produto = await prisma.produto.findFirst({
    where: { ...ONDE_PRODUTO_VISIVEL, id },
    select: { imagemPathname: true },
  });
  return produto?.imagemPathname ?? null;
}
