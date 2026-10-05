import { AppShell } from "@/components/app-shell";
import { CaixaClient } from "./caixa-client";
import { listarFormasPagamentoComCache as listarFormasPagamento } from "@/lib/dados-cache";

import { exigirSessao } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function CaixaPage() {
  await exigirSessao({ permitirFechamento: true });

  const formasPagamento = await listarFormasPagamento();

  return (
    <AppShell
      title="Controle de Caixa"
      description="Gerencie a abertura, fechamento e movimentações do caixa."
      action={{ label: "Histórico", href: "/caixa/historico" }}
    >
      <CaixaClient formasPagamento={formasPagamento} />
    </AppShell>
  );
}
