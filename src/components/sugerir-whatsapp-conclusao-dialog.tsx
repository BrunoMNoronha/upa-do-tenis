"use client";

import { useEffect, useRef, type Ref } from "react";

import { Button } from "@/components/ui";
import { montarSugestaoConclusao, type DadosSugestaoConclusao } from "@/lib/os-conclusao-whatsapp";

type SugerirWhatsAppConclusaoProps = {
  dados: DadosSugestaoConclusao | null;
  onFechar: () => void;
};

/**
 * Marcação do diálogo, sem efeitos: permite testar o conteúdo renderizado.
 */
export function SugerirWhatsAppConclusaoView({
  dados,
  onFechar,
  fecharRef,
}: SugerirWhatsAppConclusaoProps & { fecharRef?: Ref<HTMLButtonElement> }) {
  if (!dados) {
    return null;
  }

  const { mensagem, telefoneFormatado, urlWhatsApp } = montarSugestaoConclusao(dados);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sugerir-whatsapp-conclusao-titulo"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_40px_rgba(31,41,55,0.25)]"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 id="sugerir-whatsapp-conclusao-titulo" className="text-xl font-semibold tracking-tight text-[color:var(--text)]">
          Ordem de serviço concluída
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          OS <strong className="text-[color:var(--text)]">{dados.numeroOS}</strong> — {dados.nomeCliente}
          {telefoneFormatado ? ` · ${telefoneFormatado}` : ""}. Deseja avisar o cliente pelo WhatsApp?
        </p>

        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Mensagem sugerida</p>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded-2xl border border-black/10 bg-white/80 p-3 font-sans text-sm leading-6 text-slate-700">
          {mensagem}
        </pre>

        {!urlWhatsApp ? (
          <p role="status" className="mt-3 text-sm text-amber-700">
            O cliente não tem telefone válido para WhatsApp. A OS continua concluída normalmente.
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button ref={fecharRef} type="button" variant="secondary" onClick={onFechar}>
            Agora não
          </Button>
          {urlWhatsApp ? (
            // Link com alvo nomeado: abre só por clique do operador, não sofre
            // bloqueio de pop-up e clique duplo reaproveita a mesma aba.
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

/**
 * Sugere ao operador avisar o cliente da conclusão da OS via WhatsApp.
 * Nada é enviado automaticamente, e fechar o diálogo não afeta a OS.
 */
export function SugerirWhatsAppConclusaoDialog({ dados, onFechar }: SugerirWhatsAppConclusaoProps) {
  const fecharRef = useRef<HTMLButtonElement>(null);
  const aberto = dados !== null;

  useEffect(() => {
    if (!aberto) {
      return;
    }

    fecharRef.current?.focus();

    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        onFechar();
      }
    };

    document.addEventListener("keydown", aoPressionarTecla);
    return () => document.removeEventListener("keydown", aoPressionarTecla);
  }, [aberto, onFechar]);

  return <SugerirWhatsAppConclusaoView dados={dados} onFechar={onFechar} fecharRef={fecharRef} />;
}
