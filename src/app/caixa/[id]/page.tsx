import { AppShell } from "@/components/app-shell";
import { CaixaDetalheClient } from "./caixa-detalhe-client";

export default function CaixaDetalhePage({ params }: { params: { id: string } }) {
  return (
    <AppShell
      title="Detalhes do Caixa"
      description="Visualização de fechamento e movimentações."
      eyebrow="Caixa"
      action={{ label: "Voltar ao Histórico", href: "/caixa/historico" }}
    >
      <CaixaDetalheClient caixaId={params.id} />
    </AppShell>
  );
}
