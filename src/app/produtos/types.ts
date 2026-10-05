export type ProdutoListado = {
  id: string;
  nome: string;
  descricao: string | null;
  precoVenda: number;
  quantidadeEstoque: number;
  ativo: boolean;
  publicadoNoCatalogo: boolean;
  possuiImagem: boolean;
  criadoEm: string;
  atualizadoEm: string;
};
