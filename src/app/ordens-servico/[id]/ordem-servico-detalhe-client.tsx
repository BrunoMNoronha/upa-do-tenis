"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge, Button, Card, PanelHeader, SectionTitle, LoadingState, ErrorState, EmptyState, Input } from "@/components/ui";
import { Combobox } from "@/components/combobox";

import {
  OrdemServicoDetalhe,
  FormaPagamento,
  InsumoDisponivel,
  ServicoDisponivel,
  EstadoTela,
  ServicoItem,
  ItemOS
} from "./types";
import {
  currencyFormatter,
  dateFormatter,
  formatarStatus,
  obterTomStatusFinanceiro
} from "./utils";

import { ReceberPagamentoForm } from "./components/ReceberPagamentoForm";
import { AplicarInsumoForm } from "./components/AplicarInsumoForm";
import { HistoricoPagamentosList } from "./components/HistoricoPagamentosList";

function LinhaResumo({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/5 py-2 text-sm last:border-b-0">
      <span className="text-slate-600">{label}</span>
      <strong className="text-[color:var(--text)]">{currencyFormatter.format(Number(valor || 0))}</strong>
    </div>
  );
}

export function OrdemServicoDetalheClient({
  ordemServicoId,
  formasPagamento,
  insumosDisponiveis,
  servicosDisponiveis,
}: {
  ordemServicoId: string;
  formasPagamento: FormaPagamento[];
  insumosDisponiveis: InsumoDisponivel[];
  servicosDisponiveis: ServicoDisponivel[];
}) {
  const [estado, setEstado] = useState<EstadoTela>("carregando");
  const [erro, setErro] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<OrdemServicoDetalhe | null>(null);

  const [itemServicoEditando, setItemServicoEditando] = useState<string | null>(null);
  const [servicosEditando, setServicosEditando] = useState<ServicoItem[]>([]);
  const [servicosErro, setServicosErro] = useState<string | null>(null);
  const [salvandoServicos, setSalvandoServicos] = useState(false);

  const carregarDetalhe = useCallback(async (silencioso = false) => {
    if (!silencioso) {
      setEstado("carregando");
      setErro(null);
    }

    const response = await fetch(`/api/ordens-servico/${ordemServicoId}`, {
      method: "GET",
      cache: "no-store",
    });

    if (response.status === 404) {
      setEstado("nao-encontrada");
      setOrdem(null);
      return;
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setErro(payload?.message || "Não foi possível carregar o detalhe da OS.");
      setEstado("erro");
      return;
    }

    const payload = (await response.json()) as { ordemServico: OrdemServicoDetalhe };
    setOrdem(payload.ordemServico);
    setEstado("sucesso");
  }, [ordemServicoId]);

  useEffect(() => {
    void carregarDetalhe();
  }, [carregarDetalhe]);

  const iniciarEdicaoServicos = (item: ItemOS) => {
    setItemServicoEditando(item.id);
    setServicosEditando(item.servicos);
    setServicosErro(null);
  };

  const adicionarServicoEdicao = (servicoId: string) => {
    if (!servicoId || servicosEditando.some((item) => item.servico?.id === servicoId)) {
      return;
    }
    const servico = servicosDisponiveis.find((item) => item.id === servicoId);
    if (!servico) return;
    setServicosEditando((atuais) => [
      ...atuais,
      { id: `novo-${servicoId}`, valor: servico.precoBase, servico },
    ]);
  };

  const salvarServicos = async () => {
    if (!itemServicoEditando) return;
    setSalvandoServicos(true);
    setServicosErro(null);
    try {
      const response = await fetch(`/api/ordens-servico/${ordemServicoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemOrdemServicoId: itemServicoEditando,
          servicos: servicosEditando.map((item) => ({
            servicoId: item.servico?.id,
            valor: Number(item.valor || 0),
          })),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setServicosErro(payload?.message || "Não foi possível atualizar os serviços.");
        return;
      }
      await carregarDetalhe(true);
      setItemServicoEditando(null);
      setServicosEditando([]);
    } catch {
      setServicosErro("Falha de comunicação ao atualizar os serviços.");
    } finally {
      setSalvandoServicos(false);
    }
  };

  const handleRefresh = async () => {
    await carregarDetalhe(true);
  };

  const resumo = useMemo(() => ordem?.resumoFinanceiro, [ordem]);

  if (estado === "carregando") {
    return <LoadingState text="Buscando detalhe da OS..." />;
  }

  if (estado === "erro") {
    return (
      <ErrorState 
        title="Falha ao carregar a OS" 
        description={erro || "Ocorreu um erro inesperado."} 
        action={<Button type="button" onClick={() => void carregarDetalhe()}>Tentar novamente</Button>}
      />
    );
  }

  if (estado === "nao-encontrada") {
    return (
      <EmptyState 
        title="Ordem de Serviço não encontrada" 
        description="Verifique se o identificador está correto ou retorne para a listagem."
        action={<Button href="/ordens-servico">Ir para listagem</Button>}
      />
    );
  }

  if (!ordem || !resumo) {
    return null;
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="border-b border-[color:var(--border)] bg-gradient-to-b from-[color:var(--accent-tint)] to-transparent p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--accent-strong)]">Detalhe da ordem</p>
                <SectionTitle className="mt-1 text-2xl">{ordem.numero}</SectionTitle>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span className="font-semibold text-[color:var(--text)]">{ordem.cliente.nome}</span>
                  <span>{ordem.cliente.telefone}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent">{formatarStatus(ordem.status)}</Badge>
                <Badge tone={obterTomStatusFinanceiro(resumo.statusFinanceiro)}>{formatarStatus(resumo.statusFinanceiro)}</Badge>
              </div>
            </div>
          </div>
          <div className="grid gap-3 p-6 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs uppercase tracking-[0.12em] text-slate-500">Cliente</p><p className="mt-1 font-semibold text-[color:var(--text)]">{ordem.cliente.nome}</p></div>
            <div><p className="text-xs uppercase tracking-[0.12em] text-slate-500">Status</p><p className="mt-1"><Badge tone="neutral">{formatarStatus(ordem.status)}</Badge></p></div>
            <div><p className="text-xs uppercase tracking-[0.12em] text-slate-500">Prazo</p><p className="mt-1 text-[color:var(--text)]">{dateFormatter.format(new Date(ordem.dataPrevisao))}</p></div>
            <div><p className="text-xs uppercase tracking-[0.12em] text-slate-500">Saldo</p><p className="mt-1 font-semibold text-rose-700">{currencyFormatter.format(Number(resumo.saldo || 0))}</p></div>
          </div>
          <div className="border-t border-[color:var(--border)] px-6 py-4">
            <p>
              <span className="font-semibold text-[color:var(--text)]">Entrada:</span>{" "}
              {dateFormatter.format(new Date(ordem.dataEntrada))}
            </p>
            <p>
              <span className="font-semibold text-[color:var(--text)]">Previsão:</span>{" "}
              {dateFormatter.format(new Date(ordem.dataPrevisao))}
            </p>
            <p>
              <span className="font-semibold text-[color:var(--text)]">Conclusão:</span>{" "}
              {ordem.dataConclusao ? dateFormatter.format(new Date(ordem.dataConclusao)) : "-"}
            </p>
            <p>
              <span className="font-semibold text-[color:var(--text)]">Observações:</span>{" "}
              {ordem.observacoes || "Sem observações adicionais."}
            </p>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-[color:var(--border)] p-5">
            <PanelHeader title="Itens e serviços" description={`${ordem.itens.length} item(ns) vinculado(s) à ordem`} />
          </div>
          <div className="p-6">
          {ordem.itens.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">Nenhum item vinculado.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {ordem.itens.map((item) => (
                <article key={item.id} className="rounded-2xl border border-black/10 bg-white/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-[color:var(--text)]">{item.descricao}</h3>
                    <Badge tone="neutral">{item.tipoItem}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">Valor do item: {currencyFormatter.format(Number(item.valor || 0))}</p>
                  {item.observacoes ? <p className="mt-1 text-sm text-slate-600">{item.observacoes}</p> : null}

                  <div className="mt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Serviços vinculados</p>
                      {itemServicoEditando !== item.id ? (
                        <Button type="button" variant="ghost" onClick={() => iniciarEdicaoServicos(item)}>
                        Editar serviços
                      </Button>
                      ) : null}
                    </div>

                    {itemServicoEditando === item.id ? (
                      <div className="mt-3 space-y-3 rounded-xl border border-[color:var(--accent-soft)] bg-slate-50 p-3">
                        <Combobox
                          options={servicosDisponiveis
                            .filter((servico) => !servicosEditando.some((itemEditado) => itemEditado.servico?.id === servico.id))
                            .map((servico) => ({ value: servico.id, label: servico.nome }))}
                          value=""
                          onChange={adicionarServicoEdicao}
                          placeholder="Adicionar serviço..."
                        />
                        {servicosEditando.map((servicoItem, index) => (
                          <div key={servicoItem.id} className="grid gap-2 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
                            <p className="text-sm font-medium text-slate-700">{servicoItem.servico?.nome || "Serviço"}</p>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={servicoItem.valor}
                              aria-label={`Valor de ${servicoItem.servico?.nome || "serviço"}`}
                              onChange={(event) => {
                                const valor = Number(event.target.value);
                                setServicosEditando((atuais) => atuais.map((atual, atualIndex) =>
                                  atualIndex === index ? { ...atual, valor: Number.isFinite(valor) ? valor : 0 } : atual,
                                ));
                              }}
                            />
                            <Button type="button" variant="ghost" onClick={() => setServicosEditando((atuais) => atuais.filter((_, atualIndex) => atualIndex !== index))}>
                              Remover
                            </Button>
                          </div>
                        ))}
                        {servicosErro ? <p className="text-sm text-red-600">{servicosErro}</p> : null}
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" disabled={salvandoServicos} onClick={() => void salvarServicos()}>
                            {salvandoServicos ? "Salvando..." : "Salvar serviços"}
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => setItemServicoEditando(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {item.servicos.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">Sem serviços vinculados.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {item.servicos.map((servicoItem) => (
                          <div key={servicoItem.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm">
                            <span className="font-medium text-[color:var(--text)]">{servicoItem.servico?.nome || "Serviço não informado"}</span>
                            <span className="text-slate-700">{currencyFormatter.format(Number(servicoItem.valor || servicoItem.servico?.precoBase || 0))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Insumos utilizados</p>
                    {item.insumos.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">Sem insumos vinculados.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {item.insumos.map((insumoAplicado) => (
                          <div key={insumoAplicado.id} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-[color:var(--text)]">{insumoAplicado.insumo?.nome || "Insumo"}</span>
                              <span className="text-slate-700">Custo: {currencyFormatter.format(Number(insumoAplicado.custoTotalAplicado || 0))}</span>
                            </div>
                            <p className="mt-1 text-slate-600">
                              Quantidade: {Number(insumoAplicado.quantidade || 0)} {insumoAplicado.insumo?.unidadeMedida || "un"}
                            </p>
                            <p className="mt-1 text-slate-600">
                              Custo unitário aplicado: {currencyFormatter.format(Number(insumoAplicado.custoUnitarioAplicado || 0))}
                            </p>
                            {insumoAplicado.observacoes ? (
                              <p className="mt-1 text-slate-600">Obs.: {insumoAplicado.observacoes}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-[color:var(--border)] p-5">
            <PanelHeader title="Linha do tempo" description="Status e movimentações da ordem" />
          </div>
          <div className="p-6">
          {ordem.historicosStatus.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">Sem histórico registrado.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {ordem.historicosStatus.map((historico) => (
                <article key={historico.id} className="rounded-2xl border border-black/10 bg-white/80 p-3 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold text-[color:var(--text)]">Data:</span>{" "}
                    {dateFormatter.format(new Date(historico.criadoEm))}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-[color:var(--text)]">Transição:</span>{" "}
                    {historico.statusAnterior ? `${formatarStatus(historico.statusAnterior)} -> ` : ""}
                    {formatarStatus(historico.statusNovo)}
                  </p>
                  {historico.observacao ? (
                    <p className="mt-1">
                      <span className="font-semibold text-[color:var(--text)]">Observação:</span> {historico.observacao}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
          </div>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-b from-[color:var(--accent-tint)] to-transparent p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Saldo a receber</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-[color:var(--text)]">{currencyFormatter.format(Number(resumo.saldo || 0))}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${Math.min(100, Math.round((Number(resumo.valorPago || 0) / Math.max(Number(resumo.valorTotal || 1), 1)) * 100))}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-600">{currencyFormatter.format(Number(resumo.valorPago || 0))} pagos de {currencyFormatter.format(Number(resumo.valorTotal || 0))}</p>
          </div>
          <div className="p-5">
          <div className="mt-3">
            <LinhaResumo label="Valor total" valor={resumo.valorTotal} />
            <LinhaResumo label="Desconto" valor={resumo.valorDesconto} />
            <LinhaResumo label="Sinal" valor={resumo.valorSinal} />
            <LinhaResumo label="Valor pago" valor={resumo.valorPago} />
            <LinhaResumo label="Saldo" valor={resumo.saldo} />
          </div>
          <div className="mt-4">
            <Badge tone={obterTomStatusFinanceiro(resumo.statusFinanceiro)}>
              Status financeiro: {formatarStatus(resumo.statusFinanceiro)}
            </Badge>
          </div>
          </div>
        </Card>

        <ReceberPagamentoForm
          ordemServicoId={ordemServicoId}
          formasPagamento={formasPagamento}
          onPagamentoRegistrado={handleRefresh}
        />

        <AplicarInsumoForm
          ordemServicoId={ordemServicoId}
          itensOrdem={ordem.itens}
          insumosDisponiveis={insumosDisponiveis}
          onInsumoRegistrado={handleRefresh}
        />

        <HistoricoPagamentosList pagamentos={ordem.pagamentos} />
      </aside>
    </section>
  );
}
