import { AppShell } from "@/components/app-shell";
import { IconeMais } from "@/components/icones";
import { Button } from "@/components/ui";
import { InsumosClient } from "./insumos-client";

import { contarEstatisticasInsumos, listarInsumosPaginado } from "@/lib/insumos";
import { lerFiltroEstoqueInsumos, lerFiltroStatus, statusParaAtivo } from "@/lib/cadastros-filtros";
import { lerPaginacaoDeSearchParams } from "@/lib/paginacao";
import { lerBuscaDeSearchParams } from "@/lib/busca-listagem";

import { exigirSessao } from "@/lib/auth-server";
import { obterDadosEmpresaComCache as obterDadosEmpresa } from "@/lib/dados-cache";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Estoque / Insumos",
  description: "Cadastro e consulta dos insumos consumidos nos serviços.",
};

export default async function InsumosPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sessao = await exigirSessao();
  const searchParams = await props.searchParams;

  const busca = lerBuscaDeSearchParams(searchParams);
  const filtroStatus = lerFiltroStatus(searchParams);
  const filtroEstoque = lerFiltroEstoqueInsumos(searchParams);
  const [{ data: insumosFetch, pagination }, estatisticas, dadosEmpresa] = await Promise.all([
    listarInsumosPaginado({
      estoque: filtroEstoque,
      ativo: statusParaAtivo(filtroStatus),
      busca,
      paginacao: lerPaginacaoDeSearchParams(searchParams),
    }),
    contarEstatisticasInsumos(),
    obterDadosEmpresa(),
  ]);
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
      dadosEmpresa={dadosEmpresa}
      usuario={sessao}
      eyebrow="Estoque"
      title="Estoque / Insumos"
      description="Materiais consumidos nos serviços. O consumo é lançado no detalhe da OS e dá baixa aqui."
      actions={
        <Button href="#cadastro-rapido" icon={<IconeMais />}>
          Novo insumo
        </Button>
      }
    >
      <InsumosClient
        insumos={insumosVisiveis}
        busca={busca}
        pagination={pagination}
        estatisticas={estatisticas}
        filtros={{ status: filtroStatus, estoque: filtroEstoque }}
      />
    </AppShell>
  );
}
