"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { formatarDataLocal } from "@/lib/date-range";

export type DateRange = {
  from?: Date;
  to?: Date;
};

type DateRangePickerProps = {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
};

export function DateRangePicker({ value, onChange, className = "" }: DateRangePickerProps) {
  const [from, setFrom] = useState<string>(
    value?.from ? formatarDataLocal(value.from) : ""
  );
  const [to, setTo] = useState<string>(
    value?.to ? formatarDataLocal(value.to) : ""
  );

  const applyRange = (f: string, t: string) => {
    setFrom(f);
    setTo(t);
    onChange({
      from: f ? new Date(`${f}T00:00:00`) : undefined,
      to: t ? new Date(`${t}T23:59:59`) : undefined,
    });
  };

  const handleShortcut = (type: "hoje" | "semana" | "mes" | "mes_atual" | "limpar") => {
    const today = new Date();
    const todayStr = formatarDataLocal(today);

    if (type === "hoje") {
      applyRange(todayStr, todayStr);
    } else if (type === "semana") {
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      applyRange(formatarDataLocal(lastWeek), todayStr);
    } else if (type === "mes") {
      const lastMonth = new Date(today);
      lastMonth.setDate(today.getDate() - 30);
      applyRange(formatarDataLocal(lastMonth), todayStr);
    } else if (type === "mes_atual") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      applyRange(formatarDataLocal(firstDay), todayStr);
    } else if (type === "limpar") {
      applyRange("", "");
    }
  };

  return (
    <div className={`flex flex-col gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 ${className}`}>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => handleShortcut("hoje")} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">Hoje</button>
        <button type="button" onClick={() => handleShortcut("semana")} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">Última semana</button>
        <button type="button" onClick={() => handleShortcut("mes")} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">Último mês</button>
        <button type="button" onClick={() => handleShortcut("mes_atual")} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">Mês atual</button>
        <button type="button" onClick={() => handleShortcut("limpar")} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200">Limpar</button>
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
      </div>
    </div>
  );
}
