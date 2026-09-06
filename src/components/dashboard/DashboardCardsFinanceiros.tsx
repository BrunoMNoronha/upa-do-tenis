import { MetricCard } from './MetricCard';
import { DashboardMetrics } from '@/lib/dashboard-service';

interface DashboardCardsFinanceirosProps {
  metrics: DashboardMetrics;
}

export function DashboardCardsFinanceiros({ metrics }: DashboardCardsFinanceirosProps) {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Recebido"
        value={formatarMoeda(metrics.totalRecebido)}
        description="Soma de todos os pagamentos no período"
      />
      <MetricCard
        title="Total Pendente"
        value={formatarMoeda(metrics.totalPendente)}
        description="Saldo a receber de OS não canceladas"
      />
      <MetricCard
        title="Ticket Médio"
        value={formatarMoeda(metrics.ticketMedio)}
        description="Média do valor total por OS"
      />
      {/* Podemos adicionar mais cards aqui se houver mais métricas financeiras */}
    </div>
  );
}
