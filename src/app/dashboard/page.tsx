import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AppShell } from '@/components/app-shell';

import { exigirSessao } from "@/lib/auth-server";
import { obterDadosEmpresaComCache as obterDadosEmpresa } from "@/lib/dados-cache";

export const metadata = {
  title: 'Dashboard',
  description: 'Visão geral gerencial da sapataria',
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const usuario = await exigirSessao();
  const dadosEmpresa = await obterDadosEmpresa();

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      eyebrow="Relatórios e Métricas"
      title="Dashboard"
      description={`Visão geral financeira e operacional de ${dadosEmpresa.nomeFantasia}.`}
      header={<DashboardHeader nomeUsuario={usuario.nome} nomeEmpresa={dadosEmpresa.nomeFantasia} />}
    >
      <DashboardClient />
    </AppShell>
  );
}
