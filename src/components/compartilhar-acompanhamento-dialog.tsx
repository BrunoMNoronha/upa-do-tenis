"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui";
import { montarSugestaoAcompanhamento } from "@/lib/os-acompanhamento-whatsapp";

export type DadosCompartilhamentoAcompanhamento = {
  numeroOS: string;
  nomeCliente: string;
  telefone: string | null | undefined;
  caminhoAcompanhamento: string;
  nomeExibicaoEmpresa?: string;
};

type CompartilharAcompanhamentoDialogProps = {
  dados: DadosCompartilhamentoAcompanhamento | null;
  titulo?: string;
  onFechar: () => void;
};

/**
 * Sugere ao operador o envio do link público de acompanhamento via WhatsApp
 * (Click to Chat). Nada é enviado automaticamente: o `wa.me` só abre por
 * clique explícito, e fechar o diálogo não tem nenhum efeito sobre a OS.
 */
export function CompartilharAcompanhamentoDialog({
  dados,
  titulo = "Ordem de serviço criada",
  onFechar,
}: CompartilharAcompanhamentoDialogProps) {
  const fecharRef = useRef<HTMLButtonElement>(null);
  const [origem, setOrigem] = useState("");
  const [copia, setCopia] = useState<"ok" | "erro" | null>(null);

  useEffect(() => {
    setOrigem(window.location.origin);
  }, []);

  // Depende só de abrir/fechar: um novo objeto `dados` a cada render do pai
  // não deve reiniciar o foco nem apagar o aviso de "Link copiado".
  const aberto = dados !== null;

  useEffect(() => {
    if (!aberto) {
      return;
    }

    setCopia(null);
    fecharRef.current?.focus();

    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        onFechar();
      }
    };

    document.addEventListener("keydown", aoPressionarTecla);
    return () => document.removeEventListener("keydown", aoPressionarTecla);
  }, [aberto, onFechar]);

  if (!dados || !origem) {
    return null;
  }

  const { linkAcompanhamento, mensagem, urlWhatsApp } = montarSugestaoAcompanhamento({
    origem,
    ...dados,
  });

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkAcompanhamento);
      setCopia("ok");
    } catch {
      setCopia("erro");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compartilhar-acompanhamento-titulo"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_40px_rgba(31,41,55,0.25)]"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 id="compartilhar-acompanhamento-titulo" className="text-xl font-semibold tracking-tight text-[color:var(--text)]">
          {titulo}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          OS <strong className="text-[color:var(--text)]">{dados.numeroOS}</strong> — {dados.nomeCliente}. Envie ao
          cliente o link para acompanhar o andamento.
        </p>

        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Mensagem sugerida</p>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded-2xl border border-black/10 bg-white/80 p-3 font-sans text-sm leading-6 text-slate-700">
          {mensagem}
        </pre>

        {!urlWhatsApp ? (
          <p role="status" className="mt-3 text-sm text-amber-700">
            O cliente não tem telefone válido para WhatsApp. Copie o link e envie por outro canal.
          </p>
        ) : null}
        {copia === "ok" ? (
          <p role="status" className="mt-3 text-sm text-emerald-700">Link copiado.</p>
        ) : null}
        {copia === "erro" ? (
          <p role="alert" className="mt-3 break-all text-sm text-rose-700">
            Não foi possível copiar automaticamente. Link: {linkAcompanhamento}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button ref={fecharRef} type="button" variant="secondary" onClick={onFechar}>
            Agora não
          </Button>
          <Button type="button" variant="secondary" onClick={() => void copiarLink()}>
            Copiar link
          </Button>
          {urlWhatsApp ? (
            // Alvo nomeado: clique duplo reaproveita a mesma aba em vez de abrir duas.
            <a
              href={urlWhatsApp}
              target="upa-whatsapp"
              rel="noopener noreferrer"
              onClick={onFechar}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
            >
              Abrir WhatsApp
            </a>
          ) : (
            <Button type="button" disabled aria-disabled="true">
              Abrir WhatsApp
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
