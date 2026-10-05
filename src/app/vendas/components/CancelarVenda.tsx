"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Label, Textarea } from "@/components/ui";
import { formatCurrency } from "@/lib/formatters";
import { MOTIVO_ESTORNO_MAX, MOTIVO_ESTORNO_MIN } from "@/lib/ordens-servico-estornos-schema";

export type VendaParaCancelar = {
  id: string;
  numero: string;
  valorTotal: number;
  formaPagamento: string;
  quantidadeItens: number;
};

export function validarMotivoCancelamento(motivo: string): string | null {
  const aparado = motivo.trim();
  if (aparado.length < MOTIVO_ESTORNO_MIN) {
    return `Informe o motivo do cancelamento (ao menos ${MOTIVO_ESTORNO_MIN} caracteres).`;
  }
  if (aparado.length > MOTIVO_ESTORNO_MAX) {
    return `O motivo do cancelamento deve ter no máximo ${MOTIVO_ESTORNO_MAX} caracteres.`;
  }
  return null;
}

type CancelarVendaDialogViewProps = {
  venda: VendaParaCancelar | null;
  motivo: string;
  erro: string | null;
  enviando: boolean;
  onMotivoChange: (motivo: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
};

/** Diálogo de cancelamento total, sem requisição (renderizável em teste). */
export function CancelarVendaDialogView({
  venda,
  motivo,
  erro,
  enviando,
  onMotivoChange,
  onConfirmar,
  onCancelar,
}: CancelarVendaDialogViewProps) {
  const motivoRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Última versão do callback, sem reiniciar o efeito (e a contenção de foco)
  // a cada mudança de `enviando`.
  const onCancelarRef = useRef(onCancelar);
  onCancelarRef.current = onCancelar;
  const aberto = venda !== null;

  useEffect(() => {
    if (!aberto) return;
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    motivoRef.current?.focus();

    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        onCancelarRef.current();
        return;
      }
      if (evento.key !== "Tab" || !formRef.current) return;

      // Contém o foco no diálogo: Tab no último volta ao primeiro e vice-versa,
      // para não alcançar ações de outras vendas por trás do overlay.
      const focaveis = Array.from(formRef.current.querySelectorAll<HTMLElement>(SELETOR_FOCAVEIS));
      if (focaveis.length === 0) {
        evento.preventDefault();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;
      const dentro = atual instanceof Node && formRef.current.contains(atual);

      if (evento.shiftKey && (!dentro || atual === primeiro)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (!dentro || atual === ultimo)) {
        evento.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener("keydown", aoPressionarTecla);
    return () => {
      document.removeEventListener("keydown", aoPressionarTecla);
      // Devolve o foco a quem abriu o diálogo, se ainda estiver na página.
      if (focoAnterior?.isConnected) focoAnterior.focus();
    };
  }, [aberto]);

  if (!venda) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancelar}>
      <form
        ref={formRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancelar-venda-titulo"
        className="w-full max-w-md rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-left shadow-[0_20px_40px_rgba(31,41,55,0.25)]"
        onClick={(evento) => evento.stopPropagation()}
        onSubmit={(evento) => {
          evento.preventDefault();
          onConfirmar();
        }}
      >
        <h2 id="cancelar-venda-titulo" className="text-xl font-semibold tracking-tight text-[color:var(--text)]">
          Cancelar venda {venda.numero}?
        </h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-slate-700">
          <dt className="text-slate-500">Total</dt>
          <dd className="font-semibold">{formatCurrency(venda.valorTotal)}</dd>
          <dt className="text-slate-500">Forma</dt>
          <dd>{venda.formaPagamento}</dd>
          <dt className="text-slate-500">Itens</dt>
          <dd>{venda.quantidadeItens}</dd>
        </dl>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          A venda inteira é cancelada: os produtos voltam ao estoque e o total sai do caixa aberto, na mesma forma de
          pagamento. A venda continua no histórico como cancelada. O cancelamento não pode ser desfeito.
        </p>

        <div className="mt-4 space-y-2">
          <Label htmlFor="cancelar-venda-motivo">Motivo do cancelamento</Label>
          <Textarea
            id="cancelar-venda-motivo"
            ref={motivoRef}
            required
            rows={3}
            maxLength={MOTIVO_ESTORNO_MAX}
            value={motivo}
            disabled={enviando}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "cancelar-venda-erro" : undefined}
            onChange={(evento) => onMotivoChange(evento.target.value)}
          />
        </div>

        {erro ? (
          <p id="cancelar-venda-erro" role="alert" className="mt-3 text-sm font-medium text-rose-700">
            {erro}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" disabled={enviando} onClick={onCancelar}>
            Voltar
          </Button>
          <Button type="submit" isLoading={enviando} className="!bg-rose-600 hover:!bg-rose-700">
            Confirmar cancelamento
          </Button>
        </div>
      </form>
    </div>
  );
}

const SELETOR_FOCAVEIS =
  'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Estado e envio do cancelamento com UM diálogo para a tela inteira: na lista,
 * abrir outra venda substitui a selecionada em vez de empilhar diálogos.
 */
export function useCancelamentoVenda() {
  const router = useRouter();
  const [venda, setVenda] = useState<VendaParaCancelar | null>(null);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const abrir = useCallback((selecionada: VendaParaCancelar) => {
    setMotivo("");
    setErro(null);
    setSucesso(null);
    setVenda(selecionada);
  }, []);

  const fechar = useCallback(() => {
    if (enviando) return;
    setVenda(null);
  }, [enviando]);

  const confirmar = async () => {
    if (!venda || enviando) return;
    const erroValidacao = validarMotivoCancelamento(motivo);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const response = await fetch(`/api/vendas/${venda.id}/cancelamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setErro(payload?.message || "Não foi possível cancelar a venda.");
        return;
      }
    } catch {
      setErro("Falha de comunicação ao cancelar a venda.");
      return;
    } finally {
      setEnviando(false);
    }

    // O cancelamento já foi gravado: confirma e recarrega do servidor.
    setSucesso(`Venda ${venda.numero} cancelada.`);
    setVenda(null);
    router.refresh();
  };

  const dialogo = (
    <CancelarVendaDialogView
      venda={venda}
      motivo={motivo}
      erro={erro}
      enviando={enviando}
      onMotivoChange={(valor) => {
        setMotivo(valor);
        setErro(null);
      }}
      onConfirmar={() => void confirmar()}
      onCancelar={fechar}
    />
  );

  const avisoSucesso = sucesso ? (
    <p role="status" className="text-sm font-medium text-emerald-700">
      {sucesso}
    </p>
  ) : null;

  return { abrir, dialogo, avisoSucesso };
}

/** Botão que abre o diálogo compartilhado de cancelamento. */
export function BotaoCancelarVenda({
  venda,
  onAbrir,
  className,
}: {
  venda: VendaParaCancelar;
  onAbrir: (venda: VendaParaCancelar) => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      className={`!text-rose-700 ${className ?? ""}`}
      aria-label={`Cancelar venda ${venda.numero}`}
      onClick={() => onAbrir(venda)}
    >
      Cancelar venda
    </Button>
  );
}

/** Uso isolado (detalhe da venda): botão, aviso e diálogo próprios. */
export function CancelarVendaBotao({ venda, className }: { venda: VendaParaCancelar; className?: string }) {
  const { abrir, dialogo, avisoSucesso } = useCancelamentoVenda();

  return (
    <>
      <BotaoCancelarVenda venda={venda} onAbrir={abrir} className={className} />
      {avisoSucesso}
      {dialogo}
    </>
  );
}
