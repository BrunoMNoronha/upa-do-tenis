"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RelatorioEstoqueEstatisticas, InsumoCritico, MovimentacaoResumo, ResumoPorTipo } from "@/lib/relatorio-estoque-service";
import Link from "next/link";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat("pt-BR").format(d);
};

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
    
    const formataData = (d: Date) => d.toISOString().split("T")[0];
    
    setInicio(formataData(trintaDiasAtras));
    setFim(formataData(hoje));
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

  const handleFiltrar = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRelatorio(inicio, fim);
  };

  const getTipoLabel = (tipo: string) => {
    const map: Record<string, string> = {
      ENTRADA_MANUAL: "Entrada Manual",
      SAIDA_MANUAL: "Saída Manual",
      AJUSTE: "Ajuste",
      BAIXA_OS: "Baixa em OS",
      ESTORNO_OS: "Estorno de OS",
    };
    return map[tipo] || tipo;
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "ENTRADA_MANUAL":
      case "ESTORNO_OS":
        return <span className="mr-1 text-emerald-600">↗️</span>;
      case "SAIDA_MANUAL":
      case "BAIXA_OS":
        return <span className="mr-1 text-rose-600">↘️</span>;
      case "AJUSTE":
        return <span className="mr-1 text-amber-600">🔄</span>;
      default:
        return <span className="mr-1 text-gray-500">📄</span>;
    }
  };

  const formatTipoColor = (tipo: string) => {
    switch (tipo) {
      case "ENTRADA_MANUAL":
      case "ESTORNO_OS":
        return "text-emerald-700 bg-emerald-50 ring-emerald-600/20";
      case "SAIDA_MANUAL":
      case "BAIXA_OS":
        return "text-rose-700 bg-rose-50 ring-rose-600/20";
      case "AJUSTE":
        return "text-amber-700 bg-amber-50 ring-amber-600/20";
      default:
        return "text-gray-700 bg-gray-50 ring-gray-600/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <form onSubmit={handleFiltrar} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label htmlFor="inicio" className="text-sm font-medium text-gray-700">Data Inicial</label>
            <input
              type="date"
              id="inicio"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-10 px-3 border"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label htmlFor="fim" className="text-sm font-medium text-gray-700">Data Final</label>
            <input
              type="date"
              id="fim"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-10 px-3 border"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 h-10 w-full sm:w-auto"
            >
              {loading ? "Filtrando..." : "Filtrar Período"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center">
          <span className="h-5 w-5 mr-2">⚠️</span>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && !estatisticas && (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {estatisticas && (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {/* Cards de Resumo */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center text-gray-500 mb-2">
                <span className="mr-2">📦</span>
                <h3 className="text-sm font-medium">Insumos Ativos</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.totalInsumosAtivos}</p>
            </div>
            
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
              <div className="flex items-center text-rose-600 mb-2">
                <span className="mr-2">❌</span>
                <h3 className="text-sm font-medium">Insumos Zerados</h3>
              </div>
              <p className="text-2xl font-bold text-rose-700">{estatisticas.totalInsumosZerados}</p>
            </div>
            
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="flex items-center text-amber-600 mb-2">
                <span className="mr-2">📉</span>
                <h3 className="text-sm font-medium">Abaixo do Mínimo</h3>
              </div>
              <p className="text-2xl font-bold text-amber-700">{estatisticas.totalInsumosAbaixoMinimo}</p>
            </div>
            
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <div className="flex items-center text-emerald-600 mb-2">
                <span className="mr-2">💰</span>
                <h3 className="text-sm font-medium">Valor Estimado</h3>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(estatisticas.valorTotalEstimado)}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Tabela de Insumos Críticos */}
            <div className="lg:col-span-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-200 bg-gray-50/50 px-4 py-4 sm:px-6">
                <h3 className="text-base font-semibold leading-6 text-gray-900">Insumos Críticos</h3>
                <p className="mt-1 text-sm text-gray-500">Insumos zerados ou abaixo do mínimo exigem reposição.</p>
              </div>
              
              {criticos.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">Nenhum insumo crítico encontrado.</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {criticos.map((insumo) => (
                    <li key={insumo.id} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{insumo.nome}</p>
                          <p className="text-sm text-gray-500">
                            Estoque Atual: <span className="font-semibold text-gray-900">{insumo.quantidadeEstoque}</span> / Mínimo: {insumo.estoqueMinimo}
                          </p>
                        </div>
                        <div>
                          {insumo.status === 'ZERADO' ? (
                            <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
                              Zerado
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              Baixo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-right">
                        <Link href={`/insumos/${insumo.id}/extrato`} className="text-xs font-medium text-primary hover:underline">
                          Ver extrato
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Tabela de Movimentações Recentes */}
            <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="border-b border-gray-200 bg-gray-50/50 px-4 py-4 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-semibold leading-6 text-gray-900">Últimas Movimentações</h3>
                  <p className="mt-1 text-sm text-gray-500">Movimentações consolidadas no período.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Data</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tipo</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Insumo</th>
                      <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Qtd</th>
                      <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pr-6">Custo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {movimentacoes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                          Nenhuma movimentação no período selecionado.
                        </td>
                      </tr>
                    ) : (
                      movimentacoes.map((mov) => (
                        <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
                            {formatDate(mov.dataMovimentacao)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${formatTipoColor(mov.tipo)}`}>
                              {getTipoIcon(mov.tipo)}
                              {getTipoLabel(mov.tipo)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {mov.insumo.nome} <span className="text-gray-500 text-xs">({mov.insumo.unidadeMedida})</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right font-medium">
                            {['SAIDA_MANUAL', 'BAIXA_OS'].includes(mov.tipo) ? '-' : '+'}{mov.quantidade}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right sm:pr-6">
                            {formatCurrency(mov.custoTotal)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
