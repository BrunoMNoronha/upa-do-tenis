"use client";

import Link from "next/link";
import { useEffect, useRef, type Ref } from "react";

import { Button } from "@/components/ui";
import {
  montarSugestaoAvaliacao,
  type DadosSugestaoAvaliacao,
} from "@/lib/os-avaliacao-whatsapp";

type SugerirWhatsAppAvaliacaoProps = {
  dados: DadosSugestaoAvaliacao | null;
  onFechar: () => void;
};

/**
 * Marcação do diálogo de avaliação, sem efeitos colaterais: permite testes unitários diretos.
 */
export function SugerirWhatsAppAvaliacaoView({
  dados,
  onFechar,
  fecharRef,
}: SugerirWhatsAppAvaliacaoProps & { fecharRef?: Ref<HTMLButtonElement> }) {
  if (!dados) {
    return null;
  }

  const {
    mensagem,
    telefoneFormatado,
    urlWhatsApp,
    temLinkConfigurado,
    temTelefoneValido,
  } = montarSugestaoAvaliacao(dados);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sugerir-whatsapp-avaliacao-titulo"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_40px_rgba(31,41,55,0.25)]"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2
          id="sugerir-whatsapp-avaliacao-titulo"
          className="text-xl font-semibold tracking-tight text-[color:var(--text)]"
        >
          Solicitar avaliação no Google
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          OS <strong className="text-[color:var(--text)]">{dados.numeroOS}</strong> — {dados.nomeCliente}
          {telefoneFormatado ? ` · ${telefoneFormatado}` : ""}. A entrega foi confirmada. Deseja enviar o convite de avaliação pelo WhatsApp?
        </p>

        {temLinkConfigurado && mensagem ? (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Mensagem sugerida
            </p>
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-2xl border border-black/10 bg-white/80 p-3 font-sans text-sm leading-6 text-slate-700">
              {mensagem}
            </pre>
          </>
        ) : (
          <div
            role="status"
            className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <p className="font-semibold">Link de avaliação não configurado</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              Para enviar o convite com o link direto da sua empresa, cadastre a URL em{" "}
              <Link
                href="/configuracoes"
                onClick={onFechar}
                className="font-bold underline hover:text-amber-950"
              >
                Configurações
              </Link>
              . A OS permanece entregue normalmente.
            </p>
          </div>
        )}

        {!temTelefoneValido ? (
          <p role="status" className="mt-3 text-sm text-amber-700">
            O cliente não tem telefone válido para WhatsApp. A OS continua entregue normalmente.
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button ref={fecharRef} type="button" variant="secondary" onClick={onFechar}>
            Agora não
          </Button>
          {urlWhatsApp ? (
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
 * Sugere ao operador pedir avaliação no Google ao entregar a OS via WhatsApp Click to Chat.
 * Não envia nada automaticamente, e fechar o diálogo não altera a entrega da OS.
 */
export function SugerirWhatsAppAvaliacaoDialog({
  dados,
  onFechar,
}: SugerirWhatsAppAvaliacaoProps) {
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

  return (
    <SugerirWhatsAppAvaliacaoView
      dados={dados}
      onFechar={onFechar}
      fecharRef={fecharRef}
    />
  );
}
