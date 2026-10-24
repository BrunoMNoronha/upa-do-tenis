import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { OrdensServicoClient } from "./ordens-servico-client";
import { Button, LoadingState } from "@/components/ui";
import { IconeCamera, IconeMais } from "@/components/icones";
import { LinkAcaoNaPagina } from "@/components/link-acao-na-pagina";
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
  const sessao = await exigirSessao();

  const searchParams = await props.searchParams;
  const filtros = normalizarFiltrosListagemOrdensServico(searchParams);
  const paginacao = lerPaginacaoDeSearchParams(searchParams);
  const dadosEmpresa = await obterDadosEmpresa();

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      usuario={sessao}
      eyebrow="Operação e atendimento"
      title="Ordens de Serviço"
      description="Acompanhe a fila de ordens, consulte os campos principais e cadastre novas OS."
      action={{ href: "/ordens-servico?nova=1", label: "Nova ordem" }}
      actions={
        <>
          <Button href="/os/fotos" variant="secondary" icon={<IconeCamera />}>
            Fotos da OS
          </Button>
          <LinkAcaoNaPagina href="/ordens-servico?nova=1" icon={<IconeMais />}>
            Nova ordem
          </LinkAcaoNaPagina>
        </>
      }
    >
      <Suspense fallback={<LoadingState text="Carregando ordens de serviço..." />}>
        <ListaOrdensServico filtros={filtros} paginacao={paginacao} nomeEmpresa={nomeExibicaoEmpresa(dadosEmpresa)} />
      </Suspense>
    </AppShell>
  );
}
