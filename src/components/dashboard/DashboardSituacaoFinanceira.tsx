import Link from "next/link";

import { formatCurrency } from "@/lib/formatters";
import { DashboardPanel } from "./DashboardPanel";
import type { ItemSituacaoFinanceira, StatusFinanceiroId } from "./dashboard-view-model";

type DashboardSituacaoFinanceiraProps = {
  itens: ItemSituacaoFinanceira[];
  /** Total de OS com situação financeira apurada. */
  total: number;
  percentualPagas: number;
  /** Saldo em aberto no período (totalPendente da API). */
  totalPendente: number;
};

const corStatus: Record<StatusFinanceiroId, { stroke: string; swatch: string }> = {
  PAGAS: { stroke: "var(--success)", swatch: "bg-[color:var(--success)]" },
  PARCIAIS: { stroke: "var(--warning)", swatch: "bg-[color:var(--warning)]" },
  PENDENTES: { stroke: "var(--danger)", swatch: "bg-[color:var(--danger)]" },
};

const TAMANHO = 112;
const RAIO = 46;
const ESPESSURA = 14;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

/**
 * Situação financeira das OS em donut SVG (sem biblioteca), com percentual
 * de pagas no centro, legenda com links filtrados e saldo em aberto.
 */
export function DashboardSituacaoFinanceira({
  itens,
  total,
  percentualPagas,
  totalPendente,
}: DashboardSituacaoFinanceiraProps) {
  const resumo =
    total === 0
      ? "Nenhuma OS com valor no período."
      : `${percentualPagas}% pagas. ${itens.map((item) => `${item.rotulo}: ${item.quantidade}`).join(", ")}.`;

  let acumulado = 0;
  const segmentos = itens
    .filter((item) => item.quantidade > 0 && total > 0)
    .map((item) => {
      const comprimento = (item.quantidade / total) * CIRCUNFERENCIA;
      const segmento = { id: item.id, comprimento, deslocamento: -acumulado };
      acumulado += comprimento;
      return segmento;
    });

  return (
    <DashboardPanel
      title="Situação financeira das OS"
      description="Pagamento das OS não canceladas"
      action={{ href: "/relatorios/financeiro-os", label: "Relatório" }}
      className="h-full"
    >
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="relative h-28 w-28 shrink-0">
          <svg width={TAMANHO} height={TAMANHO} viewBox={`0 0 ${TAMANHO} ${TAMANHO}`} role="img" aria-label={resumo}>
            <circle cx={TAMANHO / 2} cy={TAMANHO / 2} r={RAIO} fill="none" stroke="var(--surface-muted)" strokeWidth={ESPESSURA} />
            {segmentos.map((segmento) => (
              <circle
                key={segmento.id}
                cx={TAMANHO / 2}
                cy={TAMANHO / 2}
                r={RAIO}
                fill="none"
                stroke={corStatus[segmento.id].stroke}
                strokeWidth={ESPESSURA}
                strokeDasharray={`${segmento.comprimento} ${CIRCUNFERENCIA}`}
                strokeDashoffset={segmento.deslocamento}
                transform={`rotate(-90 ${TAMANHO / 2} ${TAMANHO / 2})`}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
            <span className="text-[22px] font-extrabold leading-none text-[color:var(--text)]">{percentualPagas}%</span>
            <span className="text-[11px] font-semibold text-[color:var(--text-soft)]">pagas</span>
          </div>
        </div>

        <ul className="flex w-full flex-col gap-1">
          {itens.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-label={`${item.rotulo}: ${item.quantidade} ${item.quantidade === 1 ? "ordem" : "ordens"} de serviço (${item.percentual}%)`}
                className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg px-1 transition hover:bg-[color:var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
              >
                <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-600">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${corStatus[item.id].swatch}`} aria-hidden="true" />
                  {item.rotulo}
                </span>
                <span className="text-[15px] font-extrabold text-[color:var(--text)]">{item.quantidade}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {total === 0 ? <p className="text-[13px] text-[color:var(--text-soft)]">{resumo}</p> : null}

      <div className="mt-auto flex items-center justify-between border-t border-[color:var(--border)] pt-3.5">
        <span className="text-[13px] text-[color:var(--text-soft)]">Saldo em aberto</span>
        <span className="text-[15px] font-extrabold text-[color:var(--warning)]">{formatCurrency(totalPendente)}</span>
      </div>
    </DashboardPanel>
  );
}
