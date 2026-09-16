import { AppShell } from "@/components/app-shell";
import { ServicosClient } from "./servicos-client";

import { listarServicosParaGestaoPaginado } from "@/lib/servicos";
import { lerPaginacaoDeSearchParams } from "@/lib/paginacao";
import { lerBuscaDeSearchParams } from "@/lib/busca-listagem";

import { exigirSessao } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Serviços",
  description: "Cadastro e consulta de serviços da sapataria.",
};

export default async function ServicosPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await exigirSessao();

  const searchParams = await props.searchParams;
  const busca = lerBuscaDeSearchParams(searchParams);
  const { data: servicos, pagination } = await listarServicosParaGestaoPaginado({
    busca,
    paginacao: lerPaginacaoDeSearchParams(searchParams),
  });

  return (
    <AppShell
      eyebrow="Catálogo"
      title="Serviços"
      description="Gerencie os serviços prestados pela sapataria."
      action={{ href: "/ordens-servico", label: "Ir para OS" }}
    >
      <ServicosClient
        busca={busca}
        pagination={pagination}
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
