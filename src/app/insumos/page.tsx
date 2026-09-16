import { AppShell } from "@/components/app-shell";
import { InsumosClient } from "./insumos-client";

import { listarInsumos } from "@/lib/insumos";

import { exigirSessao } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Insumos e Produtos | UPA do Tênis",
  description: "Cadastro e consulta de insumos e produtos da sapataria.",
};

export default async function InsumosPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await exigirSessao();
  const searchParams = await props.searchParams;

  const mostrarAlerta = searchParams?.alerta === "true" || searchParams?.estoqueBaixo === "true";

  const insumosFetch = await listarInsumos(mostrarAlerta);
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
      <InsumosClient insumos={insumosVisiveis} mostrarAlerta={mostrarAlerta} />
    </AppShell>
  );
}
