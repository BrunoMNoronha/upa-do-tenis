import { AppShell } from "@/components/app-shell";

import { listarProdutos } from "@/lib/produtos";
import { ProdutosClient } from "./produtos-client";

export const metadata = {
  title: "Produtos | UPA do Tênis",
  description: "Cadastro e consulta de produtos para venda no balcão.",
};

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const produtos = await listarProdutos();

  return (
    <AppShell
      eyebrow="Catálogo"
      title="Produtos"
      description="Gerencie os produtos vendáveis da sapataria. A venda e a baixa de estoque serão habilitadas nas próximas fatias da Fase 12."
      action={{ href: "/servicos", label: "Ir para Serviços" }}
    >
      <ProdutosClient
        produtos={produtos.map((produto) => ({
          id: produto.id,
          nome: produto.nome,
          descricao: produto.descricao,
          precoVenda: Number(produto.precoVenda),
          ativo: produto.ativo,
          criadoEm: produto.criadoEm.toISOString(),
        }))}
      />
    </AppShell>
  );
}
