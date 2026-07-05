"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Badge, Button, Card, Input, Label, EmptyState } from "@/components/ui";
import { formatCurrency } from "@/lib/formatters";

type VendaSimples = {
  id: string;
  numero: string;
  dataVenda: Date | string;
  valorTotal: number;
  formaPagamento: string;
  quantidadeItens: number;
  observacoes?: string | null;
};

type FormaPagamento = {
  id: string;
  nome: string;
};

export function VendasClient({
  vendas,
  formasPagamento,
}: {
  vendas: VendaSimples[];
  formasPagamento: FormaPagamento[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dataInicial, setDataInicial] = useState(searchParams.get("dataInicial") || "");
  const [dataFinal, setDataFinal] = useState(searchParams.get("dataFinal") || "");
  const [formaPagamentoId, setFormaPagamentoId] = useState(searchParams.get("formaPagamentoId") || "");

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (dataInicial) params.set("dataInicial", dataInicial);
    else params.delete("dataInicial");
    
    if (dataFinal) params.set("dataFinal", dataFinal);
    else params.delete("dataFinal");
    
    if (formaPagamentoId) params.set("formaPagamentoId", formaPagamentoId);
    else params.delete("formaPagamentoId");

    router.push(`${pathname}?${params.toString()}`);
  }, [dataInicial, dataFinal, formaPagamentoId, pathname, router, searchParams]);

  const clearFilters = useCallback(() => {
    setDataInicial("");
    setDataFinal("");
    setFormaPagamentoId("");
    router.push(pathname);
  }, [pathname, router]);

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

      {vendas.length === 0 ? (
        <EmptyState
          title="Nenhuma venda encontrada"
          description="Ajuste os filtros ou registre uma nova venda de balcão."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vendas.map((venda) => (
            <article
              key={venda.id}
              className="rounded-3xl border border-black/10 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.03)] transition hover:border-[color:var(--accent-soft)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
                    {venda.numero}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-800">
                    {formatCurrency(venda.valorTotal)}
                  </h3>
                </div>
                <Badge tone="success">Concluída</Badge>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-700">Data:</span>{" "}
                  {new Date(venda.dataVenda).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Pagamento:</span>{" "}
                  {venda.formaPagamento}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Itens:</span>{" "}
                  {venda.quantidadeItens}
                </p>
                {venda.observacoes && (
                  <p className="truncate" title={venda.observacoes}>
                    <span className="font-semibold text-slate-700">Obs:</span>{" "}
                    {venda.observacoes}
                  </p>
                )}
              </div>

              <div className="mt-5 border-t pt-4">
                <Button href={`/vendas/${venda.id}`} variant="secondary" className="w-full">
                  Ver Detalhes
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
