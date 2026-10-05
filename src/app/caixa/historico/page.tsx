import { AppShell } from "@/components/app-shell";
import { CaixaHistoricoClient } from "./historico-client";

import { exigirSessao } from "@/lib/auth-server";
import { obterDadosEmpresaComCache as obterDadosEmpresa } from "@/lib/dados-cache";

export const dynamic = "force-dynamic";

export default async function CaixaHistoricoPage() {
  await exigirSessao();
  const dadosEmpresa = await obterDadosEmpresa();

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      title="Histórico de Caixas"
      description="Visualize os caixas fechados e abertos anteriormente."
      eyebrow="Caixa"
      action={{ label: "Voltar ao Caixa", href: "/caixa" }}
    >
      <CaixaHistoricoClient />
    </AppShell>
  );
}
