import React from 'react';
import { RelatorioFinanceiroOSClient } from '@/components/relatorios/financeiro-os/RelatorioFinanceiroOSClient';
import { AppShell } from '@/components/app-shell';

import { exigirSessao } from "@/lib/auth-server";
import { obterDadosEmpresaComCache as obterDadosEmpresa } from "@/lib/dados-cache";

export const metadata = {
  title: 'Relatório Financeiro de OS',
  description: 'Visão analítica e filtrável das Ordens de Serviço',
};

export const dynamic = "force-dynamic";

export default async function RelatorioFinanceiroOSPage() {
  await exigirSessao();
  const dadosEmpresa = await obterDadosEmpresa();

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      eyebrow="Relatórios e Métricas"
      title="Relatório Financeiro de OS"
      description="Visão analítica e filtrável das Ordens de Serviço."
    >
      <RelatorioFinanceiroOSClient />
    </AppShell>
  );
}
