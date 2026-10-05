import { randomUUID } from "node:crypto";

/**
 * Imagem comercial do produto (#273). Fica no mesmo Blob privado das fotos de
 * OS, mas sob o prefixo próprio `catalogo/produtos/`, sem nenhuma relação com
 * `ordens-servico/`. O pathname nunca vai ao navegador: a imagem é servida por
 * rotas proxy (painel autenticado e, no catálogo, só para produto publicável).
 */
export const PREFIXO_IMAGEM_PRODUTO = "catalogo/produtos";

export function montarPathnameImagemProduto(produtoId: string, extensao: "jpg" | "png" | "webp") {
  return `${PREFIXO_IMAGEM_PRODUTO}/${produtoId}/${randomUUID()}.${extensao}`;
}

/** Garante que um pathname salvo pertence ao produto antes de removê-lo do storage. */
export function pathnamePertenceAoProduto(pathname: string, produtoId: string) {
  return pathname.startsWith(`${PREFIXO_IMAGEM_PRODUTO}/${produtoId}/`);
}

export class ImagemProdutoError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ImagemProdutoError";
    this.status = status;
  }
}
