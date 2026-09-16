import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AppShell } from '@/components/app-shell';

import { exigirSessao } from "@/lib/auth-server";

export const metadata = {
  title: 'Dashboard - UPA do Tênis',
  description: 'Visão geral gerencial da Sapataria Alves',
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const usuario = await exigirSessao();

  return (
    <AppShell
      eyebrow="Relatórios e Métricas"
      title="Dashboard"
      description="Visão geral financeira e operacional da Sapataria Alves."
      header={<DashboardHeader nomeUsuario={usuario.nome} />}
    >
      <DashboardClient />
    </AppShell>
  );
}
