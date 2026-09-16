import { AppShell } from "@/components/app-shell";
import { InsumosClient } from "./insumos-client";

import { listarInsumosPaginado } from "@/lib/insumos";
import { lerPaginacaoDeSearchParams } from "@/lib/paginacao";
import { lerBuscaDeSearchParams } from "@/lib/busca-listagem";

import { exigirSessao } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Insumos e Produtos",
  description: "Cadastro e consulta de insumos e produtos da sapataria.",
};

export default async function InsumosPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await exigirSessao();
  const searchParams = await props.searchParams;

  const mostrarAlerta = searchParams?.alerta === "true" || searchParams?.estoqueBaixo === "true";

  const busca = lerBuscaDeSearchParams(searchParams);
  const { data: insumosFetch, pagination } = await listarInsumosPaginado({
    estoqueBaixo: mostrarAlerta,
    busca,
    paginacao: lerPaginacaoDeSearchParams(searchParams),
  });
  const insumosVisiveis = insumosFetch.map((insumo) => ({
    id: insumo.id,
    nome: insumo.nome,
    descricao: insumo.descricao,
    unidadeMedida: insumo.unidadeMedida,
    quantidadeEstoque: Number(insumo.quantidadeEstoque),
    estoqueMinimo: Number(insumo.estoqueMinimo),
    custoUnitario: Number(insumo.custoUnitario),
    ativo: insumo.ativo,
  }));

  return (
    <AppShell
      eyebrow="Estoque"
      title="Insumos e Produtos"
      description="Gerencie os materiais utilizados nos serviços ou produtos para venda no balcão."
      action={{ href: "/servicos", label: "Ir para Serviços" }}
    >
      <InsumosClient insumos={insumosVisiveis} mostrarAlerta={mostrarAlerta} busca={busca} pagination={pagination} />
    </AppShell>
  );
}
