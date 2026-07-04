"use client";

import { useEffect, useState } from "react";
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
}: DateRangePickerProps) {
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
    <div className={`flex flex-col gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 ${className}`}>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => handlePreset("hoje")} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-200">Hoje</button>
        <button type="button" onClick={() => handlePreset("semana")} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-200">Última semana</button>
        <button type="button" onClick={() => handlePreset("mes")} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-200">Último mês</button>
        <button type="button" onClick={() => handlePreset("mesAtual")} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-200">Mês atual</button>
        <button type="button" onClick={handleLimpar} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200">Limpar</button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label className="text-xs">Data inicial</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => applyRange(e.target.value, to)}
            className="w-40"
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Data final</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => applyRange(from, e.target.value)}
            className="w-40"
          />
        </div>
        {onApply && (
          <Button type="button" onClick={onApply} disabled={applying} className="h-11">
            {applying ? "Carregando..." : applyLabel}
          </Button>
        )}
      </div>

      <p className="text-xs text-slate-500">Período: {periodoLegivel}</p>
    </div>
  );
}
