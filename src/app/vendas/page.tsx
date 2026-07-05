import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/ui";
import { VendasClient } from "./vendas-client";
import { listarVendasBalcao } from "@/lib/vendas";
import { listarFormasPagamento } from "@/lib/formas-pagamento";

export const metadata = {
  title: "Histórico de Vendas | UPA do Tênis",
  description: "Histórico de vendas de balcão realizadas.",
};

export const dynamic = "force-dynamic";

export default async function VendasPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const dataInicial = typeof searchParams.dataInicial === "string" ? searchParams.dataInicial : undefined;
  const dataFinal = typeof searchParams.dataFinal === "string" ? searchParams.dataFinal : undefined;
  const formaPagamentoId = typeof searchParams.formaPagamentoId === "string" ? searchParams.formaPagamentoId : undefined;

  const vendas = await listarVendasBalcao({
    dataInicial,
    dataFinal,
    formaPagamentoId,
  });
  
  const formasPagamento = await listarFormasPagamento();

  return (
    <AppShell
      eyebrow="Operação e Atendimento"
      title="Histórico de Vendas"
      description="Consulte as vendas realizadas no balcão, filtre por período e forma de pagamento."
    >
      <Suspense fallback={<LoadingState text="Carregando histórico de vendas..." />}>
        <VendasClient vendas={vendas} formasPagamento={formasPagamento} />
      </Suspense>
    </AppShell>
  );
}
