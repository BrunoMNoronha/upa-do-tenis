import { AppShell } from "@/components/app-shell";
import { listarMovimentacoesInsumo } from "@/lib/insumos-movimentacoes";
import MovimentacoesClient from "./movimentacoes-client";

import { exigirSessao } from "@/lib/auth-server";

export const metadata = {
  title: "Extrato de Insumo",
};

export const dynamic = "force-dynamic";

export default async function MovimentacoesInsumoPage(props: {
  params: Promise<{ id: string }>;
}) {
  await exigirSessao();
  const { id } = await props.params;

  const data = await listarMovimentacoesInsumo(id);

  return (
    <AppShell
      eyebrow="Estoque"
      title={`Extrato: ${data.insumo.nome}`}
      description="Consulte o histórico imutável e registre entradas, saídas ou ajustes."
      action={{ href: "/insumos", label: "Voltar para Insumos" }}
    >
      <MovimentacoesClient 
        insumoId={id} 
        initialData={data} 
      />
    </AppShell>
  );
}
