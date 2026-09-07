import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { AppShell } from '@/components/app-shell';

import { exigirSessao } from "@/lib/auth-server";

export const metadata = {
  title: 'Dashboard - UPA do Tênis',
  description: 'Visão geral gerencial da Sapataria Alves',
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await exigirSessao();

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
