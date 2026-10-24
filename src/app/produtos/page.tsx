import { AppShell } from "@/components/app-shell";
import { IconeMais } from "@/components/icones";
import { Button } from "@/components/ui";

import { contarEstatisticasProdutos, listarProdutosPaginado } from "@/lib/produtos";
import { lerFiltroEstoqueProdutos, lerFiltroStatus, statusParaAtivo } from "@/lib/cadastros-filtros";
import { lerPaginacaoDeSearchParams } from "@/lib/paginacao";
import { lerBuscaDeSearchParams } from "@/lib/busca-listagem";
import { ProdutosClient } from "./produtos-client";

import { exigirSessao } from "@/lib/auth-server";
import { obterDadosEmpresaComCache as obterDadosEmpresa } from "@/lib/dados-cache";

export const metadata = {
  title: "Produtos",
  description: "Cadastro e consulta de produtos para venda no balcão.",
};

export const dynamic = "force-dynamic";

export default async function ProdutosPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sessao = await exigirSessao();

  const searchParams = await props.searchParams;
  const busca = lerBuscaDeSearchParams(searchParams);
  const filtroStatus = lerFiltroStatus(searchParams);
  const filtroEstoque = lerFiltroEstoqueProdutos(searchParams);
  const [{ data: produtos, pagination }, estatisticas, dadosEmpresa] = await Promise.all([
    listarProdutosPaginado({
      busca,
      ativo: statusParaAtivo(filtroStatus),
      estoque: filtroEstoque,
      paginacao: lerPaginacaoDeSearchParams(searchParams),
    }),
    contarEstatisticasProdutos(),
    obterDadosEmpresa(),
  ]);

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      usuario={sessao}
      eyebrow="Catálogo"
      title="Produtos"
      description="Produtos vendáveis no balcão. A venda dá baixa automática no estoque."
      actions={
        <Button href="#cadastro-rapido" icon={<IconeMais />}>
          Novo produto
        </Button>
      }
    >
      <ProdutosClient
        busca={busca}
        pagination={pagination}
        estatisticas={estatisticas}
        filtros={{ status: filtroStatus, estoque: filtroEstoque }}
        produtos={produtos.map((produto) => ({
          id: produto.id,
          nome: produto.nome,
          descricao: produto.descricao,
          precoVenda: Number(produto.precoVenda),
          quantidadeEstoque: Number(produto.quantidadeEstoque),
          ativo: produto.ativo,
          publicadoNoCatalogo: produto.publicadoNoCatalogo,
          // O pathname do storage não vai ao navegador; a imagem sai pelo proxy.
          possuiImagem: Boolean(produto.imagemPathname),
          criadoEm: produto.criadoEm.toISOString(),
          atualizadoEm: produto.atualizadoEm.toISOString(),
        }))}
      />
    </AppShell>
  );
}
