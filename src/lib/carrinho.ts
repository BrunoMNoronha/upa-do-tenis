/**
 * Lógica pura do carrinho de venda de balcão.
 *
 * Todas as funções são puras (sem efeitos colaterais) para permitir
 * testes unitários com Vitest puro, sem necessidade de DOM ou mocks de React.
 *
 * Regras de negócio da venda (preço, estoque, caixa) continuam no backend
 * (src/lib/vendas.ts). Aqui apenas o estado local da interface.
 */

export type ItemCarrinho = {
  produtoId: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
};

function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Adiciona um produto ao carrinho.
 * Se já existir, incrementa a quantidade em `qtd` (padrão: 1).
 */
export function adicionarItem(
  itens: ItemCarrinho[],
  produto: { id: string; nome: string; precoVenda: number },
  qtd = 1,
): ItemCarrinho[] {
  const existente = itens.find((i) => i.produtoId === produto.id);

  if (existente) {
    return itens.map((i) =>
      i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + qtd } : i,
    );
  }

  return [
    ...itens,
    {
      produtoId: produto.id,
      nome: produto.nome,
      precoUnitario: produto.precoVenda,
      quantidade: qtd,
    },
  ];
}

/**
 * Ajusta a quantidade de um item no carrinho.
 * Quantidade mínima: 1. Se o item não existir, retorna a lista inalterada.
 */
export function ajustarQuantidade(
  itens: ItemCarrinho[],
  produtoId: string,
  novaQuantidade: number,
): ItemCarrinho[] {
  if (novaQuantidade < 1) return itens;
  return itens.map((i) =>
    i.produtoId === produtoId ? { ...i, quantidade: novaQuantidade } : i,
  );
}

/**
 * Remove um item do carrinho.
 */
export function removerItem(
  itens: ItemCarrinho[],
  produtoId: string,
): ItemCarrinho[] {
  return itens.filter((i) => i.produtoId !== produtoId);
}

/**
 * Calcula o subtotal de um item (preço unitário × quantidade), arredondado.
 */
export function subtotalItem(item: ItemCarrinho): number {
  return arredondar(item.precoUnitario * item.quantidade);
}

/**
 * Calcula o total geral do carrinho, arredondado.
 */
export function totalCarrinho(itens: ItemCarrinho[]): number {
  return arredondar(itens.reduce((acc, i) => acc + subtotalItem(i), 0));
}

/**
 * Valida se o carrinho está apto para finalização:
 * - ao menos um item
 * - todos os itens com preço > 0 e quantidade >= 1
 *
 * Retorna `null` se válido, ou uma string de erro se inválido.
 */
export function validarCarrinho(itens: ItemCarrinho[]): string | null {
  if (itens.length === 0) {
    return "Adicione ao menos um produto ao carrinho antes de finalizar.";
  }

  for (const item of itens) {
    if (item.precoUnitario <= 0) {
      return `O produto "${item.nome}" não possui preço de venda válido.`;
    }
    if (item.quantidade < 1) {
      return `A quantidade do produto "${item.nome}" deve ser ao menos 1.`;
    }
  }

  return null;
}
