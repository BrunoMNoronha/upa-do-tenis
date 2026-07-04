"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, SectionTitle, LoadingState, ErrorState, Button, Badge } from "@/components/ui";
import { DateRangePicker, type DateRange } from "@/components/date-range-picker";
import { formatarDataLocal } from "@/lib/date-range";

type Caixa = {
  id: string;
  dataAbertura: string;
  dataFechamento?: string | null;
  saldoInicial: number;
  saldoFinalInformado?: number | null;
  saldoFinalCalculado?: number | null;
  divergencia?: number | null;
  status: string;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function CaixaHistoricoClient() {
  const [estado, setEstado] = useState<"carregando" | "erro" | "sucesso">("carregando");
  const [erro, setErro] = useState<string | null>(null);
  const [caixas, setCaixas] = useState<Caixa[]>([]);

  const [range, setRange] = useState<DateRange>({});

  const fetchCaixas = useCallback(async () => {
    setEstado("carregando");
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (range.from) params.append("dataInicio", formatarDataLocal(range.from));
      if (range.to) params.append("dataFim", formatarDataLocal(range.to));

      const response = await fetch(`/api/caixa?${params.toString()}`);
      if (!response.ok) throw new Error("Falha ao carregar histórico.");
      const data = await response.json();
      setCaixas(data);
      setEstado("sucesso");
    } catch (e: any) {
      setErro(e.message);
      setEstado("erro");
    }
  }, [range]);

  useEffect(() => {
    fetchCaixas();
  }, [fetchCaixas]);

  if (estado === "carregando") return <LoadingState text="Carregando histórico..." />;
  if (estado === "erro") return <ErrorState title="Erro" description={erro || ""} />;

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-[color:var(--surface)] text-[color:var(--text)]">
        <SectionTitle className="mb-4">Filtros</SectionTitle>
        <DateRangePicker value={range} onChange={setRange} />
      </Card>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-black/10 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Data Abertura</th>
              <th className="px-4 py-3 font-semibold">Data Fechamento</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Saldo Inicial</th>
              <th className="px-4 py-3 font-semibold">Divergência</th>
              <th className="px-4 py-3 font-semibold text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 bg-white">
            {caixas.map((caixa) => (
              <tr key={caixa.id} className="transition-colors hover:bg-slate-50/50">
                <td className="px-4 py-3">{dateFormatter.format(new Date(caixa.dataAbertura))}</td>
                <td className="px-4 py-3">{caixa.dataFechamento ? dateFormatter.format(new Date(caixa.dataFechamento)) : "-"}</td>
                <td className="px-4 py-3">
                  <Badge tone={caixa.status === "ABERTO" ? "success" : "neutral"}>{caixa.status}</Badge>
                </td>
                <td className="px-4 py-3">{currencyFormatter.format(caixa.saldoInicial)}</td>
                <td className="px-4 py-3">
                  {caixa.divergencia !== null && caixa.divergencia !== undefined ? (
                    <span className={Number(caixa.divergencia) < 0 ? "text-rose-600 font-semibold" : Number(caixa.divergencia) > 0 ? "text-emerald-600 font-semibold" : ""}>
                      {currencyFormatter.format(Number(caixa.divergencia))}
                    </span>
                  ) : "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/caixa/${caixa.id}`} className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200">
                    Ver Detalhes
                  </Link>
                </td>
              </tr>
            ))}
            {caixas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Nenhum caixa encontrado no histórico.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
    </div>
  );
}
