"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Paginacao, usePaginacaoUrl } from "@/components/paginacao";
import { Button, Card, EmptyState, Input, Label } from "@/components/ui";
import { validarMotivoEstorno } from "@/app/ordens-servico/[id]/components/HistoricoPagamentosList";
import { resetarPagina, type PaginacaoInfo } from "@/lib/paginacao";
import type { AtendimentoRapidoListagem } from "@/lib/atendimento-rapido";
import { AtendimentoRapidoCardView, EstornarAtendimentoRapidoDialogView } from "./components/AtendimentoRapidoCard";

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

  const [atendimentoEstornando, setAtendimentoEstornando] = useState<AtendimentoRapidoListagem | null>(null);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const cancelarEstorno = useCallback(() => {
    if (enviando) return;
    setAtendimentoEstornando(null);
  }, [enviando]);

  const abrirEstorno = (atendimento: AtendimentoRapidoListagem) => {
    setMotivo("");
    setErro(null);
    setSucesso(null);
    setAtendimentoEstornando(atendimento);
  };

  const confirmarEstorno = async () => {
    if (!atendimentoEstornando || enviando) return;
    const erroValidacao = validarMotivoEstorno(motivo);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const response = await fetch(`/api/atendimentos-rapidos/${atendimentoEstornando.id}/estorno`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setErro(payload?.message || "Não foi possível estornar o atendimento.");
        return;
      }
    } catch {
      setErro("Falha de comunicação ao estornar o atendimento.");
      return;
    } finally {
      setEnviando(false);
    }

    // O estorno já foi gravado: confirma e recarrega a lista do servidor.
    setSucesso(`Atendimento ${atendimentoEstornando.codigo} estornado.`);
    setAtendimentoEstornando(null);
    router.refresh();
  };

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

      {sucesso ? (
        <p role="status" className="mb-4 text-sm font-medium text-emerald-700">
          {sucesso}
        </p>
      ) : null}

      {atendimentos.length === 0 ? (
        <EmptyState
          title="Nenhum atendimento rápido encontrado"
          description="Ajuste a busca ou o período, ou registre um novo atendimento."
          action={<Button href="/atendimento-rapido">Novo atendimento</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {atendimentos.map((atendimento) => (
            <AtendimentoRapidoCardView key={atendimento.id} atendimento={atendimento} onEstornar={abrirEstorno} />
          ))}
        </div>
      )}

      <div className="mt-6 border-t pt-4">
        <Paginacao pagination={pagination} rotulo="atendimentos" criarHref={criarHref} />
      </div>

      <EstornarAtendimentoRapidoDialogView
        atendimento={atendimentoEstornando}
        motivo={motivo}
        erro={erro}
        enviando={enviando}
        onMotivoChange={(valor) => {
          setMotivo(valor);
          setErro(null);
        }}
        onConfirmar={() => void confirmarEstorno()}
        onCancelar={cancelarEstorno}
      />
    </Card>
  );
}
