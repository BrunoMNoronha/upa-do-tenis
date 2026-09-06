import { Card, Button, SectionTitle } from '@/components/ui';

export function DashboardQuickActions() {
  return (
    <Card className="p-6">
      <SectionTitle className="text-xl mb-4">Ações Rápidas</SectionTitle>
      <div className="flex flex-wrap gap-3">
        <Button href="/ordens-servico#nova-ordem" variant="primary">Nova Ordem de Serviço</Button>
        <Button href="/ordens-servico?statusOp=EM_ANDAMENTO" variant="secondary">OS em Andamento</Button>
        <Button href="/ordens-servico?atrasadas=true" variant="secondary">OS Atrasadas</Button>
        <Button href="/insumos?estoqueBaixo=true" variant="secondary">Ver Estoque Baixo</Button>
        <Button href="/relatorios/financeiro-os" variant="secondary">Relatório Financeiro</Button>
        <Button href="/relatorios/estoque" variant="secondary">Relatório de Estoque</Button>
      </div>
    </Card>
  );
}
