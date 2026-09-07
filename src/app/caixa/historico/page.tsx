import { AppShell } from "@/components/app-shell";
import { CaixaHistoricoClient } from "./historico-client";

import { exigirSessao } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function CaixaHistoricoPage() {
  await exigirSessao();

  return (
    <AppShell
      title="Histórico de Caixas"
      description="Visualize os caixas fechados e abertos anteriormente."
      eyebrow="Caixa"
      action={{ label: "Voltar ao Caixa", href: "/caixa" }}
    >
      <CaixaHistoricoClient />
    </AppShell>
  );
}
