import { AppShell } from "@/components/app-shell";
import { InsumosClient } from "./insumos-client";

import { listarInsumos } from "@/lib/insumos";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Insumos e Produtos | UPA do Tênis",
  description: "Cadastro e consulta de insumos e produtos da sapataria.",
};

export default async function InsumosPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const insumos = (await listarInsumos()).map((insumo) => ({
    id: insumo.id,
    nome: insumo.nome,
    descricao: insumo.descricao,
    unidadeMedida: insumo.unidadeMedida,
    quantidadeEstoque: Number(insumo.quantidadeEstoque),
    estoqueMinimo: Number(insumo.estoqueMinimo),
    custoUnitario: Number(insumo.custoUnitario),
    ativo: insumo.ativo,
  }));

  const mostrarAlerta = searchParams?.alerta === "true" || searchParams?.estoqueBaixo === "true";

  const insumosVisiveis = mostrarAlerta
    ? insumos.filter((insumo) => insumo.quantidadeEstoque <= insumo.estoqueMinimo)
    : insumos;

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
