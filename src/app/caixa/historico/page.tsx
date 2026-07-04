import { AppShell } from "@/components/app-shell";
import { CaixaHistoricoClient } from "./historico-client";

export default function CaixaHistoricoPage() {
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
