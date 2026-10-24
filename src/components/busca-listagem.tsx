"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SearchInput } from "@/components/ui";
import { criarControladorFiltrosUrl } from "@/lib/filtros-url";

export const BUSCA_LISTAGEM_DEBOUNCE_MS = 350;

type BuscaListagemProps = {
  id: string;
  label: string;
  placeholder: string;
  /** Termo vigente, já normalizado pelo servidor a partir da URL. */
  busca: string;
  className?: string;
};

/**
 * Campo de busca das listagens paginadas server-side. O input responde a
 * cada tecla localmente; a navegação (`?busca=`) é feita com debounce e
 * sempre volta para a página 1, preservando `pageSize` e demais filtros.
 */
export function BuscaListagem({ id, label, placeholder, busca, className }: BuscaListagemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [termo, setTermo] = useState(busca);
  // A navegação parte do último estado pedido, não da URL capturada quando o
  // debounce foi agendado; assim a busca não desfaz um filtro aplicado depois.
  const [filtrosUrl] = useState(() =>
    criarControladorFiltrosUrl({
      inicial: searchParams.toString(),
      debounceMs: BUSCA_LISTAGEM_DEBOUNCE_MS,
      navegar: (qs) => {
        startTransition(() => {
          router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        });
      },
    }),
  );

  useEffect(() => {
    // Sincroniza o input quando a URL muda por fora (voltar/avançar, limpar).
    setTermo(busca);
  }, [busca]);

  useEffect(() => {
    filtrosUrl.sincronizar(searchParams.toString());
  }, [filtrosUrl, searchParams]);

  useEffect(() => filtrosUrl.cancelar, [filtrosUrl]);

  const aoDigitar = (valor: string) => {
    setTermo(valor);
    filtrosUrl.agendar("busca", valor.trim());
  };

  const limpar = () => {
    setTermo("");
    filtrosUrl.limpar(["busca"]);
  };

  return (
    <SearchInput
      id={id}
      label={label}
      value={termo}
      onChange={aoDigitar}
      onClear={limpar}
      placeholder={placeholder}
      isPending={isPending}
      className={className}
    />
  );
}
