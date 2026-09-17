import type { ReactNode } from "react";

import { Badge, Button } from "@/components/ui";
import { formatCurrency } from "@/lib/formatters";

export type VendaListagem = {
  id: string;
  numero: string;
  status: string;
  dataCancelamento?: Date | string | null;
  dataVenda: Date | string;
  valorTotal: number;
  formaPagamento: string;
  quantidadeItens: number;
  observacoes?: string | null;
};

const dataHora = (valor: Date | string) =>
  new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

/**
 * Card do histórico de vendas, sem estado (renderizável em teste). A ação de
 * cancelar entra por `acaoCancelar` e só aparece em venda não cancelada.
 */
export function VendaCardView({ venda, acaoCancelar }: { venda: VendaListagem; acaoCancelar?: ReactNode }) {
  const cancelada = venda.status === "CANCELADA";

  return (
    <article
      className={`rounded-3xl border border-black/10 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.03)] transition hover:border-[color:var(--accent-soft)] ${cancelada ? "bg-slate-50" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">{venda.numero}</p>
          <h3 className={`mt-2 text-lg font-semibold ${cancelada ? "text-slate-500 line-through" : "text-slate-800"}`}>
            {formatCurrency(venda.valorTotal)}
          </h3>
        </div>
        {cancelada ? <Badge tone="danger">Cancelada</Badge> : <Badge tone="success">Concluída</Badge>}
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-600">
        <p>
          <span className="font-semibold text-slate-700">Data:</span> {dataHora(venda.dataVenda)}
        </p>
        <p>
          <span className="font-semibold text-slate-700">Pagamento:</span> {venda.formaPagamento}
        </p>
        <p>
          <span className="font-semibold text-slate-700">Itens:</span> {venda.quantidadeItens}
        </p>
        {venda.observacoes && (
          <p className="truncate" title={venda.observacoes}>
            <span className="font-semibold text-slate-700">Obs:</span> {venda.observacoes}
          </p>
        )}
        {cancelada && venda.dataCancelamento ? (
          <p className="text-rose-800">
            <span className="font-semibold">Cancelada em</span> {dataHora(venda.dataCancelamento)}
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-2 border-t pt-4">
        <Button href={`/vendas/${venda.id}`} variant="secondary" className="w-full">
          Ver Detalhes
        </Button>
        {cancelada ? null : acaoCancelar}
      </div>
    </article>
  );
}
