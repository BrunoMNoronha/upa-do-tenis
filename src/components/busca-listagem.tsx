"use client";

import { Input } from "@/components/ui";

type BuscaListagemProps = {
  id: string;
  label: string;
  placeholder: string;
  valor: string;
  onChange: (valor: string) => void;
};

/**
 * Campo de busca padrão das listagens escuras (Serviços, Produtos, Insumos).
 * A filtragem em si é feita pelo chamador com `filtrarPorBusca`.
 */
export function BuscaListagem({ id, label, placeholder, valor, onChange }: BuscaListagemProps) {
  return (
    <div className="mb-6 flex gap-2">
      <Input
        id={id}
        type="search"
        aria-label={label}
        value={valor}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="!border-white/20 !bg-white/10 !text-white placeholder:text-slate-400"
      />
      {valor ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="shrink-0 rounded-2xl border border-white/20 px-4 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          Limpar
        </button>
      ) : null}
    </div>
  );
}
