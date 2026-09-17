import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { OrdensServicoClient } from "./ordens-servico-client";
import { LoadingState } from "@/components/ui";

import {
  contarEstatisticasOrdensServico,
  listarOrdensServicoPaginado,
} from "@/lib/ordens-servico";
import { normalizarFiltrosListagemOrdensServico } from "@/lib/ordens-servico-listagem";
import { lerPaginacaoDeSearchParams } from "@/lib/paginacao";

export const dynamic = "force-dynamic";
import { listarClientes } from "@/lib/clientes";
import { listarServicos } from "@/lib/servicos";

import { exigirSessao } from "@/lib/auth-server";

export const metadata = {
  title: "Ordens de Serviço",
  description: "Listagem e cadastro inicial de ordens de serviço.",
};

export default async function OrdensServicoPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await exigirSessao();

  const searchParams = await props.searchParams;
  const filtros = normalizarFiltrosListagemOrdensServico(searchParams);
  const paginacao = lerPaginacaoDeSearchParams(searchParams);

  // Executa consultas independentes em paralelo para evitar N+1/waterfall.
  // A listagem é paginada no banco; os contadores usam count sobre o
  // conjunto completo (não dependem da página nem do filtro ativo).
  const [resultado, estatisticas, clientes, servicos] = await Promise.all([
    listarOrdensServicoPaginado({ filtros, paginacao }),
    contarEstatisticasOrdensServico(),
    listarClientes(undefined, { apenasAtivos: true }),
    listarServicos(),
  ]);

  return (
    <AppShell
      eyebrow="Operação e atendimento"
      title="Ordens de Serviço"
      description="Acompanhe a fila de ordens, consulte os campos principais e cadastre novas OS integradas ao banco de dados."
      action={{ href: "/ordens-servico?nova=1", label: "Nova ordem" }}
    >
      <Suspense fallback={<LoadingState text="Carregando ordens de serviço..." />}>
        <OrdensServicoClient
          initialOrders={resultado.data}
          pagination={resultado.pagination}
          estatisticas={estatisticas}
          filtros={filtros}
          clientes={clientes}
          servicos={servicos.map((servico) => ({
            id: servico.id,
            nome: servico.nome,
            precoBase: servico.precoBase.toString(),
          }))}
        />
      </Suspense>
    </AppShell>
  );
}
