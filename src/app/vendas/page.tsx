import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/ui";
import { VendasClient } from "./vendas-client";
import { listarVendasBalcaoPaginado } from "@/lib/vendas";
import { lerPaginacaoDeSearchParams } from "@/lib/paginacao";
import {
  listarFormasPagamentoComCache as listarFormasPagamento,
  obterDadosEmpresaComCache as obterDadosEmpresa,
} from "@/lib/dados-cache";

import { exigirSessao } from "@/lib/auth-server";

export const metadata = {
  title: "Histórico de Vendas",
  description: "Histórico de vendas de balcão realizadas.",
};

export const dynamic = "force-dynamic";

export default async function VendasPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await exigirSessao();
  const searchParams = await props.searchParams;

  const dataInicial = typeof searchParams.dataInicial === "string" ? searchParams.dataInicial : undefined;
  const dataFinal = typeof searchParams.dataFinal === "string" ? searchParams.dataFinal : undefined;
  const formaPagamentoId = typeof searchParams.formaPagamentoId === "string" ? searchParams.formaPagamentoId : undefined;

  const [{ data: vendas, pagination }, formasPagamento, dadosEmpresa] = await Promise.all([
    listarVendasBalcaoPaginado({
      filtros: { dataInicial, dataFinal, formaPagamentoId },
      paginacao: lerPaginacaoDeSearchParams(searchParams),
    }),
    listarFormasPagamento(),
    obterDadosEmpresa(),
  ]);

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      eyebrow="Operação e Atendimento"
      title="Histórico de Vendas"
      description="Consulte as vendas realizadas no balcão, filtre por período e forma de pagamento."
    >
      <Suspense fallback={<LoadingState text="Carregando histórico de vendas..." />}>
        <VendasClient vendas={vendas} formasPagamento={formasPagamento} pagination={pagination} />
      </Suspense>
    </AppShell>
  );
}
