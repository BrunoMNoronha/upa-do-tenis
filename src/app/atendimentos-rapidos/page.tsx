import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/ui";
import { exigirSessao } from "@/lib/auth-server";
import { listarAtendimentosRapidosPaginado } from "@/lib/atendimento-rapido";
import { lerBuscaDeSearchParams } from "@/lib/busca-listagem";
import { lerPaginacaoDeSearchParams } from "@/lib/paginacao";
import { AtendimentosRapidosClient } from "./atendimentos-rapidos-client";

export const metadata = {
  title: "Histórico de Atendimentos Rápidos",
  description: "Consulta dos atendimentos rápidos registrados.",
};

export const dynamic = "force-dynamic";

export default async function AtendimentosRapidosPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await exigirSessao();
  const searchParams = await props.searchParams;

  const busca = lerBuscaDeSearchParams(searchParams);
  const dataInicial = typeof searchParams.dataInicial === "string" ? searchParams.dataInicial : undefined;
  const dataFinal = typeof searchParams.dataFinal === "string" ? searchParams.dataFinal : undefined;

  const { data, pagination } = await listarAtendimentosRapidosPaginado({
    filtros: { busca, dataInicial, dataFinal },
    paginacao: lerPaginacaoDeSearchParams(searchParams),
  });

  return (
    <AppShell
      eyebrow="Operação e Atendimento"
      title="Histórico de Atendimentos Rápidos"
      description="Consulte os atendimentos rápidos por código AR ou período."
    >
      <Suspense fallback={<LoadingState text="Carregando atendimentos rápidos..." />}>
        <AtendimentosRapidosClient atendimentos={data} pagination={pagination} busca={busca} />
      </Suspense>
    </AppShell>
  );
}
