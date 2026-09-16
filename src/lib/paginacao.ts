/**
 * Paginação padronizada das listagens.
 *
 * Contrato de resposta:
 *   { data: T[], pagination: { page, pageSize, total, totalPages } }
 *
 * Regras:
 * - page >= 1 (valores inválidos caem para 1);
 * - pageSize padrão 20, máximo 100 (valores inválidos caem para o padrão);
 * - skip = (page - 1) * pageSize.
 *
 * As funções aqui são puras e não dependem de banco: os serviços de cada
 * módulo aplicam `skip`/`take` na própria consulta e usam o MESMO `where`
 * para `findMany` e `count`.
 */

export const PAGE_SIZE_PADRAO = 20;
export const PAGE_SIZE_MAXIMO = 100;
export const PAGE_SIZE_OPCOES = [10, 20, 50, 100] as const;

export type PaginacaoEntrada = {
  page?: string | number | null;
  pageSize?: string | number | null;
};

export type PaginacaoNormalizada = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export type PaginacaoInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ResultadoPaginado<T> = {
  data: T[];
  pagination: PaginacaoInfo;
};

function paraInteiro(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const numero = typeof valor === "number" ? valor : Number(String(valor).trim());
  if (!Number.isFinite(numero) || !Number.isInteger(numero)) {
    return null;
  }

  return numero;
}

/**
 * Normaliza page/pageSize vindos de query string ou de objetos soltos.
 * Nunca lança: entradas inválidas caem nos padrões seguros.
 */
export function normalizarPaginacao(entrada?: PaginacaoEntrada): PaginacaoNormalizada {
  const pageBruta = paraInteiro(entrada?.page);
  const pageSizeBruto = paraInteiro(entrada?.pageSize);

  const page = pageBruta !== null && pageBruta >= 1 ? pageBruta : 1;
  const pageSize =
    pageSizeBruto !== null && pageSizeBruto >= 1
      ? Math.min(pageSizeBruto, PAGE_SIZE_MAXIMO)
      : PAGE_SIZE_PADRAO;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/** Lê page/pageSize de um URLSearchParams (rotas de API e páginas). */
export function lerPaginacaoDeSearchParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): PaginacaoNormalizada {
  const ler = (chave: string): string | null => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(chave);
    }
    const valor = searchParams[chave];
    return typeof valor === "string" ? valor : null;
  };

  return normalizarPaginacao({ page: ler("page"), pageSize: ler("pageSize") });
}

export function calcularTotalPaginas(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(total / pageSize));
}

export function montarPaginacaoInfo(params: {
  page: number;
  pageSize: number;
  total: number;
}): PaginacaoInfo {
  return {
    page: params.page,
    pageSize: params.pageSize,
    total: params.total,
    totalPages: calcularTotalPaginas(params.total, params.pageSize),
  };
}

/**
 * Executa `contar` e `buscar` com a mesma paginação. Se a página pedida
 * ficou além da última (ex.: registro excluído enquanto o usuário estava na
 * última página), refaz a busca na última página válida em vez de devolver
 * uma lista vazia enganosa. `contar` e `buscar` devem usar o MESMO filtro.
 */
export async function paginarConsulta<T>(params: {
  paginacao: PaginacaoNormalizada;
  contar: () => Promise<number>;
  buscar: (intervalo: { skip: number; take: number }) => Promise<T[]>;
}): Promise<ResultadoPaginado<T>> {
  const { paginacao } = params;

  const [total, dados] = await Promise.all([
    params.contar(),
    params.buscar({ skip: paginacao.skip, take: paginacao.take }),
  ]);

  const totalPages = calcularTotalPaginas(total, paginacao.pageSize);

  if (dados.length === 0 && total > 0 && paginacao.page > totalPages) {
    const ultima = normalizarPaginacao({ page: totalPages, pageSize: paginacao.pageSize });
    const dadosUltima = await params.buscar({ skip: ultima.skip, take: ultima.take });

    return {
      data: dadosUltima,
      pagination: montarPaginacaoInfo({ page: ultima.page, pageSize: ultima.pageSize, total }),
    };
  }

  return {
    data: dados,
    pagination: montarPaginacaoInfo({ page: paginacao.page, pageSize: paginacao.pageSize, total }),
  };
}

/**
 * Monta a query string de uma página preservando os demais parâmetros
 * (busca, filtros, ordenação). `page=1` e `pageSize` padrão são omitidos
 * para manter URLs limpas. Retorna a string sem o "?" inicial.
 */
export function montarQueryPagina(
  atual: URLSearchParams | string,
  destino: { page?: number; pageSize?: number },
): string {
  const params = new URLSearchParams(typeof atual === "string" ? atual : atual.toString());

  if (destino.pageSize !== undefined) {
    const normalizado = normalizarPaginacao({ pageSize: destino.pageSize }).pageSize;
    if (normalizado === PAGE_SIZE_PADRAO) {
      params.delete("pageSize");
    } else {
      params.set("pageSize", String(normalizado));
    }
  }

  const page = destino.page ?? 1;
  if (page <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(page));
  }

  return params.toString();
}

/**
 * Ao alterar busca, filtro ou ordenação, a página volta para 1: remove o
 * parâmetro `page` e mantém o restante (inclusive `pageSize`).
 */
export function resetarPagina(atual: URLSearchParams | string): URLSearchParams {
  const params = new URLSearchParams(typeof atual === "string" ? atual : atual.toString());
  params.delete("page");
  return params;
}
