"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button, Card, Input, Label, EmptyState } from "@/components/ui";
import { resetarPagina, type PaginacaoInfo } from "@/lib/paginacao";
import { Paginacao, usePaginacaoUrl } from "@/components/paginacao";
import { BotaoCancelarVenda, useCancelamentoVenda } from "./components/CancelarVenda";
import { VendaCardView, type VendaListagem } from "./components/VendaCard";

type FormaPagamento = {
  id: string;
  nome: string;
};

export function VendasClient({
  vendas,
  formasPagamento,
  pagination,
}: {
  vendas: VendaListagem[];
  formasPagamento: FormaPagamento[];
  pagination: PaginacaoInfo;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { criarHref } = usePaginacaoUrl();
  // Um único diálogo de cancelamento para a lista inteira.
  const cancelamento = useCancelamentoVenda();

  const [dataInicial, setDataInicial] = useState(searchParams.get("dataInicial") || "");
  const [dataFinal, setDataFinal] = useState(searchParams.get("dataFinal") || "");
  const [formaPagamentoId, setFormaPagamentoId] = useState(searchParams.get("formaPagamentoId") || "");

  const applyFilters = useCallback(() => {
    // Alterar filtros volta para a página 1 (mantém pageSize).
    const params = resetarPagina(searchParams.toString());

    if (dataInicial) params.set("dataInicial", dataInicial);
    else params.delete("dataInicial");

    if (dataFinal) params.set("dataFinal", dataFinal);
    else params.delete("dataFinal");

    if (formaPagamentoId) params.set("formaPagamentoId", formaPagamentoId);
    else params.delete("formaPagamentoId");

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [dataInicial, dataFinal, formaPagamentoId, pathname, router, searchParams]);

  const clearFilters = useCallback(() => {
    setDataInicial("");
    setDataFinal("");
    setFormaPagamentoId("");
    const pageSize = searchParams.get("pageSize");
    router.push(pageSize ? `${pathname}?pageSize=${pageSize}` : pathname);
  }, [pathname, router, searchParams]);

  return (
    <Card className="p-6">
      <div className="mb-6 grid gap-4 md:grid-cols-4 md:items-end border-b pb-6">
        <div>
          <Label htmlFor="dataInicial">Data Inicial</Label>
          <Input
            id="dataInicial"
            type="date"
            value={dataInicial}
            onChange={(e) => setDataInicial(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="dataFinal">Data Final</Label>
          <Input
            id="dataFinal"
            type="date"
            value={dataFinal}
            onChange={(e) => setDataFinal(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="formaPagamentoId">Forma de Pagamento</Label>
          <select
            id="formaPagamentoId"
            value={formaPagamentoId}
            onChange={(e) => setFormaPagamentoId(e.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]"
          >
            <option value="">Todas</option>
            {formasPagamento.map((fp) => (
              <option key={fp.id} value={fp.id}>
                {fp.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={applyFilters}>
            Filtrar
          </Button>
          <Button type="button" variant="secondary" onClick={clearFilters}>
            Limpar
          </Button>
        </div>
      </div>

      {cancelamento.avisoSucesso ? <div className="mb-4">{cancelamento.avisoSucesso}</div> : null}

      {vendas.length === 0 ? (
        <EmptyState
          title="Nenhuma venda encontrada"
          description="Ajuste os filtros ou registre uma nova venda de balcão."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vendas.map((venda) => (
            <VendaCardView
              key={venda.id}
              venda={venda}
              acaoCancelar={<BotaoCancelarVenda venda={venda} onAbrir={cancelamento.abrir} className="w-full" />}
            />
          ))}
        </div>
      )}

      <div className="mt-6 border-t pt-4">
        <Paginacao pagination={pagination} rotulo="vendas" criarHref={criarHref} />
      </div>

      {cancelamento.dialogo}
    </Card>
  );
}
