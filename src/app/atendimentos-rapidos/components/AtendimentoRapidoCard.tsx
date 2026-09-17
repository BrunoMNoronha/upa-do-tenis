"use client";

import { useEffect, useRef } from "react";

import { Badge, Button, Label, Textarea } from "@/components/ui";
import type { AtendimentoRapidoListagem } from "@/lib/atendimento-rapido";
import { formatarCentavos, paraCentavos } from "@/lib/centavos";
import { MOTIVO_ESTORNO_MAX } from "@/lib/ordens-servico-estornos-schema";

const dataHoraFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export const moeda = (valor: number) => formatarCentavos(paraCentavos(valor) ?? 0);

type AtendimentoRapidoCardViewProps = {
  atendimento: AtendimentoRapidoListagem;
  onEstornar?: (atendimento: AtendimentoRapidoListagem) => void;
};

/** Card do histórico, sem estado nem requisição (renderizável em teste). */
export function AtendimentoRapidoCardView({ atendimento, onEstornar }: AtendimentoRapidoCardViewProps) {
  const estorno = atendimento.estorno;

  return (
    <article
      className={`rounded-3xl border border-black/10 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.03)] ${estorno ? "bg-slate-50" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
            {atendimento.codigo}
          </p>
          <p className="mt-1 text-sm text-slate-500">{dataHoraFormatter.format(new Date(atendimento.dataHora))}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className={`text-lg font-semibold ${estorno ? "text-slate-500 line-through" : "text-slate-800"}`}>
            {moeda(atendimento.valorTotal)}
          </p>
          {estorno ? <Badge tone="danger">Estornado</Badge> : null}
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-700">Serviços</p>
        <ul className="mt-1 space-y-1">
          {atendimento.itens.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>{item.descricao}</span>
              <span className="whitespace-nowrap">{moeda(item.valor)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 text-sm text-slate-600">
        <p className="font-semibold text-slate-700">Pagamento</p>
        <ul className="mt-1 space-y-1">
          {atendimento.pagamentos.map((pagamento) => (
            <li key={pagamento.id} className="flex justify-between gap-3">
              <span>{pagamento.formaPagamento.nome}</span>
              <span className="whitespace-nowrap">{moeda(pagamento.valor)}</span>
            </li>
          ))}
        </ul>
      </div>

      {atendimento.observacoes ? (
        <p className="mt-3 truncate text-sm text-slate-600" title={atendimento.observacoes}>
          <span className="font-semibold text-slate-700">Obs:</span> {atendimento.observacoes}
        </p>
      ) : null}

      {estorno ? (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <strong>Estornado</strong> em {dataHoraFormatter.format(new Date(estorno.dataEstorno))} — {estorno.motivo}
        </p>
      ) : onEstornar ? (
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            className="!text-rose-700"
            aria-label={`Estornar atendimento ${atendimento.codigo}`}
            onClick={() => onEstornar(atendimento)}
          >
            Estornar
          </Button>
        </div>
      ) : null}
    </article>
  );
}

type EstornarAtendimentoRapidoDialogViewProps = {
  atendimento: AtendimentoRapidoListagem | null;
  motivo: string;
  erro: string | null;
  enviando: boolean;
  onMotivoChange: (motivo: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
};

/** Diálogo de estorno total, sem requisição (renderizável em teste). */
export function EstornarAtendimentoRapidoDialogView({
  atendimento,
  motivo,
  erro,
  enviando,
  onMotivoChange,
  onConfirmar,
  onCancelar,
}: EstornarAtendimentoRapidoDialogViewProps) {
  const motivoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!atendimento) return;
    motivoRef.current?.focus();
    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCancelar();
    };
    document.addEventListener("keydown", aoPressionarTecla);
    return () => document.removeEventListener("keydown", aoPressionarTecla);
  }, [atendimento, onCancelar]);

  if (!atendimento) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancelar}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="estornar-atendimento-titulo"
        className="w-full max-w-md rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_40px_rgba(31,41,55,0.25)]"
        onClick={(evento) => evento.stopPropagation()}
        onSubmit={(evento) => {
          evento.preventDefault();
          onConfirmar();
        }}
      >
        <h2 id="estornar-atendimento-titulo" className="text-xl font-semibold tracking-tight text-[color:var(--text)]">
          Estornar atendimento {atendimento.codigo}?
        </h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-slate-700">
          <dt className="text-slate-500">Total</dt>
          <dd className="font-semibold">{moeda(atendimento.valorTotal)}</dd>
          {atendimento.pagamentos.map((pagamento) => (
            <div key={pagamento.id} className="contents">
              <dt className="text-slate-500">{pagamento.formaPagamento.nome}</dt>
              <dd>{moeda(pagamento.valor)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Todos os pagamentos são estornados: cada valor sai do caixa aberto, na mesma forma de pagamento. O
          atendimento continua no histórico como estornado. O estorno não pode ser desfeito.
        </p>

        <div className="mt-4 space-y-2">
          <Label htmlFor="estornar-atendimento-motivo">Motivo do estorno</Label>
          <Textarea
            id="estornar-atendimento-motivo"
            ref={motivoRef}
            required
            rows={3}
            maxLength={MOTIVO_ESTORNO_MAX}
            value={motivo}
            disabled={enviando}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "estornar-atendimento-erro" : undefined}
            onChange={(evento) => onMotivoChange(evento.target.value)}
          />
        </div>

        {erro ? (
          <p id="estornar-atendimento-erro" role="alert" className="mt-3 text-sm font-medium text-rose-700">
            {erro}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" disabled={enviando} onClick={onCancelar}>
            Voltar
          </Button>
          <Button type="submit" disabled={enviando} className="!bg-rose-600 hover:!bg-rose-700">
            {enviando ? "Estornando..." : "Confirmar estorno"}
          </Button>
        </div>
      </form>
    </div>
  );
}
