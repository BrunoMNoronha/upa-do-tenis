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
      />
      <MetricCard
        title="OS em Andamento"
        value={metrics.osEmAndamento}
        description="Em execução na oficina"
      />
      <MetricCard
        title="OS Concluídas"
        value={metrics.osConcluidas}
        description="Prontas para entrega"
      />
      <MetricCard
        title="OS Entregues"
        value={metrics.osEntregues}
        description="Finalizadas e com o cliente"
      />

      <MetricCard
        title="OS Pagas"
        value={metrics.osPagas}
        description="Saldo zerado"
      />
      <MetricCard
        title="OS Parciais"
        value={metrics.osParcialmentePagas}
        description="Com pagamento parcial"
      />
      <MetricCard
        title="OS Pend. Pagamento"
        value={metrics.osPendentesPagamento}
        description="Nenhum valor pago"
      />
    </div>
  );
}
