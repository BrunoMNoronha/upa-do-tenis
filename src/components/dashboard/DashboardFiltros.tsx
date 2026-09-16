import { DateRangePicker } from "@/components/date-range-picker";
import { formatarDataLocal } from "@/lib/date-range";
import {
  PRESETS_PERIODO,
  calcularPeriodoPreset,
  identificarPreset,
  type PresetPeriodo,
} from "./dashboard-period-presets";

interface DashboardFiltrosProps {
  inicio: string;
  fim: string;
  /** Atualiza as datas sem consultar (edição manual → "Personalizado"). */
  onPeriodoChange: (inicio: string, fim: string) => void;
  /** Aplica o período e dispara uma única consulta. */
  onAplicarPeriodo: (inicio: string, fim: string) => void;
  loading: boolean;
}

export function DashboardFiltros({
  inicio,
  fim,
  onPeriodoChange,
  onAplicarPeriodo,
  loading,
}: DashboardFiltrosProps) {
  const presetAtivo = identificarPreset({ inicio, fim });

  const currentRange = {
    from: inicio ? new Date(`${inicio}T00:00:00`) : undefined,
    to: fim ? new Date(`${fim}T23:59:59`) : undefined,
  };

  const aplicarPreset = (preset: PresetPeriodo) => {
    const periodo = calcularPeriodoPreset(preset);
    onAplicarPeriodo(periodo.inicio, periodo.fim);
  };

  return (
    <section
      aria-label="Período do dashboard"
      className="flex flex-col gap-4 rounded-[var(--r-card)] border border-[color:var(--border)] bg-white p-4 lg:flex-row lg:items-start lg:justify-between"
    >
      <div
        role="group"
        aria-label="Atalhos de período"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0"
      >
        {PRESETS_PERIODO.map((preset) => {
          const ativo = presetAtivo === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={ativo}
              disabled={loading}
              onClick={() => aplicarPreset(preset.id)}
              className={`inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 ${
                ativo
                  ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-white"
                  : "border-[color:var(--border)] bg-white text-[color:var(--text-soft)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]"
              }`}
            >
              {preset.rotulo}
            </button>
          );
        })}
        {/* Indicador de estado (não é ação): fica ativo ao editar as datas manualmente. */}
        <span
          role="status"
          className={`relative inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-[13px] font-semibold ${
            presetAtivo === "personalizado"
              ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-white"
              : "border-dashed border-[color:var(--border)] bg-white text-[color:var(--text-soft)]"
          }`}
        >
          Personalizado
          {presetAtivo === "personalizado" ? <span className="sr-only"> (período ativo)</span> : null}
        </span>
      </div>

      <DateRangePicker
        value={currentRange}
        onChange={(range) => {
          onPeriodoChange(
            range.from ? formatarDataLocal(range.from) : "",
            range.to ? formatarDataLocal(range.to) : ""
          );
        }}
        onApply={() => onAplicarPeriodo(inicio, fim)}
        applying={loading}
        hidePresets
        variant="inline"
        className="lg:items-end"
      />
    </section>
  );
}
