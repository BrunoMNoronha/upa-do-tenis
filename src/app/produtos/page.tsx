import { AppShell } from "@/components/app-shell";

import { listarProdutosPaginado } from "@/lib/produtos";
import { lerPaginacaoDeSearchParams } from "@/lib/paginacao";
import { lerBuscaDeSearchParams } from "@/lib/busca-listagem";
import { ProdutosClient } from "./produtos-client";

import { exigirSessao } from "@/lib/auth-server";

export const metadata = {
  title: "Produtos | UPA do Tênis",
  description: "Cadastro e consulta de produtos para venda no balcão.",
};

export const dynamic = "force-dynamic";

export default async function ProdutosPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await exigirSessao();

  const searchParams = await props.searchParams;
  const busca = lerBuscaDeSearchParams(searchParams);
  const { data: produtos, pagination } = await listarProdutosPaginado({
    busca,
    paginacao: lerPaginacaoDeSearchParams(searchParams),
  });

  return (
    <AppShell
      eyebrow="Catálogo"
      title="Produtos"
      description="Gerencie os produtos vendáveis da sapataria. A venda e a baixa de estoque serão habilitadas nas próximas fatias da Fase 12."
      action={{ href: "/servicos", label: "Ir para Serviços" }}
    >
      <ProdutosClient
        busca={busca}
        pagination={pagination}
        produtos={produtos.map((produto) => ({
          id: produto.id,
          nome: produto.nome,
          descricao: produto.descricao,
          precoVenda: Number(produto.precoVenda),
          quantidadeEstoque: Number(produto.quantidadeEstoque),
          ativo: produto.ativo,
          criadoEm: produto.criadoEm.toISOString(),
        }))}
      />
    </AppShell>
  );
}
