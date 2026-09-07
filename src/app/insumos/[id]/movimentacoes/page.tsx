import { AppShell } from "@/components/app-shell";
import { listarMovimentacoesInsumo } from "@/lib/insumos-movimentacoes";
import MovimentacoesClient from "./movimentacoes-client";

import { exigirSessao } from "@/lib/auth-server";

export const metadata = {
  title: "Extrato de Insumo | UPA do Tênis",
};

export const dynamic = "force-dynamic";

export default async function MovimentacoesInsumoPage({
  params,
}: {
  params: { id: string };
}) {
  await exigirSessao();

  const data = await listarMovimentacoesInsumo(params.id);

  return (
    <AppShell
      eyebrow="Estoque"
      title={`Extrato: ${data.insumo.nome}`}
      description="Consulte o histórico imutável e registre entradas, saídas ou ajustes."
      action={{ href: "/insumos", label: "Voltar para Insumos" }}
    >
      <MovimentacoesClient 
        insumoId={params.id} 
        initialData={data} 
      />
    </AppShell>
  );
}
