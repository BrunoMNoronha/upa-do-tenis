import { AppShell } from "@/components/app-shell";
import { CaixaDetalheClient } from "./caixa-detalhe-client";

import { exigirSessao } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function CaixaDetalhePage({ params }: { params: { id: string } }) {
  await exigirSessao();

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
