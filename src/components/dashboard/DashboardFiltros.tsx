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
      className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
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
              className={`inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)] disabled:cursor-not-allowed disabled:opacity-60 ${
                ativo
                  ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-white"
                  : "border-[color:var(--border-strong)] bg-white text-[color:var(--text-body)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]"
              }`}
            >
              {preset.rotulo}
            </button>
          );
        })}
        {/* Período editado manualmente: nenhum atalho fica ativo; o estado é anunciado. */}
        {presetAtivo === "personalizado" ? (
          <span role="status" className="sr-only">Período personalizado ativo</span>
        ) : null}
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
        variant="linha"
      />
    </section>
  );
}
