/**
 * Regra de visibilidade do catálogo público (#273). Um produto só aparece para
 * o visitante quando está marcado para publicação, ativo e com estoque
 * positivo. O estoque exato nunca sai do servidor; só esta decisão.
 */
export type SituacaoCatalogo = "FORA_DO_CATALOGO" | "VISIVEL" | "OCULTO_INATIVO" | "OCULTO_SEM_ESTOQUE";

type ProdutoCatalogavel = {
  publicadoNoCatalogo: boolean;
  ativo: boolean;
  quantidadeEstoque: number;
};

export function situacaoNoCatalogo(produto: ProdutoCatalogavel): SituacaoCatalogo {
  if (!produto.publicadoNoCatalogo) return "FORA_DO_CATALOGO";
  if (!produto.ativo) return "OCULTO_INATIVO";
  if (!(produto.quantidadeEstoque > 0)) return "OCULTO_SEM_ESTOQUE";
  return "VISIVEL";
}

export const ROTULO_SITUACAO_CATALOGO: Record<SituacaoCatalogo, string> = {
  FORA_DO_CATALOGO: "Fora do catálogo",
  VISIVEL: "Visível no catálogo",
  OCULTO_INATIVO: "Publicado, oculto: inativo",
  OCULTO_SEM_ESTOQUE: "Publicado, oculto: sem estoque",
};
