"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { PAGE_SIZE_OPCOES, calcularPaginasVisiveis, montarQueryPagina, type PaginacaoInfo } from "@/lib/paginacao";

type Tone = "light" | "dark";

type PaginacaoBaseProps = {
  pagination: PaginacaoInfo;
  /** Rótulo do que está sendo listado, no plural. Ex.: "ordens", "clientes". */
  rotulo?: string;
  /** @deprecated O design usa somente painéis claros; mantido até a migração dos cadastros. */
  tone?: Tone;
  /** Exibe seletor de tamanho de página. Padrão: true. */
  permitirTamanho?: boolean;
  /** Exibe o texto "Exibindo x–y de N". Padrão: true; desligue quando a tela já mostra o intervalo. */
  exibirResumo?: boolean;
  /** Desabilita os controles enquanto uma requisição está em curso. */
  carregando?: boolean;
  className?: string;
};

type PaginacaoLinksProps = PaginacaoBaseProps & {
  /** Monta a URL de destino de uma página; a navegação usa <Link>. */
  criarHref: (destino: { page: number; pageSize: number }) => string;
  onChange?: never;
};

type PaginacaoCallbackProps = PaginacaoBaseProps & {
  /** Chamado ao trocar de página/tamanho; a tela decide como recarregar. */
  onChange: (destino: { page: number; pageSize: number }) => void;
  criarHref?: never;
};

export type PaginacaoProps = PaginacaoLinksProps | PaginacaoCallbackProps;

const CONTROLE_BASE =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-[10px] border px-2.5 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]";

function classesControle(tone: Tone, desabilitado: boolean, atual = false) {
  const estado = desabilitado ? "cursor-not-allowed opacity-50 pointer-events-none" : "";
  if (atual) {
    return `${CONTROLE_BASE} border-[color:var(--ink)] bg-[color:var(--ink)] font-bold text-white ${estado}`;
  }
  const cor =
    tone === "dark"
      ? "border-white/20 text-white hover:bg-white/10"
      : "border-[color:var(--border-strong)] bg-white text-[color:var(--text)] hover:bg-[color:var(--surface-muted)]";
  return `${CONTROLE_BASE} ${cor} ${estado}`;
}

/** Intervalo "x–y" exibido para a página atual. */
export function intervaloExibido(pagination: PaginacaoInfo) {
  if (pagination.total === 0) {
    return { inicio: 0, fim: 0 };
  }
  const inicio = (pagination.page - 1) * pagination.pageSize + 1;
  const fim = Math.min(pagination.page * pagination.pageSize, pagination.total);
  return { inicio, fim };
}

/** Texto "Mostrando x–y de N" usado nos painéis de listagem. */
export function textoIntervalo(pagination: PaginacaoInfo) {
  if (pagination.total === 0) {
    return "Nenhum registro";
  }
  const { inicio, fim } = intervaloExibido(pagination);
  return `Mostrando ${inicio}–${fim} de ${pagination.total}`;
}

function SetaEsquerda() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function SetaDireita() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/**
 * Controles de paginação reutilizáveis: anterior/próxima, páginas numeradas
 * com reticências, indicador "x–y de total" e seletor de tamanho de página.
 *
 * - Modo URL (`criarHref`): renderiza <Link>, preserva histórico do browser
 *   (voltar/avançar) e funciona sem JavaScript.
 * - Modo callback (`onChange`): para telas que buscam dados via fetch.
 *
 * Trocar o tamanho da página sempre volta para a página 1.
 */
