"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge, Button, Card, Input, Label, PanelHeader, SectionTitle, Textarea, LoadingState, ErrorState, EmptyState } from "@/components/ui";
import { Combobox } from "@/components/combobox";

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email?: string | null;
  cpfCnpj?: string | null;
};

type ServicoItem = {
  id: string;
  valor: number;
  servico?: {
    id: string;
    nome: string;
    precoBase?: number;
  } | null;
};

type ItemOS = {
  id: string;
  tipoItem: string;
  descricao: string;
  valor: number;
  observacoes?: string | null;
  servicos: ServicoItem[];
  insumos: InsumoAplicado[];
};

type InsumoAplicado = {
  id: string;
  quantidade: number;
  custoUnitarioAplicado: number;
  custoTotalAplicado: number;
  observacoes?: string | null;
  insumo: {
    id: string;
    nome: string;
    unidadeMedida?: string;
  };
};

type InsumoDisponivel = {
  id: string;
  nome: string;
  unidadeMedida: string;
};

type ServicoDisponivel = {
  id: string;
  nome: string;
  precoBase: number;
};

type FormaPagamento = {
  id: string;
  nome: string;
  tipo?: string | null;
};

type Pagamento = {
  id: string;
  tipo: string;
  valor: number;
  dataPagamento: string;
  observacoes?: string | null;
  formaPagamento: FormaPagamento;
};

type HistoricoStatus = {
  id: string;
  statusAnterior?: string | null;
  statusNovo: string;
  observacao?: string | null;
  criadoEm: string;
};

type ResumoFinanceiro = {
  valorTotal: number;
  valorDesconto: number;
  valorSinal: number;
  valorPago: number;
  saldo: number;
  statusFinanceiro: "PENDENTE" | "PARCIAL" | "PAGO" | "CANCELADO";
};

type OrdemServicoDetalhe = {
  id: string;
  numero: string;
  status: string;
  dataEntrada: string;
  dataPrevisao: string;
  dataConclusao?: string | null;
  observacoes?: string | null;
  cliente: Cliente;
  itens: ItemOS[];
  pagamentos: Pagamento[];
  historicosStatus: HistoricoStatus[];
  resumoFinanceiro: ResumoFinanceiro;
};

type EstadoTela = "carregando" | "erro" | "nao-encontrada" | "sucesso";

type PagamentoFormValues = {
  formaPagamentoId: string;
  valor: string;
  dataPagamento: string;
  observacoes: string;
};

type InsumoFormValues = {
  itemOrdemServicoId: string;
  insumoId: string;
  quantidade: string;
  custoUnitarioAplicado: string;
  observacoes: string;
};

const pagamentoFormDefaultValues: PagamentoFormValues = {
  formaPagamentoId: "",
  valor: "",
  dataPagamento: "",
  observacoes: "",
};

