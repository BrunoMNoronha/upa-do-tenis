import { resetarPagina } from "@/lib/paginacao";

type OpcoesControladorFiltrosUrl = {
  /** Query string vigente no momento da criação (sem `?`). */
  inicial: string;
  debounceMs: number;
  /** Recebe a query string resultante (sem `?`; vazia quando não há filtro). */
  navegar: (queryString: string) => void;
};

export type ControladorFiltrosUrl = {
  /** Informa a query string vigente quando a URL muda por fora (voltar/avançar, links). */
  sincronizar: (queryString: string) => void;
  /** Aplica (ou remove, com valor vazio/nulo) um filtro imediatamente e volta para a página 1. */
  aplicar: (chave: string, valor: string | null) => void;
  /** Como `aplicar`, mas com debounce; um novo agendamento substitui o anterior. */
  agendar: (chave: string, valor: string | null) => void;
  /** Remove os filtros informados e descarta qualquer agendamento pendente. */
  limpar: (chaves: readonly string[]) => void;
  cancelar: () => void;
};

/**
 * Controla os filtros de listagem mantidos na URL.
 *
 * Toda navegação parte do ÚLTIMO estado pedido, e não da URL capturada
 * quando o callback foi criado. Sem isso, uma busca com debounce pendente
 * dispara depois de "Limpar" (ou de outro filtro) usando parâmetros antigos
 * e desfaz a ação mais recente do usuário.
 */
export function criarControladorFiltrosUrl({
  inicial,
  debounceMs,
  navegar,
}: OpcoesControladorFiltrosUrl): ControladorFiltrosUrl {
  let estado = inicial;
  let pendente: ReturnType<typeof setTimeout> | null = null;

  const cancelar = () => {
    if (pendente) clearTimeout(pendente);
    pendente = null;
  };

  const ir = (params: URLSearchParams) => {
    estado = params.toString();
    navegar(estado);
  };

  const aplicar = (chave: string, valor: string | null) => {
    const params = resetarPagina(estado);
    if (valor) {
      params.set(chave, valor);
    } else {
      params.delete(chave);
    }
    ir(params);
  };

  return {
    sincronizar: (queryString) => {
      estado = queryString;
    },
    aplicar,
    agendar: (chave, valor) => {
      cancelar();
      pendente = setTimeout(() => {
        pendente = null;
        aplicar(chave, valor);
      }, debounceMs);
    },
    limpar: (chaves) => {
      cancelar();
      const params = resetarPagina(estado);
      chaves.forEach((chave) => params.delete(chave));
      ir(params);
    },
    cancelar,
  };
}

/**
 * Para um link que só acrescenta parâmetros à página atual (ex.: `?nova=1`),
 * devolve a URL vigente com esses parâmetros somados, preservando os filtros.
 * Devolve `null` quando o destino é outra página e a navegação comum se aplica.
 */
export function acrescentarParametrosNaPaginaAtual(href: string, urlAtual: string): string | null {
  const atual = new URL(urlAtual);
  const destino = new URL(href, atual);
  if (destino.origin !== atual.origin || destino.pathname !== atual.pathname) return null;
  destino.searchParams.forEach((valor, chave) => atual.searchParams.set(chave, valor));
  return atual.pathname + atual.search;
}
