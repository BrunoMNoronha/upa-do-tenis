import { DashboardPanel } from "./DashboardPanel";
import type { ItemRanking } from "./dashboard-view-model";

interface DashboardServicosMaisExecutadosProps {
  /** Já ordenados e normalizados pelo view model (maior = 100). */
  servicos: ItemRanking[];
}

/** Top 5 de serviços com barras proporcionais ao item mais executado. */
export function DashboardServicosMaisExecutados({ servicos }: DashboardServicosMaisExecutadosProps) {
  return (
    <DashboardPanel title="Serviços mais executados" description="Top 5 no período" className="h-full">
      {servicos.length === 0 ? (
        <p className="py-6 text-center text-sm text-[color:var(--text-soft)]">Nenhum serviço registrado no período.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {servicos.map((item) => (
            <li key={item.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate font-semibold text-[color:var(--text)]" title={item.nome}>
                  {item.nome}
                </span>
                <span className="shrink-0 font-extrabold text-[color:var(--text)]">
                  {item.quantidade}
                  <span className="sr-only"> {item.quantidade === 1 ? "execução" : "execuções"}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-[color:var(--surface-muted)]" aria-hidden="true">
                <div
                  className="h-2 rounded-full bg-[color:var(--accent)]"
                  style={{ width: `${Math.max(item.proporcao, 2)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </DashboardPanel>
  );
}
