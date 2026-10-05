import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { OrdensServicoClient } from "./ordens-servico-client";
import { LoadingState } from "@/components/ui";
import { obterDadosEmpresaComCache as obterDadosEmpresa } from "@/lib/dados-cache";
import { nomeExibicaoEmpresa } from "@/lib/dados-empresa";

import {
  contarEstatisticasOrdensServico,
  listarOrdensServicoResumoPaginado,
} from "@/lib/ordens-servico";
import { normalizarFiltrosListagemOrdensServico, type FiltrosListagemOrdensServico } from "@/lib/ordens-servico-listagem";
import { lerPaginacaoDeSearchParams, type PaginacaoNormalizada } from "@/lib/paginacao";

export const dynamic = "force-dynamic";
import { exigirSessao } from "@/lib/auth-server";

export const metadata = {
  title: "Ordens de Serviço",
  description: "Listagem e cadastro inicial de ordens de serviço.",
};

async function ListaOrdensServico({ filtros, paginacao, nomeEmpresa }: {
  filtros: FiltrosListagemOrdensServico;
  paginacao: PaginacaoNormalizada;
  nomeEmpresa: string;
}) {
  const [resultado, estatisticas] = await Promise.all([
    listarOrdensServicoResumoPaginado({ filtros, paginacao }),
    contarEstatisticasOrdensServico(),
  ]);

  return <OrdensServicoClient
    initialOrders={resultado.data}
    pagination={resultado.pagination}
    estatisticas={estatisticas}
    filtros={filtros}
    nomeEmpresa={nomeEmpresa}
  />;
}

export default async function OrdensServicoPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await exigirSessao();

  const searchParams = await props.searchParams;
  const filtros = normalizarFiltrosListagemOrdensServico(searchParams);
  const paginacao = lerPaginacaoDeSearchParams(searchParams);
  const dadosEmpresa = await obterDadosEmpresa();

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      eyebrow="Operação e atendimento"
      title="Ordens de Serviço"
      description="Acompanhe a fila de ordens, consulte os campos principais e cadastre novas OS integradas ao banco de dados."
      action={{ href: "/ordens-servico?nova=1", label: "Nova ordem" }}
    >
      <Suspense fallback={<LoadingState text="Carregando ordens de serviço..." />}>
        <ListaOrdensServico filtros={filtros} paginacao={paginacao} nomeEmpresa={nomeExibicaoEmpresa(dadosEmpresa)} />
      </Suspense>
    </AppShell>
  );
}
