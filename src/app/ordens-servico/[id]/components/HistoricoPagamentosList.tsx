import { Badge, Card, PanelHeader } from "@/components/ui";
import { Pagamento } from "../types";
import { currencyFormatter, dateFormatter } from "../utils";

export function HistoricoPagamentosList({ pagamentos }: { pagamentos: Pagamento[] }) {
  return (
    <Card className="p-6">
      <PanelHeader title="Pagamentos registrados" description={`${pagamentos.length} lançamento(s)`} />
      {pagamentos.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">Nenhum pagamento registrado até o momento.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {pagamentos.map((pagamento) => (
            <article key={pagamento.id} className="rounded-2xl border border-black/10 bg-white/80 p-3 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[color:var(--text)]">{currencyFormatter.format(Number(pagamento.valor || 0))}</p>
                <Badge tone="accent">{pagamento.formaPagamento?.nome || "Forma não informada"}</Badge>
              </div>
              <p className="mt-1">Tipo: {pagamento.tipo}</p>
              <p className="mt-1">Data: {dateFormatter.format(new Date(pagamento.dataPagamento))}</p>
              {pagamento.observacoes ? <p className="mt-1">Obs.: {pagamento.observacoes}</p> : null}
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
