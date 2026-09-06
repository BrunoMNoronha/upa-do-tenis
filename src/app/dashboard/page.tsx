import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { AppShell } from '@/components/app-shell';

export const metadata = {
  title: 'Dashboard - UPA do Tênis',
  description: 'Visão geral gerencial da Sapataria Alves',
};

export default function DashboardPage() {
  return (
    <AppShell
      eyebrow="Relatórios e Métricas"
      title="Dashboard"
      description="Visão geral financeira e operacional da Sapataria Alves."
    >
      <DashboardClient />
    </AppShell>
  );
}
