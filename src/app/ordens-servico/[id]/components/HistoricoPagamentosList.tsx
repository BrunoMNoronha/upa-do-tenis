"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Badge, Button, Card, Label, PanelHeader, Textarea } from "@/components/ui";
import { MOTIVO_ESTORNO_MAX, MOTIVO_ESTORNO_MIN } from "@/lib/ordens-servico-estornos-schema";
import { Pagamento } from "../types";
import { currencyFormatter, dateFormatter } from "../utils";

type HistoricoPagamentosViewProps = {
  pagamentos: Pagamento[];
  /** Falso em OS cancelada: nenhum pagamento pode ser estornado. */
  podeEstornar: boolean;
  onEstornar?: (pagamento: Pagamento) => void;
};

/** Lista de pagamentos, sem estado nem requisição (renderizável em teste). */
export function HistoricoPagamentosView({ pagamentos, podeEstornar, onEstornar }: HistoricoPagamentosViewProps) {
  return (
    <Card className="p-6">
      <PanelHeader title="Pagamentos registrados" description={`${pagamentos.length} lançamento(s)`} />
      {pagamentos.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">Nenhum pagamento registrado até o momento.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {pagamentos.map((pagamento) => {
            const estorno = pagamento.estorno;
            return (
              <article
                key={pagamento.id}
                className={`rounded-2xl border border-black/10 p-3 text-sm text-slate-700 ${estorno ? "bg-slate-50" : "bg-white/80"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className={`font-semibold ${estorno ? "text-slate-500 line-through" : "text-[color:var(--text)]"}`}>
                    {currencyFormatter.format(Number(pagamento.valor || 0))}
                  </p>
                  <Badge tone="accent">{pagamento.formaPagamento?.nome || "Forma não informada"}</Badge>
                </div>
                <div className={estorno ? "text-slate-500" : undefined}>
                  <p className="mt-1">Tipo: {pagamento.tipo}</p>
                  <p className="mt-1">Data: {dateFormatter.format(new Date(pagamento.dataPagamento))}</p>
                  {pagamento.observacoes ? <p className="mt-1">Obs.: {pagamento.observacoes}</p> : null}
                </div>
                {estorno ? (
                  <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-rose-800">
                    <strong>Estornado</strong> em {dateFormatter.format(new Date(estorno.dataEstorno))}
                    {estorno.usuario?.nome ? ` por ${estorno.usuario.nome}` : ""} — {estorno.motivo}
                  </p>
                ) : podeEstornar && onEstornar ? (
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      className="!text-rose-700"
                      aria-label={`Estornar pagamento de ${currencyFormatter.format(Number(pagamento.valor || 0))}`}
                      onClick={() => onEstornar(pagamento)}
                    >
                      Estornar
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}

type EstornarPagamentoDialogViewProps = {
  pagamento: Pagamento | null;
  motivo: string;
  erro: string | null;
  enviando: boolean;
  onMotivoChange: (motivo: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
};

/** Diálogo de estorno sem requisição (renderizável em teste). */
export function EstornarPagamentoDialogView({
  pagamento,
  motivo,
  erro,
  enviando,
  onMotivoChange,
  onConfirmar,
  onCancelar,
}: EstornarPagamentoDialogViewProps) {
  const motivoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!pagamento) return;
    motivoRef.current?.focus();
    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCancelar();
    };
    document.addEventListener("keydown", aoPressionarTecla);
    return () => document.removeEventListener("keydown", aoPressionarTecla);
  }, [pagamento, onCancelar]);

  if (!pagamento) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancelar}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="estornar-pagamento-titulo"
        className="w-full max-w-md rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_40px_rgba(31,41,55,0.25)]"
        onClick={(evento) => evento.stopPropagation()}
        onSubmit={(evento) => {
          evento.preventDefault();
          onConfirmar();
        }}
      >
        <h2 id="estornar-pagamento-titulo" className="text-xl font-semibold tracking-tight text-[color:var(--text)]">
          Estornar pagamento?
        </h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-slate-700">
          <dt className="text-slate-500">Valor</dt>
          <dd className="font-semibold">{currencyFormatter.format(Number(pagamento.valor || 0))}</dd>
          <dt className="text-slate-500">Forma</dt>
          <dd>{pagamento.formaPagamento?.nome || "Forma não informada"}</dd>
          <dt className="text-slate-500">Data</dt>
          <dd>{dateFormatter.format(new Date(pagamento.dataPagamento))}</dd>
        </dl>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          O valor sai do caixa aberto, na mesma forma de pagamento, e volta a constar como saldo da OS. O estorno não
          pode ser desfeito.
        </p>

        <div className="mt-4 space-y-2">
          <Label htmlFor="estornar-pagamento-motivo">Motivo do estorno</Label>
          <Textarea
            id="estornar-pagamento-motivo"
            ref={motivoRef}
            required
            rows={3}
            maxLength={MOTIVO_ESTORNO_MAX}
            value={motivo}
            disabled={enviando}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "estornar-pagamento-erro" : undefined}
            onChange={(evento) => onMotivoChange(evento.target.value)}
          />
        </div>

        {erro ? (
          <p id="estornar-pagamento-erro" role="alert" className="mt-3 text-sm font-medium text-rose-700">
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

export function validarMotivoEstorno(motivo: string): string | null {
  const aparado = motivo.trim();
  if (aparado.length < MOTIVO_ESTORNO_MIN) {
    return `Informe o motivo do estorno (ao menos ${MOTIVO_ESTORNO_MIN} caracteres).`;
  }
  if (aparado.length > MOTIVO_ESTORNO_MAX) {
    return `O motivo do estorno deve ter no máximo ${MOTIVO_ESTORNO_MAX} caracteres.`;
  }
  return null;
}

export function HistoricoPagamentosList({
  ordemServicoId,
  pagamentos,
  podeEstornar,
  onEstornado,
}: {
  ordemServicoId: string;
  pagamentos: Pagamento[];
  podeEstornar: boolean;
  onEstornado: () => Promise<void>;
}) {
  const [pagamentoEstornando, setPagamentoEstornando] = useState<Pagamento | null>(null);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const cancelar = useCallback(() => {
    if (enviando) return;
    setPagamentoEstornando(null);
  }, [enviando]);

  const abrir = (pagamento: Pagamento) => {
    setMotivo("");
    setErro(null);
    setSucesso(null);
    setPagamentoEstornando(pagamento);
  };

  const confirmar = async () => {
    if (!pagamentoEstornando || enviando) return;
    const erroValidacao = validarMotivoEstorno(motivo);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const response = await fetch(
        `/api/ordens-servico/${ordemServicoId}/pagamentos/${pagamentoEstornando.id}/estorno`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motivo: motivo.trim() }),
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setErro(payload?.message || "Não foi possível estornar o pagamento.");
        return;
      }
    } catch {
      setErro("Falha de comunicação ao estornar o pagamento.");
      return;
    } finally {
      setEnviando(false);
    }

    // O estorno já foi gravado: confirma antes de atualizar a tela, e uma falha
    // na atualização não é apresentada como falha do estorno.
    setPagamentoEstornando(null);
    setSucesso("Pagamento estornado.");
    try {
      await onEstornado();
    } catch {
      setSucesso("Pagamento estornado. Não foi possível atualizar a tela; recarregue a página para ver os valores.");
    }
  };

  return (
    <>
      <HistoricoPagamentosView pagamentos={pagamentos} podeEstornar={podeEstornar} onEstornar={abrir} />
      {sucesso ? (
        <p role="status" className="text-sm font-medium text-emerald-700">
          {sucesso}
        </p>
      ) : null}
      <EstornarPagamentoDialogView
        pagamento={pagamentoEstornando}
        motivo={motivo}
        erro={erro}
        enviando={enviando}
        onMotivoChange={(valor) => {
          setMotivo(valor);
          setErro(null);
        }}
        onConfirmar={() => void confirmar()}
        onCancelar={cancelar}
      />
    </>
  );
}
