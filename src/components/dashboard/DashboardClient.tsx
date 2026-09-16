'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DashboardMetrics } from '@/lib/dashboard-service';
import { formatCurrency } from '@/lib/formatters';
import { Button, EmptyState, ErrorState } from '@/components/ui';
import { DashboardFiltros } from './DashboardFiltros';
import { DashboardKpiCard } from './DashboardKpiCard';
import { DashboardCardsOperacionais } from './DashboardCardsOperacionais';
import { DashboardServicosMaisExecutados } from './DashboardServicosMaisExecutados';
import { DashboardInsumosMaisUtilizados } from './DashboardInsumosMaisUtilizados';
import { DashboardAlertasEstoque } from './DashboardAlertasEstoque';
import { DashboardAlertaCaixa } from './DashboardAlertaCaixa';
import { DashboardQuickActions } from './DashboardQuickActions';
import { calcularPeriodoPreset, type Periodo } from './dashboard-period-presets';
import { montarDashboardViewModel } from './dashboard-view-model';

function descreverOrdensComSaldo(quantidade: number): string | undefined {
  if (quantidade <= 0) return undefined;
  return quantidade === 1 ? '1 OS' : `${quantidade} OS`;
}

export function DashboardClient() {
  const [periodo, setPeriodo] = useState<Periodo>({ inicio: '', fim: '' });
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Sequência da última requisição disparada: respostas antigas são ignoradas.
  const requisicaoAtual = useRef(0);

  const fetchMetrics = useCallback(async (dataInicio: string, dataFim: string) => {
    if (!dataInicio || !dataFim) return;

    const sequencia = ++requisicaoAtual.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ inicio: dataInicio, fim: dataFim });
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Falha ao buscar dados do dashboard.');
      }
      const data: DashboardMetrics = await res.json();
      if (sequencia === requisicaoAtual.current) setMetrics(data);
    } catch (err: unknown) {
      if (sequencia === requisicaoAtual.current) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido.');
      }
    } finally {
      if (sequencia === requisicaoAtual.current) setLoading(false);
    }
  }, []);

  /**
   * Único ponto que altera o período E consulta a API. Presets, botão
   * "Filtrar" e carga inicial passam por aqui, garantindo uma chamada por
   * aplicação (a edição manual das datas só atualiza o estado).
   */
  const aplicarPeriodo = useCallback(
    (inicio: string, fim: string) => {
      setPeriodo({ inicio, fim });
      void fetchMetrics(inicio, fim);
    },
    [fetchMetrics]
  );

  const alterarPeriodo = useCallback((inicio: string, fim: string) => {
    setPeriodo({ inicio, fim });
  }, []);

  // Carga inicial: mês atual, calculado no cliente em dias locais.
  useEffect(() => {
    const inicial = calcularPeriodoPreset('esteMes');
    aplicarPeriodo(inicial.inicio, inicial.fim);
  }, [aplicarPeriodo]);

  const viewModel = useMemo(() => (metrics ? montarDashboardViewModel(metrics) : null), [metrics]);
  const atualizando = loading && metrics !== null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <DashboardAlertaCaixa />
        <DashboardAlertasEstoque />
      </div>

      <DashboardQuickActions />

      <DashboardFiltros
        inicio={periodo.inicio}
        fim={periodo.fim}
        onPeriodoChange={alterarPeriodo}
        onAplicarPeriodo={aplicarPeriodo}
        loading={loading}
      />

      {error && !metrics && (
        <ErrorState
          description={error}
          action={
            <Button type="button" onClick={() => aplicarPeriodo(periodo.inicio, periodo.fim)}>
              Tentar novamente
            </Button>
          }
        />
      )}

      {error && metrics && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span>{error} Exibindo os últimos dados carregados.</span>
          <button
            type="button"
            onClick={() => aplicarPeriodo(periodo.inicio, periodo.fim)}
            className="font-semibold underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!error && !metrics && !loading && (
        <EmptyState
          title="Sem dados"
          description="Nenhum dado encontrado para o período selecionado."
        />
      )}

      {/* KPIs: skeleton só enquanto carrega (nunca junto ao erro), dados anteriores visíveis nas filtragens seguintes. */}
      <section aria-label="Indicadores do período" aria-busy={loading || undefined}>
        <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-4 transition-opacity ${atualizando ? 'opacity-60' : ''}`}>
          {viewModel ? (
            <>
              <DashboardKpiCard
                label="Total recebido"
                value={formatCurrency(viewModel.totalRecebido)}
                description="Pagamentos registrados no período"
                tone="highlight"
              />
              <DashboardKpiCard
                label="Total pendente"
                value={formatCurrency(viewModel.totalPendente)}
                description="Saldo a receber de OS não canceladas"
                badge={descreverOrdensComSaldo(viewModel.ordensComSaldo)}
              />
              <DashboardKpiCard
                label="Ticket médio"
                value={formatCurrency(viewModel.ticketMedio)}
                description="Média do valor total por OS"
              />
              <DashboardKpiCard
                label="OS ativas no período"
                value={String(viewModel.totalOrdensAtivas)}
                description="Abertas, em andamento, concluídas e entregues; canceladas não incluídas"
                href="/ordens-servico"
              />
            </>
          ) : loading ? (
            <>
              <DashboardKpiCard loading label="Total recebido" value="" description="" />
              <DashboardKpiCard loading label="Total pendente" value="" description="" />
              <DashboardKpiCard loading label="Ticket médio" value="" description="" />
              <DashboardKpiCard loading label="OS ativas no período" value="" description="" />
            </>
          ) : null}
        </div>
      </section>

      {metrics && (
        <div className={`space-y-8 transition-opacity ${atualizando ? 'opacity-60' : ''}`}>
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
