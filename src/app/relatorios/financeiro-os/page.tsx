import React from 'react';
import { RelatorioFinanceiroOSClient } from '@/components/relatorios/financeiro-os/RelatorioFinanceiroOSClient';
import { AppShell } from '@/components/app-shell';

import { exigirSessao } from "@/lib/auth-server";

export const metadata = {
  title: 'Relatório Financeiro de OS - UPA do Tênis',
  description: 'Visão analítica e filtrável das Ordens de Serviço',
};

export const dynamic = "force-dynamic";

export default async function RelatorioFinanceiroOSPage() {
  await exigirSessao();

  return (
    <AppShell
      eyebrow="Relatórios e Métricas"
      title="Relatório Financeiro de OS"
      description="Visão analítica e filtrável das Ordens de Serviço."
    >
      <RelatorioFinanceiroOSClient />
    </AppShell>
  );
}
