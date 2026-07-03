import React from 'react';
import { RelatorioFinanceiroOSClient } from '@/components/relatorios/financeiro-os/RelatorioFinanceiroOSClient';
import { AppShell } from '@/components/app-shell';

export const metadata = {
  title: 'Relatório Financeiro de OS - UPA do Tênis',
  description: 'Visão analítica e filtrável das Ordens de Serviço',
};

export default function RelatorioFinanceiroOSPage() {
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
