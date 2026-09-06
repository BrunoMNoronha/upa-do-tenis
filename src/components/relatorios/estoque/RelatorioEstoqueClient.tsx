"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RelatorioEstoqueEstatisticas, InsumoCritico, MovimentacaoResumo, ResumoPorTipo } from "@/lib/relatorio-estoque-service";
import { LoadingState, ErrorState } from "@/components/ui";
import { DateRangePicker, type DateRange } from "@/components/date-range-picker";
import { formatarDataLocal } from "@/lib/date-range";

import { CardsResumo } from "./CardsResumo";
import { InsumosCriticos } from "./InsumosCriticos";
import { MovimentacoesRecentes } from "./MovimentacoesRecentes";

export function RelatorioEstoqueClient() {
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [estatisticas, setEstatisticas] = useState<RelatorioEstoqueEstatisticas | null>(null);
  const [criticos, setCriticos] = useState<InsumoCritico[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoResumo[]>([]);
  const [resumoTipos, setResumoTipos] = useState<ResumoPorTipo[]>([]);

  useEffect(() => {
    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

    setInicio(formatarDataLocal(trintaDiasAtras));
    setFim(formatarDataLocal(hoje));
  }, []);

  const fetchRelatorio = useCallback(async (dataInicio: string, dataFim: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dataInicio) params.append("dataInicio", dataInicio);
      if (dataFim) params.append("dataFim", dataFim);

      const res = await fetch(`/api/relatorios/estoque?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Falha ao buscar dados do relatório.");
      }
      
      const data = await res.json();
      setEstatisticas(data.estatisticas);
      setCriticos(data.criticos);
      setMovimentacoes(data.movimentacoes);
      setResumoTipos(data.resumoTipos);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (inicio && fim) {
      fetchRelatorio(inicio, fim);
    }
  }, [inicio, fim, fetchRelatorio]);

  const handleFiltrar = () => {
    fetchRelatorio(inicio, fim);
  };

  const currentRange: DateRange = {
    from: inicio ? new Date(`${inicio}T00:00:00`) : undefined,
    to: fim ? new Date(`${fim}T23:59:59`) : undefined,
  };

  const handleRangeChange = (range: DateRange) => {
    setInicio(range.from ? formatarDataLocal(range.from) : "");
    setFim(range.to ? formatarDataLocal(range.to) : "");
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <DateRangePicker
        value={currentRange}
        onChange={handleRangeChange}
        onApply={handleFiltrar}
        applying={loading}
        applyLabel="Filtrar Período"
      />

      {error && (
        <ErrorState description={error} />
      )}

      {loading && !estatisticas && (
        <LoadingState text="Processando relatório de estoque..." />
      )}

      {estatisticas && (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          <CardsResumo estatisticas={estatisticas} />

          <div className="grid gap-6 lg:grid-cols-3">
            <InsumosCriticos criticos={criticos} />

            <MovimentacoesRecentes movimentacoes={movimentacoes} />
          </div>
          
        </div>
      )}
    </div>
  );
}
