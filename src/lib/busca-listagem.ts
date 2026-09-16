/**
 * Busca textual local para listagens carregadas por completo no cliente
 * (Serviços, Produtos e Insumos). Somente leitura: não altera os itens.
 *
 * Normalização aplicada ao termo e aos campos:
 * - ignora maiúsculas/minúsculas;
 * - ignora espaços excedentes nas extremidades do termo;
 * - tolera acentos (`tenis` encontra `Tênis`, `cola` encontra `Colá`).
 */
export function normalizarTextoBusca(valor: string | null | undefined): string {
  if (!valor) return "";
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function filtrarPorBusca<T>(
  itens: readonly T[],
  termo: string,
  campos: (item: T) => Array<string | null | undefined>,
): T[] {
  const termoNormalizado = normalizarTextoBusca(termo);
  if (!termoNormalizado) return [...itens];

  return itens.filter((item) =>
    campos(item).some((campo) => normalizarTextoBusca(campo).includes(termoNormalizado)),
  );
}
