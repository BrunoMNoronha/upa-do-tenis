"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { FilterChip } from "@/components/ui";
import { montarHrefFiltros } from "@/lib/filtros-url";

export type OpcaoChipFiltro = {
  label: string;
  /** Parâmetros aplicados (valor) ou removidos (`null`) ao clicar. */
  alteracoes: Record<string, string | null>;
  ativo: boolean;
};

type ChipsFiltroUrlProps = {
  opcoes: OpcaoChipFiltro[];
  "aria-label": string;
  /** Rótulo curto exibido antes dos chips (ex.: "Status"). */
  rotulo?: string;
};

/**
 * Grupo de chips cujos filtros vivem na URL: cada chip é um link que volta
 * para a página 1 e preserva busca e tamanho de página.
 */
export function ChipsFiltroUrl({ opcoes, rotulo, ...props }: ChipsFiltroUrlProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const atual = searchParams.toString();

  return (
    <div role="group" aria-label={props["aria-label"]} className="flex flex-wrap items-center gap-2">
      {rotulo ? <span className="mr-1 text-xs font-bold text-[color:var(--text-soft)]">{rotulo}</span> : null}
      {opcoes.map((opcao) => (
        <FilterChip key={opcao.label} href={montarHrefFiltros(pathname, atual, opcao.alteracoes)} active={opcao.ativo}>
          {opcao.label}
        </FilterChip>
      ))}
    </div>
  );
}
