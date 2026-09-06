"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui";

type ConfirmDialogProps = {
  aberto: boolean;
  titulo: string;
  descricao: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  tone?: "danger" | "default";
  onConfirmar: () => void;
  onCancelar: () => void;
};

/**
 * Confirmação modal reutilizável para ações destrutivas (excluir, inativar).
 * Não conhece a entidade nem executa requisição: apenas confirma ou cancela.
 */
export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  tone = "default",
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  const cancelarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) {
      return;
    }

    cancelarRef.current?.focus();

    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        onCancelar();
      }
    };

    document.addEventListener("keydown", aoPressionarTecla);

    return () => {
      document.removeEventListener("keydown", aoPressionarTecla);
    };
  }, [aberto, onCancelar]);

  if (!aberto) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancelar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-titulo"
        aria-describedby="confirm-dialog-descricao"
        className="w-full max-w-md rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_40px_rgba(31,41,55,0.25)]"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 id="confirm-dialog-titulo" className="text-xl font-semibold tracking-tight text-[color:var(--text)]">
          {titulo}
        </h2>
        <p id="confirm-dialog-descricao" className="mt-3 text-sm leading-6 text-slate-600">
          {descricao}
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button ref={cancelarRef} type="button" variant="secondary" onClick={onCancelar}>
            {textoCancelar}
          </Button>
          <Button
            type="button"
            className={tone === "danger" ? "!bg-rose-600 hover:!bg-rose-700" : undefined}
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
