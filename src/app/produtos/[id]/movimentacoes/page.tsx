import { AppShell } from "@/components/app-shell";
import { listarMovimentacoesProduto } from "@/lib/movimentacao-estoque-produto-service";
import { ProdutoMovimentacoesClient } from "./movimentacoes-client";
import { exigirSessao } from "@/lib/auth-server";

export const metadata = {
  title: "Extrato de Produto | UPA do Tênis",
};

export const dynamic = "force-dynamic";

export default async function MovimentacoesProdutoPage(props: {
  params: Promise<{ id: string }>;
}) {
  await exigirSessao();
  const { id } = await props.params;

  const data = await listarMovimentacoesProduto(id);

  return (
    <AppShell
      eyebrow="Estoque de Produtos"
      title={`Extrato: ${data.produto.nome}`}
      description="Consulte o histórico rastreável de entradas e saídas de estoque deste produto."
      action={{ href: "/produtos", label: "Voltar para Produtos" }}
    >
      <ProdutoMovimentacoesClient initialData={data} />
    </AppShell>
  );
}
