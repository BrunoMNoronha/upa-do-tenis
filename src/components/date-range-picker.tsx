"use client";

import { useEffect, useState, useId } from "react";
import { Button, Input, Label } from "@/components/ui";
import { calcularIntervaloPreset, formatarDataLocal, parseDataLocal, type PresetIntervalo } from "@/lib/date-range";

export type DateRange = {
  from?: Date;
  to?: Date;
};

type DateRangePickerProps = {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  /** Quando informado, exibe um botão de ação que dispara a busca com o período atual. */
  onApply?: () => void;
  /** Chamado (além de onChange) quando o usuário limpa o período. */
  onClear?: () => void;
  applyLabel?: string;
  applying?: boolean;
  className?: string;
  /** Oculta os atalhos internos (Hoje, Última semana...) quando a tela já oferece presets próprios. */
  hidePresets?: boolean;
  /** "card" (padrão) desenha borda e fundo; "inline" só os campos, para compor com outros controles. */
  variant?: "card" | "inline";
};

const periodoFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

export function DateRangePicker({
  value,
  onChange,
  onApply,
  onClear,
  applyLabel = "Filtrar",
  applying = false,
  className = "",
  hidePresets = false,
  variant = "card",
}: DateRangePickerProps) {
  const idPrefix = useId();
  const [from, setFrom] = useState<string>(
    value?.from ? formatarDataLocal(value.from) : ""
  );
  const [to, setTo] = useState<string>(
    value?.to ? formatarDataLocal(value.to) : ""
  );

  useEffect(() => {
    setFrom(value?.from ? formatarDataLocal(value.from) : "");
    setTo(value?.to ? formatarDataLocal(value.to) : "");
  }, [value?.from, value?.to]);

  const applyRange = (f: string, t: string) => {
    setFrom(f);
    setTo(t);
    onChange({
      from: f ? new Date(`${f}T00:00:00`) : undefined,
      to: t ? new Date(`${t}T23:59:59`) : undefined,
    });
  };

  const handlePreset = (preset: PresetIntervalo) => {
    const { inicio, fim } = calcularIntervaloPreset(preset);
    applyRange(inicio, fim);
  };

  const handleLimpar = () => {
    applyRange("", "");
    onClear?.();
  };

  const periodoLegivel = from && to
    ? `${periodoFormatter.format(parseDataLocal(from))} – ${periodoFormatter.format(parseDataLocal(to))}`
    : "Nenhum período selecionado";

  return (
    <div
      className={`flex flex-col gap-4 ${
        variant === "card" ? "rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4" : ""
      } ${className}`}
    >
      {!hidePresets && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => handlePreset("hoje")} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]">Hoje</button>
          <button type="button" onClick={() => handlePreset("semana")} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]">Última semana</button>
          <button type="button" onClick={() => handlePreset("mes")} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]">Último mês</button>
          <button type="button" onClick={() => handlePreset("mesAtual")} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]">Mês atual</button>
          <button type="button" onClick={handleLimpar} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]">Limpar</button>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-inicio`} className="text-xs">Data inicial</Label>
          <Input
            id={`${idPrefix}-inicio`}
            type="date"
            value={from}
            onChange={(e) => applyRange(e.target.value, to)}
            className="w-40"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-fim`} className="text-xs">Data final</Label>
          <Input
            id={`${idPrefix}-fim`}
            type="date"
            value={to}
            onChange={(e) => applyRange(from, e.target.value)}
            className="w-40"
          />
        </div>
        {onApply && (
          <Button type="button" onClick={onApply} isLoading={applying} className="h-11">
            {applyLabel}
          </Button>
        )}
      </div>

      <p className="text-xs text-slate-500">Período: {periodoLegivel}</p>
    </div>
  );
}
