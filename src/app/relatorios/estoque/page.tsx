import React from "react";
import { AppShell } from "@/components/app-shell";
import { RelatorioEstoqueClient } from "@/components/relatorios/estoque/RelatorioEstoqueClient";

export const metadata = {
  title: "Relatório de Estoque - UPA do Tênis",
  description: "Visão global e alertas gerenciais do estoque.",
};

export default function RelatorioEstoquePage() {
  return (
    <AppShell
      eyebrow="Relatórios"
      title="Estoque Global"
      description="Visão consolidada, métricas e alertas sobre o inventário."
    >
      <RelatorioEstoqueClient />
    </AppShell>
  );
}
