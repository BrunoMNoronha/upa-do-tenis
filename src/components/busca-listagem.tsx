"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui";
import { resetarPagina } from "@/lib/paginacao";

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
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Sincroniza o input quando a URL muda por fora (voltar/avançar, limpar).
    setTermo(busca);
  }, [busca]);

  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  const navegar = (valor: string) => {
    const params = resetarPagina(searchParams.toString());
    const limpo = valor.trim();
    if (limpo) {
      params.set("busca", limpo);
    } else {
      params.delete("busca");
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const aoDigitar = (valor: string) => {
    setTermo(valor);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => navegar(valor), BUSCA_LISTAGEM_DEBOUNCE_MS);
  };

  const limpar = () => {
    if (timeout.current) clearTimeout(timeout.current);
    setTermo("");
    navegar("");
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
