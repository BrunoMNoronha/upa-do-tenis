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

  useEffect(() => {
    if (!venda) return;
    motivoRef.current?.focus();
    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCancelar();
    };
    document.addEventListener("keydown", aoPressionarTecla);
    return () => document.removeEventListener("keydown", aoPressionarTecla);
  }, [venda, onCancelar]);

  if (!venda) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancelar}>
      <form
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
          <Button type="submit" disabled={enviando} className="!bg-rose-600 hover:!bg-rose-700">
            {enviando ? "Cancelando..." : "Confirmar cancelamento"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Botão "Cancelar venda" com diálogo; recarrega os dados do servidor depois. */
export function CancelarVendaBotao({ venda, className }: { venda: VendaParaCancelar; className?: string }) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const fechar = useCallback(() => {
    if (enviando) return;
    setAberta(false);
  }, [enviando]);

  const confirmar = async () => {
    if (enviando) return;
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
    setAberta(false);
    setSucesso(`Venda ${venda.numero} cancelada.`);
    router.refresh();
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={`!text-rose-700 ${className ?? ""}`}
        aria-label={`Cancelar venda ${venda.numero}`}
        onClick={() => {
          setMotivo("");
          setErro(null);
          setSucesso(null);
          setAberta(true);
        }}
      >
        Cancelar venda
      </Button>
      {sucesso ? (
        <p role="status" className="text-sm font-medium text-emerald-700">
          {sucesso}
        </p>
      ) : null}
      <CancelarVendaDialogView
        venda={aberta ? venda : null}
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
    </>
  );
}
