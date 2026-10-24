/**
 * Soma `preço × quantidade` arredondada para centavos. Indicador de tela
 * (valor em estoque a preço de venda, custo em estoque); não alimenta
 * nenhum lançamento financeiro. Aceita Decimal do Prisma, string ou number.
 */
export function somarValorEstoque(itens: ReadonlyArray<{ preco: unknown; quantidade: unknown }>): number {
  const soma = itens.reduce((acumulado, item) => acumulado + Number(item.preco) * Number(item.quantidade), 0);
  return Math.round(soma * 100) / 100;
}
