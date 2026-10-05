import { Suspense } from 'react';

import { DashboardAlertaCaixaView } from '@/components/dashboard/DashboardAlertaCaixa';
import { DashboardAlertasEstoqueView } from '@/components/dashboard/DashboardAlertasEstoque';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AppShell } from '@/components/app-shell';

import { exigirSessao } from "@/lib/auth-server";
import { obterDadosEmpresaComCache as obterDadosEmpresa } from "@/lib/dados-cache";
import {
  AlertaCaixaInicial,
  AlertasEstoqueInicial,
  MetricasIniciais,
  periodoInicialDashboard,
} from './dashboard-dados-iniciais';

export const metadata = {
  title: 'Dashboard',
  description: 'Visão geral gerencial da sapataria',
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const usuario = await exigirSessao();
  const dadosEmpresa = await obterDadosEmpresa();
  const periodoInicial = periodoInicialDashboard();

  // Cada bloco consulta no servidor dentro do próprio Suspense: o shell e os
  // skeletons saem na primeira resposta e os dados chegam por streaming.
  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      eyebrow="Relatórios e Métricas"
      title="Dashboard"
      description={`Visão geral financeira e operacional de ${dadosEmpresa.nomeFantasia}.`}
      header={<DashboardHeader nomeUsuario={usuario.nome} nomeEmpresa={dadosEmpresa.nomeFantasia} />}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Suspense fallback={<DashboardAlertaCaixaView situacao={{ tipo: "carregando" }} />}>
            <AlertaCaixaInicial />
          </Suspense>
          <Suspense fallback={<DashboardAlertasEstoqueView situacao={{ tipo: "carregando" }} />}>
            <AlertasEstoqueInicial />
          </Suspense>
        </div>

        <Suspense fallback={<DashboardClient periodoInicial={periodoInicial} aguardandoServidor />}>
          <MetricasIniciais periodo={periodoInicial} />
        </Suspense>
      </div>
    </AppShell>
  );
}
