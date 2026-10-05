"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui";
import { criarControladorFiltrosUrl } from "@/lib/filtros-url";

export const BUSCA_LISTAGEM_DEBOUNCE_MS = 350;

type BuscaListagemProps = {
  id: string;
  label: string;
  placeholder: string;
  /** Termo vigente, já normalizado pelo servidor a partir da URL. */
  busca: string;
};

/**
 * Campo de busca das listagens paginadas server-side. O input responde a
 * cada tecla localmente; a navegação (`?busca=`) é feita com debounce e
 * sempre volta para a página 1, preservando `pageSize` e demais filtros.
 */
export function BuscaListagem({ id, label, placeholder, busca }: BuscaListagemProps) {
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
    <div className="mb-6 flex gap-2">
      <Input
        id={id}
        type="search"
        aria-label={label}
        aria-busy={isPending || undefined}
        value={termo}
        onChange={(event) => aoDigitar(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="!border-white/20 !bg-white/10 !text-white placeholder:text-slate-400"
      />
      {termo ? (
        <button
          type="button"
          onClick={limpar}
          className="shrink-0 rounded-2xl border border-white/20 px-4 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          Limpar
        </button>
      ) : null}
    </div>
  );
}
