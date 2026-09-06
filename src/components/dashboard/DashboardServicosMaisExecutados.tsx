import { TopList, TopListItem } from './TopList';

interface DashboardServicosMaisExecutadosProps {
  servicos: TopListItem[];
}

export function DashboardServicosMaisExecutados({ servicos }: DashboardServicosMaisExecutadosProps) {
  return (
    <TopList
      title="Serviços Mais Executados"
      items={servicos}
      emptyMessage="Nenhum serviço registrado no período."
    />
  );
}
