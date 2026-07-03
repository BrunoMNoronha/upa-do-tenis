import React from 'react';
import { MetricCard } from './MetricCard';
import { DashboardMetrics } from '@/lib/dashboard-service';

interface DashboardCardsOperacionaisProps {
  metrics: DashboardMetrics;
}

export function DashboardCardsOperacionais({ metrics }: DashboardCardsOperacionaisProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="OS Abertas"
        value={metrics.osAbertas}
        description="Aguardando análise"
        href="/ordens-servico?statusOp=ABERTA"
      />
      <MetricCard
        title="OS em Andamento"
        value={metrics.osEmAndamento}
        description="Em execução na oficina"
        href="/ordens-servico?statusOp=EM_ANDAMENTO"
      />
      <MetricCard
        title="OS Concluídas"
        value={metrics.osConcluidas}
        description="Prontas para entrega"
        href="/ordens-servico?statusOp=CONCLUIDA"
      />
      <MetricCard
        title="OS Entregues"
        value={metrics.osEntregues}
        description="Finalizadas e com o cliente"
        href="/ordens-servico?statusOp=ENTREGUE"
      />

      <MetricCard
        title="OS Pagas"
        value={metrics.osPagas}
        description="Saldo zerado"
        href="/ordens-servico?statusFin=PAGAS"
      />
      <MetricCard
        title="OS Parciais"
        value={metrics.osParcialmentePagas}
        description="Com pagamento parcial"
        href="/ordens-servico?statusFin=PARCIAIS"
      />
      <MetricCard
        title="OS Pend. Pagamento"
        value={metrics.osPendentesPagamento}
        description="Nenhum valor pago"
        href="/ordens-servico?statusFin=PENDENTES"
      />
    </div>
  );
}
