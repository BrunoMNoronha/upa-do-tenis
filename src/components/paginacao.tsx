"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { PAGE_SIZE_OPCOES, montarQueryPagina, type PaginacaoInfo } from "@/lib/paginacao";

type Tone = "light" | "dark";

type PaginacaoBaseProps = {
  pagination: PaginacaoInfo;
  /** Rótulo do que está sendo listado, no plural. Ex.: "ordens", "clientes". */
  rotulo?: string;
  tone?: Tone;
  /** Exibe seletor de tamanho de página. Padrão: true. */
  permitirTamanho?: boolean;
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

function classesControle(tone: Tone, desabilitado: boolean) {
  const base =
    "inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]";
  const estado = desabilitado ? "cursor-not-allowed opacity-50 pointer-events-none" : "";
  const cor =
    tone === "dark"
      ? "border-white/20 text-white hover:bg-white/10"
      : "border-black/10 bg-white text-slate-700 hover:border-[color:var(--accent-soft)] hover:bg-[color:var(--accent-tint)]";
  return `${base} ${cor} ${estado}`;
}

function intervaloExibido(pagination: PaginacaoInfo) {
  if (pagination.total === 0) {
    return { inicio: 0, fim: 0 };
  }
  const inicio = (pagination.page - 1) * pagination.pageSize + 1;
  const fim = Math.min(pagination.page * pagination.pageSize, pagination.total);
  return { inicio, fim };
}

/**
 * Controles de paginação reutilizáveis: anterior/próxima, primeira/última,
 * indicador "x–y de total" e seletor de tamanho de página.
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
    carregando = false,
    className = "",
  } = props;

  const { page, pageSize, total, totalPages } = pagination;
  const { inicio, fim } = intervaloExibido(pagination);
  const temAnterior = page > 1;
  const temProxima = page < totalPages;
  const textoSecundario = tone === "dark" ? "text-slate-300" : "text-slate-600";

  const renderizarControle = (
    destinoPage: number,
    habilitado: boolean,
    conteudo: React.ReactNode,
    ariaLabel: string,
  ) => {
    const desabilitado = !habilitado || carregando;
    const classes = classesControle(tone, desabilitado);

    if ("criarHref" in props && props.criarHref) {
      if (desabilitado) {
        return (
          <span aria-disabled="true" aria-label={ariaLabel} className={classes}>
            {conteudo}
          </span>
        );
      }
      return (
        <Link
          href={props.criarHref({ page: destinoPage, pageSize })}
          aria-label={ariaLabel}
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

  return (
    <nav
      aria-label={`Paginação de ${rotulo}`}
      className={`flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <p className={`text-xs ${textoSecundario}`} data-testid="paginacao-resumo">
        {total === 0
          ? `Nenhum registro`
          : `Exibindo ${inicio}–${fim} de ${total} ${rotulo}`}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {permitirTamanho ? (
          <label className={`flex items-center gap-2 text-xs ${textoSecundario}`}>
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

        {renderizarControle(1, temAnterior, "«", "Primeira página")}
        {renderizarControle(page - 1, temAnterior, "Anterior", "Página anterior")}
        <span className={`px-2 text-xs font-semibold ${tone === "dark" ? "text-white" : "text-[color:var(--text)]"}`} aria-current="page">
          Página {page} de {totalPages}
        </span>
        {renderizarControle(page + 1, temProxima, "Próxima", "Próxima página")}
        {renderizarControle(totalPages, temProxima, "»", "Última página")}
      </div>
    </nav>
  );
}

function seletorClasses(tone: Tone) {
  return tone === "dark"
    ? "rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-xs font-semibold text-white outline-none [&>option]:text-slate-900"
    : "rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none";
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
