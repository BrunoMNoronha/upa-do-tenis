/**
 * Lógica pura do carrinho de venda de balcão.
 *
 * Todas as funções são puras (sem efeitos colaterais) para permitir
 * testes unitários com Vitest puro, sem necessidade de DOM ou mocks de React.
 *
 * Regras de negócio da venda (preço, estoque, caixa) continuam no backend
 * (src/lib/vendas.ts). Aqui apenas o estado local da interface, para UX.
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

// ── Resultado tipado para operações com possível restrição ──────────────────

export type ResultadoAdicionar =
  | { ok: true; itens: ItemCarrinho[] }
  | { ok: false; motivo: string; itens: ItemCarrinho[] };

// ── Funções puras ───────────────────────────────────────────────────────────

/**
 * Tenta adicionar um produto ao carrinho.
 *
 * Restrições verificadas (UX — não substituem validação do backend):
 * - Produto com preço <= 0: bloqueado.
 * - Produto com estoque <= 0: bloqueado (se `estoqueDisponivel` fornecido e >= 0).
 * - Quantidade no carrinho não pode ultrapassar `estoqueDisponivel`.
 *
 * @param estoqueDisponivel  Quantidade física em estoque. Passe `null` para ignorar o limite.
 * @param qtd                Incremento desejado (padrão: 1).
 */
export function adicionarItem(
  itens: ItemCarrinho[],
  produto: { id: string; nome: string; precoVenda: number },
  estoqueDisponivel: number | null = null,
  qtd = 1,
): ResultadoAdicionar {
  // Bloqueio: preço inválido
  if (produto.precoVenda <= 0) {
    return {
      ok: false,
      motivo: `"${produto.nome}" não possui preço de venda configurado.`,
      itens,
    };
  }

  // Bloqueio: sem estoque
  if (estoqueDisponivel !== null && estoqueDisponivel <= 0) {
    return {
      ok: false,
      motivo: `"${produto.nome}" está sem estoque.`,
      itens,
    };
  }

  const existente = itens.find((i) => i.produtoId === produto.id);
  const qtdAtual = existente?.quantidade ?? 0;
  const novaQtd = qtdAtual + qtd;

  // Bloqueio: limite de estoque
  if (estoqueDisponivel !== null && novaQtd > estoqueDisponivel) {
    const limite = estoqueDisponivel - qtdAtual;
    if (limite <= 0) {
      return {
        ok: false,
        motivo: `"${produto.nome}" atingiu o limite de estoque disponível (${estoqueDisponivel} un).`,
        itens,
      };
    }
    // Adiciona apenas até o limite
    const qtdPermitida = limite;
    if (existente) {
      return {
        ok: true,
        itens: itens.map((i) =>
          i.produtoId === produto.id ? { ...i, quantidade: estoqueDisponivel } : i,
        ),
      };
    }
    return {
      ok: true,
      itens: [
        ...itens,
        {
          produtoId: produto.id,
          nome: produto.nome,
          precoUnitario: produto.precoVenda,
          quantidade: qtdPermitida,
        },
      ],
    };
  }

  if (existente) {
    return {
      ok: true,
      itens: itens.map((i) =>
        i.produtoId === produto.id ? { ...i, quantidade: novaQtd } : i,
      ),
    };
  }

  return {
    ok: true,
    itens: [
      ...itens,
      {
        produtoId: produto.id,
        nome: produto.nome,
        precoUnitario: produto.precoVenda,
        quantidade: qtd,
      },
    ],
  };
}

/**
 * Ajusta a quantidade de um item no carrinho.
 * Quantidade mínima: 1.
 * Quantidade máxima: `estoqueMaximo` (se fornecido e > 0).
 * Se o item não existir, retorna a lista inalterada.
 */
export function ajustarQuantidade(
  itens: ItemCarrinho[],
  produtoId: string,
  novaQuantidade: number,
  estoqueMaximo: number | null = null,
): ItemCarrinho[] {
  if (novaQuantidade < 1) return itens;
  const qtdFinal =
    estoqueMaximo !== null && novaQuantidade > estoqueMaximo
      ? estoqueMaximo
      : novaQuantidade;

  return itens.map((i) =>
    i.produtoId === produtoId ? { ...i, quantidade: qtdFinal } : i,
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
