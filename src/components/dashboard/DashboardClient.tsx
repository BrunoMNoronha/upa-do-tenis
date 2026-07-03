'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardMetrics } from '@/lib/dashboard-service';
import { DashboardFiltros } from './DashboardFiltros';
import { DashboardCardsFinanceiros } from './DashboardCardsFinanceiros';
import { DashboardCardsOperacionais } from './DashboardCardsOperacionais';
import { DashboardServicosMaisExecutados } from './DashboardServicosMaisExecutados';
import { DashboardInsumosMaisUtilizados } from './DashboardInsumosMaisUtilizados';
import { DashboardAlertasEstoque } from './DashboardAlertasEstoque';
import { DashboardQuickActions } from './DashboardQuickActions';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui';

export function DashboardClient() {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define as datas padrão (mês atual) na montagem do componente
  useEffect(() => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    // Formata para YYYY-MM-DD
    const formataData = (d: Date) => d.toISOString().split('T')[0];
    
    setInicio(formataData(primeiroDia));
    setFim(formataData(hoje));
  }, []);

  const fetchMetrics = useCallback(async (dataInicio: string, dataFim: string) => {
    if (!dataInicio || !dataFim) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dataInicio) params.append('inicio', dataInicio);
      if (dataFim) params.append('fim', dataFim);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Falha ao buscar dados do dashboard.');
      }
      const data: DashboardMetrics = await res.json();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Busca inicial quando as datas padrão são definidas
  useEffect(() => {
    if (inicio && fim) {
      fetchMetrics(inicio, fim);
    }
  }, [inicio, fim, fetchMetrics]);

  const handleFiltrar = () => {
    fetchMetrics(inicio, fim);
  };

  return (
    <div className="space-y-6">
      <DashboardAlertasEstoque />
      
      <DashboardQuickActions />

      <DashboardFiltros
        inicio={inicio}
        fim={fim}
        onInicioChange={setInicio}
        onFimChange={setFim}
        onFiltrar={handleFiltrar}
        loading={loading}
      />

      {error && (
        <ErrorState description={error} />
      )}

      {!error && !metrics && !loading && (
        <EmptyState 
          title="Sem Dados" 
          description="Nenhum dado encontrado para o período selecionado." 
        />
      )}

      {loading && !metrics && (
        <LoadingState text="Carregando métricas do dashboard..." />
      )}

      {metrics && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <section>
            <h2 className="text-xl font-semibold mb-4">Métricas Financeiras</h2>
            <DashboardCardsFinanceiros metrics={metrics} />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Métricas Operacionais</h2>
            <DashboardCardsOperacionais metrics={metrics} />
          </section>

          {/* Rankings */}
          <section className="grid gap-6 md:grid-cols-2">
            <DashboardServicosMaisExecutados servicos={metrics.topServicos} />
            <DashboardInsumosMaisUtilizados insumos={metrics.topInsumos} />
          </section>
        </div>
      )}
    </div>
  );
}