const insumoFormDefaultValues: InsumoFormValues = {
  itemOrdemServicoId: "",
  insumoId: "",
  quantidade: "",
  custoUnitarioAplicado: "",
  observacoes: "",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatarStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function obterTomStatusFinanceiro(status: ResumoFinanceiro["statusFinanceiro"]) {
  if (status === "PAGO") return "success" as const;
  if (status === "PARCIAL") return "warning" as const;
  if (status === "CANCELADO") return "danger" as const;
  return "neutral" as const;
}

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
  const [pagamentoForm, setPagamentoForm] = useState<PagamentoFormValues>(pagamentoFormDefaultValues);
  const [pagamentoErro, setPagamentoErro] = useState<string | null>(null);
  const [pagamentoSucesso, setPagamentoSucesso] = useState<string | null>(null);
  const [enviandoPagamento, setEnviandoPagamento] = useState(false);
  const [insumoForm, setInsumoForm] = useState<InsumoFormValues>(insumoFormDefaultValues);
  const [insumoErro, setInsumoErro] = useState<string | null>(null);
  const [insumoSucesso, setInsumoSucesso] = useState<string | null>(null);
  const [enviandoInsumo, setEnviandoInsumo] = useState(false);
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

  const handlePagamentoInput = (field: keyof PagamentoFormValues, value: string) => {
    setPagamentoErro(null);
    setPagamentoSucesso(null);
    setPagamentoForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegistrarPagamento = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPagamentoErro(null);
    setPagamentoSucesso(null);

    if (!pagamentoForm.formaPagamentoId) {
      setPagamentoErro("Selecione uma forma de pagamento.");
      return;
    }

    if (!pagamentoForm.valor) {
      setPagamentoErro("Informe o valor do pagamento.");
      return;
    }

    const valorNumerico = Number(pagamentoForm.valor.replace(",", "."));
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      setPagamentoErro("Informe um valor maior que zero.");
      return;
    }

    if (!pagamentoForm.dataPagamento) {
      setPagamentoErro("Informe a data do pagamento.");
      return;
    }

    setEnviandoPagamento(true);

    try {
      const response = await fetch(`/api/ordens-servico/${ordemServicoId}/pagamentos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formaPagamentoId: pagamentoForm.formaPagamentoId,
          valor: valorNumerico,
          dataPagamento: pagamentoForm.dataPagamento,
          observacoes: pagamentoForm.observacoes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setPagamentoErro(payload?.message || "Não foi possível registrar o pagamento.");
        return;
      }

      await carregarDetalhe(true);
      setPagamentoForm(pagamentoFormDefaultValues);
      setPagamentoSucesso("Pagamento registrado com sucesso.");
    } catch {
      setPagamentoErro("Falha de comunicação ao registrar o pagamento.");
    } finally {
      setEnviandoPagamento(false);
    }
  };

  const handleInsumoInput = (field: keyof InsumoFormValues, value: string) => {
    setInsumoErro(null);
    setInsumoSucesso(null);
    setInsumoForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegistrarInsumo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInsumoErro(null);
    setInsumoSucesso(null);

    if (!insumoForm.itemOrdemServicoId) {
      setInsumoErro("Selecione o item da OS.");
      return;
    }

    if (!insumoForm.insumoId) {
      setInsumoErro("Selecione o insumo utilizado.");
      return;
    }

    const quantidade = Number(insumoForm.quantidade.replace(",", "."));
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      setInsumoErro("Informe uma quantidade maior que zero.");
      return;
    }

    const custoUnitarioAplicado = Number(insumoForm.custoUnitarioAplicado.replace(",", "."));
    if (!Number.isFinite(custoUnitarioAplicado) || custoUnitarioAplicado < 0) {
      setInsumoErro("Informe um custo unitário maior ou igual a zero.");
      return;
    }

    setEnviandoInsumo(true);

    try {
      const response = await fetch(`/api/ordens-servico/${ordemServicoId}/insumos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemOrdemServicoId: insumoForm.itemOrdemServicoId,
          insumoId: insumoForm.insumoId,
          quantidade,
          custoUnitarioAplicado,
          observacoes: insumoForm.observacoes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setInsumoErro(payload?.message || "Não foi possível registrar o insumo utilizado.");
        return;
      }

      await carregarDetalhe(true);
      setInsumoForm(insumoFormDefaultValues);
      setInsumoSucesso("Insumo vinculado ao item com sucesso.");
    } catch {
      setInsumoErro("Falha de comunicação ao registrar o insumo.");
    } finally {
      setEnviandoInsumo(false);
    }
  };

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
                      <Button type="button" variant="ghost" onClick={() => iniciarEdicaoServicos(item)}>
                        Editar serviços
                      </Button>
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

        <Card className="p-6">
          <PanelHeader title="Receber pagamento" description="O lançamento será registrado no caixa aberto." />

          {formasPagamento.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              Nenhuma forma de pagamento ativa está disponível. Cadastre uma forma em Financeiro para registrar pagamentos.
            </p>
          ) : (
            <form className="mt-4 grid gap-3" onSubmit={handleRegistrarPagamento}>
              <div className="grid gap-2">
                <Label htmlFor="formaPagamentoId">Forma de pagamento</Label>
                <select
                  id="formaPagamentoId"
                  value={pagamentoForm.formaPagamentoId}
                  onChange={(event) => handlePagamentoInput("formaPagamentoId", event.target.value)}
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[color:var(--accent-strong)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent-strong)]"
                  required
                >
                  <option value="">Selecione...</option>
                  {formasPagamento.map((forma) => (
                    <option key={forma.id} value={forma.id}>
                      {forma.nome}
                      {forma.tipo ? ` - ${forma.tipo}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="valorPagamento">Valor</Label>
                <Input
                  id="valorPagamento"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={pagamentoForm.valor}
                  onChange={(event) => handlePagamentoInput("valor", event.target.value)}
                  placeholder="0,00"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dataPagamento">Data de pagamento</Label>
                <Input
                  id="dataPagamento"
                  type="date"
                  value={pagamentoForm.dataPagamento}
                  onChange={(event) => handlePagamentoInput("dataPagamento", event.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="observacoesPagamento">Observações (opcional)</Label>
                <Textarea
                  id="observacoesPagamento"
                  rows={3}
                  value={pagamentoForm.observacoes}
                  onChange={(event) => handlePagamentoInput("observacoes", event.target.value)}
                  placeholder="Detalhes adicionais sobre o pagamento"
                />
              </div>

              {pagamentoErro ? (
                <div className="text-sm text-red-600">
                  <p>{pagamentoErro}</p>
                  {typeof pagamentoErro === "string" && pagamentoErro.includes("caixa") && (
                    <div className="mt-2">
                      <Button href="/caixa" type="button" variant="secondary">
                        Abrir o Caixa
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
              {pagamentoSucesso ? <p className="text-sm text-emerald-700">{pagamentoSucesso}</p> : null}

              <div>
                <Button type="submit" disabled={enviandoPagamento}>
                  {enviandoPagamento ? "Registrando..." : "Registrar pagamento"}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <Card className="p-6">
          <PanelHeader title="Insumos aplicados" description="Vincule o consumo ao item da ordem." />

          {ordem.itens.length === 0 || insumosDisponiveis.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              Para registrar insumo, a OS precisa ter item e deve existir insumo cadastrado ativo.
            </p>
          ) : (
            <form className="mt-4 grid gap-3" onSubmit={handleRegistrarInsumo}>
              <div className="grid gap-2">
                <Label htmlFor="itemOrdemServicoId">Item da OS</Label>
                <select
                  id="itemOrdemServicoId"
                  value={insumoForm.itemOrdemServicoId}
                  onChange={(event) => handleInsumoInput("itemOrdemServicoId", event.target.value)}
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[color:var(--accent-strong)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent-strong)]"
                  required
                >
                  <option value="">Selecione...</option>
                  {ordem.itens.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.descricao}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="insumoId">Insumo</Label>
                <select
                  id="insumoId"
                  value={insumoForm.insumoId}
                  onChange={(event) => handleInsumoInput("insumoId", event.target.value)}
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[color:var(--accent-strong)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent-strong)]"
                  required
                >
                  <option value="">Selecione...</option>
                  {insumosDisponiveis.map((insumo) => (
                    <option key={insumo.id} value={insumo.id}>
                      {insumo.nome} ({insumo.unidadeMedida})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="quantidadeInsumo">Quantidade</Label>
                  <Input
                    id="quantidadeInsumo"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={insumoForm.quantidade}
                    onChange={(event) => handleInsumoInput("quantidade", event.target.value)}
                    placeholder="0,00"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="custoUnitarioAplicado">Custo unitário aplicado</Label>
                  <Input
                    id="custoUnitarioAplicado"
                    type="number"
                    min="0"
                    step="0.01"
                    value={insumoForm.custoUnitarioAplicado}
                    onChange={(event) => handleInsumoInput("custoUnitarioAplicado", event.target.value)}
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="observacoesInsumo">Observações (opcional)</Label>
                <Textarea
                  id="observacoesInsumo"
                  rows={3}
                  value={insumoForm.observacoes}
                  onChange={(event) => handleInsumoInput("observacoes", event.target.value)}
                  placeholder="Informações adicionais do insumo aplicado"
                />
              </div>

              {insumoErro ? <p className="text-sm text-red-600">{insumoErro}</p> : null}
              {insumoSucesso ? <p className="text-sm text-emerald-700">{insumoSucesso}</p> : null}

              <div>
                <Button type="submit" disabled={enviandoInsumo}>
                  {enviandoInsumo ? "Registrando..." : "Registrar insumo"}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <Card className="p-6">
          <PanelHeader title="Pagamentos registrados" description={`${ordem.pagamentos.length} lançamento(s)`} />
          {ordem.pagamentos.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">Nenhum pagamento registrado até o momento.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {ordem.pagamentos.map((pagamento) => (
                <article key={pagamento.id} className="rounded-2xl border border-black/10 bg-white/80 p-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[color:var(--text)]">{currencyFormatter.format(Number(pagamento.valor || 0))}</p>
                    <Badge tone="accent">{pagamento.formaPagamento?.nome || "Forma não informada"}</Badge>
                  </div>
                  <p className="mt-1">Tipo: {pagamento.tipo}</p>
                  <p className="mt-1">Data: {dateFormatter.format(new Date(pagamento.dataPagamento))}</p>
                  {pagamento.observacoes ? <p className="mt-1">Obs.: {pagamento.observacoes}</p> : null}
                </article>
              ))}
            </div>
          )}
        </Card>
      </aside>
    </section>
  );
}