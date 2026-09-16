import Link from "next/link";

import { DashboardPanel } from "./DashboardPanel";
import type { ItemFila, StatusOperacionalId } from "./dashboard-view-model";

type DashboardFilaOrdensProps = {
  fila: ItemFila[];
  /** Soma dos quatro status operacionais. */
  total: number;
};

/** Cor de cada status, usada na barra e no marcador dos mini cards. */
const corStatus: Record<StatusOperacionalId, string> = {
  ABERTA: "bg-[color:var(--warning)]",
  EM_ANDAMENTO: "bg-[color:var(--accent)]",
  CONCLUIDA: "bg-[color:var(--success)]",
  ENTREGUE: "bg-[color:var(--neutral-bar)]",
};

const HREF_ATRASADAS = "/ordens-servico?atrasadas=true";

function IconeRelogio() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/**
 * Card consolidado da fila operacional: barra segmentada proporcional e um
 * mini card por status, cada um levando à listagem já filtrada.
 */
export function DashboardFilaOrdens({ fila, total }: DashboardFilaOrdensProps) {
  const resumo =
    total === 0
      ? "Nenhuma ordem de serviço entrou no período."
      : fila.map((item) => `${item.rotulo}: ${item.quantidade} (${item.percentual}%)`).join(", ");

  return (
    <DashboardPanel
      title="Fila de ordens de serviço"
      description="Status operacional das OS que entraram no período"
      action={{ href: "/ordens-servico", label: "Ver todas" }}
      className="h-full"
    >
      {/* Barra segmentada: o resumo textual acessível está no aria-label. */}
      <div
        role="img"
        aria-label={`Distribuição da fila. ${resumo}`}
        className="flex h-3 gap-[3px] overflow-hidden rounded-full bg-[color:var(--surface-muted)]"
      >
        {total > 0
          ? fila
              .filter((item) => item.quantidade > 0)
              .map((item) => (
                <div
                  key={item.id}
                  className={`${corStatus[item.id]} h-full`}
                  style={{ width: `${(item.quantidade / total) * 100}%` }}
                />
              ))
          : null}
      </div>

      <ul className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {fila.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              aria-label={`${item.rotulo}: ${item.quantidade} ${item.quantidade === 1 ? "ordem" : "ordens"} de serviço. ${item.descricao}`}
              className="flex h-full flex-col gap-1 rounded-[14px] bg-[color:var(--background)] px-3.5 py-3 transition hover:bg-[color:var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-[color:var(--text-soft)]">
                <span className={`h-2 w-2 shrink-0 rounded-full ${corStatus[item.id]}`} aria-hidden="true" />
                {item.rotulo}
              </span>
              <span className="text-2xl font-extrabold leading-none text-[color:var(--text)]">{item.quantidade}</span>
              <span className="text-xs text-[color:var(--text-soft)]">{item.descricao}</span>
            </Link>
          </li>
        ))}
      </ul>

      {total === 0 ? (
        <p className="text-[13px] text-[color:var(--text-soft)]">{resumo}</p>
      ) : null}

      {/* A contagem de atrasadas não existe no contrato do dashboard: só o link. */}
      <div className="mt-auto flex items-center justify-between gap-3 rounded-xl border border-[color:var(--danger)]/20 bg-[color:var(--danger-soft)] px-3.5 py-2">
        <span className="flex items-center gap-2 text-[13px] font-bold text-[color:var(--danger)]">
          <IconeRelogio />
          OS atrasadas
        </span>
        <Link
          href={HREF_ATRASADAS}
          className="inline-flex min-h-[44px] items-center whitespace-nowrap text-[13px] font-bold text-[color:var(--danger)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--danger)]/40"
        >
          Ver OS atrasadas<span aria-hidden="true" className="ml-1">→</span>
        </Link>
      </div>
    </DashboardPanel>
  );
}