export function Paginacao(props: PaginacaoProps) {
  const {
    pagination,
    rotulo = "registros",
    tone = "light",
    permitirTamanho = true,
    exibirResumo = true,
    carregando = false,
    className = "",
  } = props;

  const { page, pageSize, total, totalPages } = pagination;
  const { inicio, fim } = intervaloExibido(pagination);
  const temAnterior = page > 1;
  const temProxima = page < totalPages;
  const textoSecundario = tone === "dark" ? "text-slate-300" : "text-[color:var(--text-soft)]";

  const renderizarControle = (
    destinoPage: number,
    habilitado: boolean,
    conteudo: React.ReactNode,
    ariaLabel: string,
    atual = false,
  ) => {
    const desabilitado = !habilitado || carregando;
    const classes = classesControle(tone, desabilitado, atual);

    if ("criarHref" in props && props.criarHref) {
      if (desabilitado) {
        return (
          <span aria-disabled="true" aria-label={ariaLabel} aria-current={atual ? "page" : undefined} className={classes}>
            {conteudo}
          </span>
        );
      }
      return (
        <Link
          href={props.criarHref({ page: destinoPage, pageSize })}
          aria-label={ariaLabel}
          aria-current={atual ? "page" : undefined}
          className={classes}
          scroll={false}
        >
          {conteudo}
        </Link>
      );
    }

    return (
      <button
        type="button"
        aria-label={ariaLabel}
        aria-current={atual ? "page" : undefined}
        className={classes}
        disabled={desabilitado}
        onClick={() => props.onChange?.({ page: destinoPage, pageSize })}
      >
        {conteudo}
      </button>
    );
  };

  const aoTrocarTamanho = (novoTamanho: number) => {
    if ("onChange" in props && props.onChange) {
      props.onChange({ page: 1, pageSize: novoTamanho });
    }
  };

  const paginas = calcularPaginasVisiveis(page, totalPages);

  return (
    <nav
      aria-label={`Paginação de ${rotulo}`}
      className={`flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <div className={`flex flex-wrap items-center gap-3 text-[13px] ${textoSecundario}`}>
        {exibirResumo ? (
          <p data-testid="paginacao-resumo">
            {total === 0 ? `Nenhum registro` : `Exibindo ${inicio}–${fim} de ${total} ${rotulo}`}
          </p>
        ) : null}

        {permitirTamanho ? (
          <label className="flex items-center gap-2.5 font-semibold">
            <span>Por página</span>
            {"criarHref" in props && props.criarHref ? (
              <SeletorTamanhoPorLink
                pageSize={pageSize}
                tone={tone}
                criarHref={props.criarHref}
                carregando={carregando}
              />
            ) : (
              <select
                aria-label="Registros por página"
                value={pageSize}
                disabled={carregando}
                onChange={(event) => aoTrocarTamanho(Number(event.target.value))}
                className={seletorClasses(tone)}
              >
                {PAGE_SIZE_OPCOES.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            )}
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {renderizarControle(page - 1, temAnterior, <SetaEsquerda />, "Página anterior")}
        {paginas.map((pagina, indice) =>
          pagina === "..." ? (
            <span key={`reticencias-${indice}`} aria-hidden="true" className={`px-1 text-[13px] ${textoSecundario}`}>
              …
            </span>
          ) : (
            <span key={pagina}>
              {renderizarControle(pagina, pagina !== page, String(pagina), `Página ${pagina}`, pagina === page)}
            </span>
          ),
        )}
        {renderizarControle(page + 1, temProxima, <SetaDireita />, "Próxima página")}
        <span className="sr-only" aria-live="polite">
          Página {page} de {totalPages}
        </span>
      </div>
    </nav>
  );
}

function seletorClasses(tone: Tone) {
  return tone === "dark"
    ? "h-9 rounded-[10px] border border-white/20 bg-transparent px-2.5 text-[13px] font-semibold text-white outline-none [&>option]:text-slate-900"
    : "h-9 rounded-[10px] border border-[color:var(--border-strong)] bg-white px-2.5 text-[13px] font-normal text-[color:var(--text)] outline-none focus:border-[color:var(--accent)]";
}

/**
 * No modo URL o <select> não pode ser um Link; navega via router.push para
 * manter o histórico (voltar/avançar) coerente com o restante da tela.
 */
function SeletorTamanhoPorLink({
  pageSize,
  tone,
  criarHref,
  carregando,
}: {
  pageSize: number;
  tone: Tone;
  criarHref: (destino: { page: number; pageSize: number }) => string;
  carregando: boolean;
}) {
  const router = useRouter();

  return (
    <select
      aria-label="Registros por página"
      value={pageSize}
      disabled={carregando}
      onChange={(event) => {
        router.push(criarHref({ page: 1, pageSize: Number(event.target.value) }), { scroll: false });
      }}
      className={seletorClasses(tone)}
    >
      {PAGE_SIZE_OPCOES.map((opcao) => (
        <option key={opcao} value={opcao}>
          {opcao}
        </option>
      ))}
    </select>
  );
}

/**
 * Hook para telas cuja paginação vive na URL (`?page=2&pageSize=20`).
 * Devolve `criarHref` (preserva busca/filtros existentes) e `irParaPagina`.
 */
export function usePaginacaoUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const criarHref = useCallback(
    (destino: { page: number; pageSize?: number }) => {
      const query = montarQueryPagina(searchParams.toString(), destino);
      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams],
  );

  const irParaPagina = useCallback(
    (destino: { page: number; pageSize?: number }) => {
      router.push(criarHref(destino), { scroll: false });
    },
    [criarHref, router],
  );

  return { criarHref, irParaPagina, searchParams, pathname };
}
