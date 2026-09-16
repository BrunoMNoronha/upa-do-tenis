/**
 * Busca textual das listagens paginadas (Serviços, Produtos e Insumos).
 *
 * O termo entra no `where` ANTES da paginação, e o mesmo `where` alimenta
 * `count` e `findMany`, para que total e páginas reflitam o resultado
 * filtrado. Somente leitura: nenhum saldo, preço ou movimentação é tocado.
 *
 * Normalização: ignora maiúsculas/minúsculas (`mode: "insensitive"`) e
 * espaços nas extremidades. Tolerância a acentos (`tenis` encontrar
 * `Tênis`) exigiria a extensão `unaccent` ou coluna normalizada no
 * Postgres, ou seja, mudança de banco; por isso NÃO é aplicada
 * (limitação documentada na issue #187).
 */
export function normalizarTermoBusca(termo: string | null | undefined): string {
  return (termo ?? "").trim();
}

type CondicaoContains = Record<string, { contains: string; mode: "insensitive" }>;

/**
 * Monta a cláusula `OR` de busca parcial, case-insensitive, nos campos
 * informados. Retorna `undefined` quando não há termo, para que o chamador
 * não acrescente condição alguma.
 */
export function montarCondicaoBusca(
  termo: string | null | undefined,
  campos: readonly string[],
): { OR: CondicaoContains[] } | undefined {
  const termoLimpo = normalizarTermoBusca(termo);
  if (!termoLimpo || campos.length === 0) {
    return undefined;
  }

  return {
    OR: campos.map((campo) => ({ [campo]: { contains: termoLimpo, mode: "insensitive" as const } })),
  };
}

/** Lê o parâmetro `busca` de searchParams (URLSearchParams ou objeto de página). */
export function lerBuscaDeSearchParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): string {
  const valor = searchParams instanceof URLSearchParams ? searchParams.get("busca") : searchParams["busca"];
  return normalizarTermoBusca(typeof valor === "string" ? valor : "");
}
