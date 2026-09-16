import { DashboardPanel } from "./DashboardPanel";
import type { ItemRanking } from "./dashboard-view-model";

interface DashboardInsumosMaisUtilizadosProps {
  /** Já ordenados pelo view model. O nome inclui a unidade, ex.: "Cola (ml)". */
  insumos: ItemRanking[];
}

const formatadorQuantidade = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/**
 * Top 5 de insumos consumidos no período, em ranking. Sem badge de estoque
 * (o contrato do dashboard não traz o status individual de cada insumo).
 */
export function DashboardInsumosMaisUtilizados({ insumos }: DashboardInsumosMaisUtilizadosProps) {
  return (
    <DashboardPanel
      title="Insumos mais utilizados"
      description="Top 5 no período · consumo por OS"
      action={{ href: "/relatorios/estoque", label: "Relatório" }}
      className="h-full"
    >
      {insumos.length === 0 ? (
        <p className="py-6 text-center text-sm text-[color:var(--text-soft)]">Nenhum insumo registrado no período.</p>
      ) : (
        <ol className="flex flex-col">
          {insumos.map((item, indice) => (
            <li
              key={item.id}
              className="flex items-center gap-3 border-b border-[color:var(--border)] py-2.5 last:border-b-0"
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-muted)] text-xs font-extrabold text-[color:var(--accent-strong)]"
                aria-label={`${indice + 1}º`}
              >
                {indice + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[color:var(--text)]" title={item.nome}>
                {item.nome}
              </span>
              <span className="shrink-0 text-[13px] font-extrabold text-[color:var(--text)]">
                {formatadorQuantidade.format(item.quantidade)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </DashboardPanel>
  );
}
