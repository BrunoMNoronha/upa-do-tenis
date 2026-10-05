import React from "react";
import { AppShell } from "@/components/app-shell";
import { RelatorioEstoqueClient } from "@/components/relatorios/estoque/RelatorioEstoqueClient";

import { exigirSessao } from "@/lib/auth-server";
import { obterDadosEmpresaComCache as obterDadosEmpresa } from "@/lib/dados-cache";

export const metadata = {
  title: "Relatório de Estoque",
  description: "Visão global e alertas gerenciais do estoque.",
};

export const dynamic = "force-dynamic";

export default async function RelatorioEstoquePage() {
  await exigirSessao();
  const dadosEmpresa = await obterDadosEmpresa();

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      eyebrow="Relatórios"
      title="Estoque Global"
      description="Visão consolidada, métricas e alertas sobre o inventário."
    >
      <RelatorioEstoqueClient />
    </AppShell>
  );
}
