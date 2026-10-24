import { AppShell } from "@/components/app-shell";
import { IconeMais } from "@/components/icones";
import { Button } from "@/components/ui";
import { ServicosClient } from "./servicos-client";

import { contarEstatisticasServicos, listarServicosParaGestaoPaginado } from "@/lib/servicos";
import { lerFiltroStatus, statusParaAtivo } from "@/lib/cadastros-filtros";
import { lerPaginacaoDeSearchParams } from "@/lib/paginacao";
import { lerBuscaDeSearchParams } from "@/lib/busca-listagem";

import { exigirSessao } from "@/lib/auth-server";
import { obterDadosEmpresaComCache as obterDadosEmpresa } from "@/lib/dados-cache";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Serviços",
  description: "Cadastro e consulta de serviços da sapataria.",
};

export default async function ServicosPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sessao = await exigirSessao();

  const searchParams = await props.searchParams;
  const busca = lerBuscaDeSearchParams(searchParams);
  const filtroStatus = lerFiltroStatus(searchParams);
  const [{ data: servicos, pagination }, estatisticas, dadosEmpresa] = await Promise.all([
    listarServicosParaGestaoPaginado({
      busca,
      ativo: statusParaAtivo(filtroStatus),
      paginacao: lerPaginacaoDeSearchParams(searchParams),
    }),
    contarEstatisticasServicos(),
    obterDadosEmpresa(),
  ]);

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      usuario={sessao}
      eyebrow="Catálogo"
      title="Serviços"
      description="Serviços prestados pela sapataria e seus preços base sugeridos na OS."
      actions={
        <Button href="#cadastro-rapido" icon={<IconeMais />}>
          Novo serviço
        </Button>
      }
    >
      <ServicosClient
        busca={busca}
        pagination={pagination}
        estatisticas={estatisticas}
        filtroStatus={filtroStatus}
        servicos={servicos.map((servico) => ({
          id: servico.id,
          nome: servico.nome,
          descricao: servico.descricao,
          precoBase: Number(servico.precoBase),
          ativo: servico.ativo,
          criadoEm: servico.criadoEm.toISOString(),
        }))}
      />
    </AppShell>
  );
}
