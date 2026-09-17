"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Paginacao, usePaginacaoUrl } from "@/components/paginacao";
import { Button, Card, EmptyState, Input, Label } from "@/components/ui";
import { formatarCentavos, paraCentavos } from "@/lib/centavos";
import { resetarPagina, type PaginacaoInfo } from "@/lib/paginacao";
import type { AtendimentoRapidoListagem } from "@/lib/atendimento-rapido";

const dataHoraFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const moeda = (valor: number) => formatarCentavos(paraCentavos(valor) ?? 0);

export function AtendimentosRapidosClient({
  atendimentos,
  pagination,
  busca,
}: {
  atendimentos: AtendimentoRapidoListagem[];
  pagination: PaginacaoInfo;
  busca: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { criarHref } = usePaginacaoUrl();

  const [codigo, setCodigo] = useState(busca);
  const [dataInicial, setDataInicial] = useState(searchParams.get("dataInicial") || "");
  const [dataFinal, setDataFinal] = useState(searchParams.get("dataFinal") || "");

  const aplicarFiltros = useCallback(() => {
    // Alterar filtros volta para a página 1 (mantém pageSize).
    const params = resetarPagina(searchParams.toString());
    if (codigo.trim()) params.set("busca", codigo.trim());
    else params.delete("busca");
    if (dataInicial) params.set("dataInicial", dataInicial);
    else params.delete("dataInicial");
    if (dataFinal) params.set("dataFinal", dataFinal);
    else params.delete("dataFinal");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [codigo, dataInicial, dataFinal, pathname, router, searchParams]);

  const limparFiltros = useCallback(() => {
    setCodigo("");
    setDataInicial("");
    setDataFinal("");
    const pageSize = searchParams.get("pageSize");
    router.push(pageSize ? `${pathname}?pageSize=${pageSize}` : pathname);
  }, [pathname, router, searchParams]);

  return (
    <Card className="p-6">
      <form
        className="mb-6 grid gap-4 border-b pb-6 md:grid-cols-[minmax(0,1.4fr)_1fr_1fr_auto] md:items-end"
        onSubmit={(evento) => {
          evento.preventDefault();
          aplicarFiltros();
        }}
      >
        <div>
          <Label htmlFor="busca-atendimentos-rapidos">Código AR</Label>
          <Input
            id="busca-atendimentos-rapidos"
            type="search"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ex.: AR-17092026-0001"
            autoComplete="off"
          />
        </div>
        <div>
          <Label htmlFor="dataInicial">Data inicial</Label>
          <Input id="dataInicial" type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="dataFinal">Data final</Label>
          <Input id="dataFinal" type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button type="submit">Filtrar</Button>
          <Button type="button" variant="secondary" onClick={limparFiltros}>
            Limpar
          </Button>
        </div>
      </form>

      {atendimentos.length === 0 ? (
        <EmptyState
          title="Nenhum atendimento rápido encontrado"
          description="Ajuste a busca ou o período, ou registre um novo atendimento."
          action={<Button href="/atendimento-rapido">Novo atendimento</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {atendimentos.map((atendimento) => (
            <article
              key={atendimento.id}
              className="rounded-3xl border border-black/10 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.03)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
                    {atendimento.codigo}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{dataHoraFormatter.format(new Date(atendimento.dataHora))}</p>
                </div>
                <p className="text-lg font-semibold text-slate-800">{moeda(atendimento.valorTotal)}</p>
              </div>

              <div className="mt-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-700">Serviços</p>
                <ul className="mt-1 space-y-1">
                  {atendimento.itens.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span>{item.descricao}</span>
                      <span className="whitespace-nowrap">{moeda(item.valor)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-700">Pagamento</p>
                <ul className="mt-1 space-y-1">
                  {atendimento.pagamentos.map((pagamento) => (
                    <li key={pagamento.id} className="flex justify-between gap-3">
                      <span>{pagamento.formaPagamento.nome}</span>
                      <span className="whitespace-nowrap">{moeda(pagamento.valor)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {atendimento.observacoes ? (
                <p className="mt-3 truncate text-sm text-slate-600" title={atendimento.observacoes}>
                  <span className="font-semibold text-slate-700">Obs:</span> {atendimento.observacoes}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <div className="mt-6 border-t pt-4">
        <Paginacao pagination={pagination} rotulo="atendimentos" criarHref={criarHref} />
      </div>
    </Card>
  );
}
