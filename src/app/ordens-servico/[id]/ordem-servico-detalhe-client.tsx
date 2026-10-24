"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge, Button, Card, PanelHeader, LoadingState, ErrorState, EmptyState, Input } from "@/components/ui";
import { Combobox } from "@/components/combobox";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CompartilharAcompanhamentoDialog } from "@/components/compartilhar-acompanhamento-dialog";
import { SugerirWhatsAppConclusaoDialog } from "@/components/sugerir-whatsapp-conclusao-dialog";
import { SugerirWhatsAppAvaliacaoDialog } from "@/components/sugerir-whatsapp-avaliacao-dialog";
import { PageHeader } from "@/components/page-header";
import { IconeCheck, IconeCompartilhar, IconeLixeira } from "@/components/icones";
import { Tabela, TabelaCabecalho, TabelaCelula, TabelaColuna, TabelaLinha } from "@/components/data-table";
import { formatPhone, whatsappLink } from "@/lib/formatters";
import type { DadosSugestaoAvaliacao } from "@/lib/os-avaliacao-whatsapp";
import type { DadosSugestaoConclusao } from "@/lib/os-conclusao-whatsapp";
import { ordemServicoEstaAtrasada } from "@/lib/ordens-servico-listagem";
import { diferencaDiasOperacionais } from "@/lib/ordens-servico-prazo";
import {
  montarEtapasProgresso,
  montarLinhaDoTempo,
  rotuloTipoItem,
  somarCustoInsumos,
} from "@/lib/ordens-servico-progresso";
import {
  proximaAcaoStatus,
  rotuloStatusFinanceiro,
  rotuloStatusOperacional,
  tomStatusFinanceiro,
  tomStatusOperacional,
} from "@/lib/ordens-servico-status-apresentacao";
import {
  MENSAGEM_CANCELAMENTO_COM_PAGAMENTO,
  MENSAGEM_CANCELAMENTO_COM_SINAL_LEGADO,
  podeCancelarOrdemServico,
  podeCancelarOrdemServicoComFinanceiro,
} from "@/lib/ordens-servico-status";

import {
  OrdemServicoDetalhe,
  FormaPagamento,
  InsumoDisponivel,
  ServicoDisponivel,
  EstadoTela,
  ServicoItem,
  ItemOS
} from "./types";
import { currencyFormatter, deveExibirReceberPagamento } from "./utils";
import { useAcoesOrdemServico } from "../use-acoes-ordem-servico";

import { ReceberPagamentoForm } from "./components/ReceberPagamentoForm";
import { AplicarInsumoForm } from "./components/AplicarInsumoForm";
import { HistoricoPagamentosList } from "./components/HistoricoPagamentosList";
import { FotoRecebimentoItem } from "./components/FotoRecebimentoItem";
import { OrdemServicoStepper } from "./components/OrdemServicoStepper";
import { OrdemServicoLinhaDoTempo } from "./components/OrdemServicoLinhaDoTempo";
import { ResumoFinanceiroCard } from "./components/ResumoFinanceiroCard";

const dataCompleta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
const COLUNAS_INSUMOS = "1.6fr 1fr 1fr 1fr";

function plural(n: number, singular: string, pluralTexto: string) {
  return n === 1 ? `1 ${singular}` : `${n} ${pluralTexto}`;
}

function CampoVisaoGeral({ rotulo, valor, detalhe, tom = "padrao" }: { rotulo: string; valor: React.ReactNode; detalhe?: React.ReactNode; tom?: "padrao" | "perigo" }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-soft)]">{rotulo}</p>
      <div className={`mt-1 truncate text-sm font-bold ${tom === "perigo" ? "text-[color:var(--danger)]" : "text-[color:var(--text)]"}`}>{valor}</div>
      {detalhe ? <div className={`text-xs ${tom === "perigo" ? "font-semibold text-[color:var(--danger)]" : "text-[color:var(--text-soft)]"}`}>{detalhe}</div> : null}
    </div>
  );
}

function FotoMiniatura({ ordemId, item }: { ordemId: string; item: ItemOS }) {
  const primeira = item.fotos[0];
  const src = primeira
    ? `/api/ordens-servico/${ordemId}/itens/${item.id}/fotos/${primeira.id}`
    : item.possuiFotoRecebimento
      ? `/api/ordens-servico/${ordemId}/itens/${item.id}/foto`
      : null;

  return (
    <div className="relative flex h-[132px] w-full items-center justify-center overflow-hidden rounded-[14px] border border-dashed border-[rgba(74,53,35,0.3)] bg-[color:var(--surface-muted)] sm:w-[132px]">
      {src ? (
        <Image src={src} alt={`Foto de recebimento de ${item.descricao}`} fill unoptimized className="object-cover" />
      ) : (
        <span className="px-3 text-center text-xs font-semibold text-[color:var(--text-soft)]">Foto de recebimento</span>
      )}
    </div>
  );
}

export function OrdemServicoDetalheClient({
  ordemServicoId,
  initialOrdem,
  formasPagamento,
  insumosDisponiveis,
  servicosDisponiveis,
  nomeEmpresa = "",
}: {
  ordemServicoId: string;
  initialOrdem: OrdemServicoDetalhe | null;
  formasPagamento: FormaPagamento[];
  insumosDisponiveis: InsumoDisponivel[];
  servicosDisponiveis: ServicoDisponivel[];
  /** Nome exibido nas mensagens sugeridas de WhatsApp. */
  nomeEmpresa?: string;
}) {
  const [estado, setEstado] = useState<EstadoTela>(initialOrdem ? "sucesso" : "nao-encontrada");
  const [erro, setErro] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<OrdemServicoDetalhe | null>(initialOrdem);
  const requisicaoAtual = useRef(0);

  const [itemServicoEditando, setItemServicoEditando] = useState<string | null>(null);
  const [servicosEditando, setServicosEditando] = useState<ServicoItem[]>([]);
  const [servicosErro, setServicosErro] = useState<string | null>(null);
  const [salvandoServicos, setSalvandoServicos] = useState(false);
  const [fotosAbertas, setFotosAbertas] = useState<Record<string, boolean>>({});

  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [cancelamentoErro, setCancelamentoErro] = useState<string | null>(null);
  const [cancelamentoSucesso, setCancelamentoSucesso] = useState<string | null>(null);
  const [compartilhando, setCompartilhando] = useState(false);
  const fecharCompartilhamento = useCallback(() => setCompartilhando(false), []);
  const [sugestaoConclusao, setSugestaoConclusao] = useState<DadosSugestaoConclusao | null>(null);
  const fecharSugestaoConclusao = useCallback(() => setSugestaoConclusao(null), []);
  const [sugestaoAvaliacao, setSugestaoAvaliacao] = useState<DadosSugestaoAvaliacao | null>(null);
  const fecharSugestaoAvaliacao = useCallback(() => setSugestaoAvaliacao(null), []);

  useEffect(() => {
    requisicaoAtual.current += 1;
    setOrdem(initialOrdem);
    setEstado(initialOrdem ? "sucesso" : "nao-encontrada");
    setErro(null);
    return () => { requisicaoAtual.current += 1; };
  }, [initialOrdem, ordemServicoId]);

  const carregarDetalhe = useCallback(async (silencioso = false) => {
    const numeroRequisicao = ++requisicaoAtual.current;
    setErro(null);
    if (!silencioso) {
      setEstado("carregando");
    }
    try {
      const response = await fetch(`/api/ordens-servico/${ordemServicoId}`, {
        method: "GET",
        cache: "no-store",
      });
      if (numeroRequisicao !== requisicaoAtual.current) return;
      if (response.status === 404) {
        setEstado("nao-encontrada");
        setOrdem(null);
        return;
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (numeroRequisicao !== requisicaoAtual.current) return;
        throw new Error(payload?.message || "Não foi possível carregar o detalhe da OS.");
      }
      const payload = (await response.json()) as { ordemServico: OrdemServicoDetalhe };
      if (numeroRequisicao !== requisicaoAtual.current) return;
      setOrdem(payload.ordemServico);
      setEstado("sucesso");
    } catch (falha) {
      if (numeroRequisicao !== requisicaoAtual.current) return;
      setErro(falha instanceof Error ? falha.message : "Falha de comunicação ao carregar a OS.");
      if (!silencioso) setEstado("erro");
    }
  }, [ordemServicoId]);

  // Avanço de status com as mesmas sugestões de WhatsApp da listagem.
  const acoes = useAcoesOrdemServico(
    ordem ?? { id: ordemServicoId, numero: "", status: "", cliente: null },
    {
      nomeExibicaoEmpresa: nomeEmpresa,
      onConcluida: setSugestaoConclusao,
      onEntregue: setSugestaoAvaliacao,
      aoAtualizar: () => void carregarDetalhe(true),
    },
  );

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

  const fecharConfirmacaoCancelamento = useCallback(() => {
    if (cancelando) return;
    setConfirmandoCancelamento(false);
  }, [cancelando]);

  const cancelarOrdemServico = async () => {
    if (cancelando) return;
    setCancelando(true);
    setCancelamentoErro(null);
    setCancelamentoSucesso(null);
    try {
      const response = await fetch(`/api/ordens-servico/${ordemServicoId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusNovo: "CANCELADA" }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setCancelamentoErro(payload?.message || "Não foi possível cancelar a ordem de serviço.");
        // Recarrega para refletir o estado persistido (ex.: outro operador alterou o status).
        await carregarDetalhe(true);
        return;
      }
      setConfirmandoCancelamento(false);
      setCancelamentoSucesso("Ordem de serviço cancelada. Ela continua registrada no sistema.");
      await carregarDetalhe(true);
    } catch {
      setCancelamentoErro("Falha de comunicação ao cancelar a ordem de serviço.");
    } finally {
      setCancelando(false);
    }
  };

  const resumo = useMemo(() => ordem?.resumoFinanceiro, [ordem]);
  const etapas = useMemo(() => (ordem ? montarEtapasProgresso(ordem) : []), [ordem]);
  const eventos = useMemo(() => (ordem ? montarLinhaDoTempo(ordem) : []), [ordem]);

  const breadcrumbBase = [{ label: "Ordens de Serviço", href: "/ordens-servico" }];

  if (estado === "carregando") {
    return <LoadingState text="Buscando detalhe da OS..." />;
  }

  if (estado === "erro") {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader breadcrumb={[...breadcrumbBase, { label: "Detalhe" }]} title="Detalhe da OS" />
        <ErrorState
          title="Falha ao carregar a OS"
          description={erro || "Ocorreu um erro inesperado."}
          action={<Button type="button" onClick={() => void carregarDetalhe()}>Tentar novamente</Button>}
        />
      </div>
    );
  }

  if (estado === "nao-encontrada") {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader breadcrumb={[...breadcrumbBase, { label: "Detalhe" }]} title="Detalhe da OS" />
        <EmptyState
          title="Ordem de Serviço não encontrada"
          description="Verifique se o identificador está correto ou retorne para a listagem."
          action={<Button href="/ordens-servico">Ir para listagem</Button>}
        />
      </div>
    );
  }

  if (!ordem || !resumo) {
    return null;
  }

  const atrasada = ordemServicoEstaAtrasada(ordem);
  const diasParaPrevisao = diferencaDiasOperacionais(new Date(), ordem.dataPrevisao);
  const diasDesdeEntrada = diferencaDiasOperacionais(ordem.dataEntrada, new Date());
  const proxima = proximaAcaoStatus(ordem.status);
  const cancelada = ordem.status === "CANCELADA";
  const encerrada = cancelada || ordem.status === "ENTREGUE" || ordem.status === "CONCLUIDA";
  const telefone = ordem.cliente.telefone;
  const linkWhatsapp = telefone ? whatsappLink(telefone) : "";
  const descricaoItens = ordem.itens.map((item) => item.descricao).join(", ");

  let detalhePrevisao: string;
  if (encerrada) {
    detalhePrevisao = "prazo encerrado";
  } else if (atrasada) {
    detalhePrevisao = `vencida há ${plural(-diasParaPrevisao, "dia", "dias")}`;
  } else if (diasParaPrevisao === 0) {
    detalhePrevisao = "vence hoje";
  } else {
    detalhePrevisao = `em ${plural(diasParaPrevisao, "dia", "dias")}`;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[...breadcrumbBase, { label: ordem.numero }]}
        title={ordem.numero}
        badges={
          <>
            <Badge size="md" tone={tomStatusOperacional(ordem.status)}>{rotuloStatusOperacional(ordem.status)}</Badge>
            {cancelada ? null : (
              <Badge size="md" tone={tomStatusFinanceiro(resumo.statusFinanceiro)}>{rotuloStatusFinanceiro(resumo.statusFinanceiro)}</Badge>
            )}
            {atrasada ? <Badge size="md" tone="danger">Atrasada · {plural(-diasParaPrevisao, "dia", "dias")}</Badge> : null}
          </>
        }
        description={
          <>
            {ordem.cliente.nome}
            {descricaoItens ? ` · ${descricaoItens}` : ""} · entrada em {dataCompleta.format(new Date(ordem.dataEntrada))}, previsão{" "}
            {dataCompleta.format(new Date(ordem.dataPrevisao))}
          </>
        }
        actions={
          <>
            <Button type="button" variant="secondary" icon={<IconeCompartilhar />} onClick={() => setCompartilhando(true)}>
              Compartilhar acompanhamento
            </Button>
            {podeCancelarOrdemServicoComFinanceiro(ordem.status, Number(resumo.valorPago || 0)) ? (
              <Button
                type="button"
                variant="secondary"
                className="text-[color:var(--danger)]"
                isLoading={cancelando}
                onClick={() => {
                  setCancelamentoErro(null);
                  setCancelamentoSucesso(null);
                  setConfirmandoCancelamento(true);
                }}
              >
                Cancelar OS
              </Button>
            ) : null}
            {proxima ? (
              <Button type="button" icon={<IconeCheck />} isLoading={acoes.statusPending} onClick={() => void acoes.avancarStatus(proxima.statusNovo)}>
                {proxima.rotulo}
              </Button>
            ) : null}
          </>
        }
      />

      {podeCancelarOrdemServico(ordem.status) && Number(resumo.valorPago || 0) > 0 && !cancelamentoErro ? (
        <p className="text-sm text-[color:var(--text-soft)]">
          {ordem.pagamentos.some((pagamento) => !pagamento.estorno) || !(Number(resumo.valorSinal || 0) > 0)
            ? MENSAGEM_CANCELAMENTO_COM_PAGAMENTO
            : MENSAGEM_CANCELAMENTO_COM_SINAL_LEGADO}
        </p>
      ) : null}
      {cancelamentoErro ? <p role="alert" className="text-sm font-semibold text-[color:var(--danger)]">{cancelamentoErro}</p> : null}
      {cancelamentoSucesso ? <p role="status" className="text-sm font-semibold text-[color:var(--success)]">{cancelamentoSucesso}</p> : null}
      {acoes.error ? <p role="alert" className="text-sm font-semibold text-[color:var(--danger)]">{acoes.error}</p> : null}
      {erro ? (
        <p role="alert" className="text-sm text-[color:var(--danger)]">
          {erro}{" "}
          <button type="button" className="underline" onClick={() => void carregarDetalhe(true)}>Tentar novamente</button>
        </p>
      ) : null}

      <OrdemServicoStepper etapas={etapas} />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Visão geral */}
          <Card className="flex flex-col gap-4 p-[22px]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <CampoVisaoGeral
                rotulo="Cliente"
                valor={ordem.cliente.nome}
                detalhe={
                  telefone ? (
                    linkWhatsapp ? (
                      <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer" className="font-semibold text-[color:var(--success)] hover:underline">
                        {formatPhone(telefone)} · WhatsApp
                      </a>
                    ) : (
                      formatPhone(telefone)
                    )
                  ) : (
                    "Sem telefone"
                  )
                }
              />
              <CampoVisaoGeral
                rotulo="Entrada"
                valor={dataCompleta.format(new Date(ordem.dataEntrada))}
                detalhe={diasDesdeEntrada <= 0 ? "hoje" : `há ${plural(diasDesdeEntrada, "dia", "dias")}`}
              />
              <CampoVisaoGeral
                rotulo="Previsão"
                valor={dataCompleta.format(new Date(ordem.dataPrevisao))}
                detalhe={detalhePrevisao}
                tom={atrasada ? "perigo" : "padrao"}
              />
              <CampoVisaoGeral
                rotulo="Conclusão"
                valor={ordem.dataConclusao ? dataCompleta.format(new Date(ordem.dataConclusao)) : "—"}
                detalhe={ordem.dataConclusao ? "serviço concluído" : cancelada ? "OS cancelada" : "ainda em execução"}
              />
            </div>
            <div className="rounded-[var(--r-field)] bg-[color:var(--background)] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-soft)]">Observações</p>
              <p className="mt-1 text-sm text-[color:var(--text)]">{ordem.observacoes || "Sem observações adicionais."}</p>
            </div>
          </Card>

          {/* Itens e serviços */}
          <Card className="overflow-hidden">
            <div className="border-b border-[color:var(--border)] px-[22px] py-4">
              <PanelHeader
                title="Itens e serviços"
                description={ordem.itens.length === 1 ? "1 item vinculado à ordem" : `${ordem.itens.length} itens vinculados à ordem`}
              />
            </div>
            <div className="flex flex-col gap-5 px-[22px] py-5">
              {ordem.itens.length === 0 ? (
                <p className="text-sm text-[color:var(--text-soft)]">Nenhum item vinculado.</p>
              ) : (
                ordem.itens.map((item) => {
                  const semFoto = item.fotos.length === 0 && !item.possuiFotoRecebimento;
                  const editavelFoto = ordem.status === "ABERTA";
                  const fotosVisiveis = fotosAbertas[item.id] ?? (semFoto && editavelFoto);
                  const custoInsumos = somarCustoInsumos(item.insumos);
                  return (
                    <article key={item.id} className="flex flex-col gap-4 border-b border-[rgba(74,53,35,0.1)] pb-5 last:border-b-0 last:pb-0">
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="flex shrink-0 flex-col gap-2">
                          <FotoMiniatura ordemId={ordem.id} item={item} />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            aria-expanded={fotosVisiveis}
                            aria-controls={`fotos-${item.id}`}
                            onClick={() => setFotosAbertas((atual) => ({ ...atual, [item.id]: !fotosVisiveis }))}
                          >
                            {fotosVisiveis ? "Ocultar fotos" : editavelFoto ? "Gerenciar fotos" : "Ver fotos"}
                          </Button>
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col gap-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <h3 className="text-[15px] font-extrabold text-[color:var(--text)]">{item.descricao}</h3>
                              <Badge tone="neutral">{rotuloTipoItem(item.tipoItem)}</Badge>
                            </div>
                            <p className="text-[15px] font-extrabold text-[color:var(--text)]">{currencyFormatter.format(Number(item.valor || 0))}</p>
                          </div>
                          {item.observacoes ? <p className="text-sm text-[color:var(--text-soft)]">{item.observacoes}</p> : null}

                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-bold text-[color:var(--text-body)]">Serviços</p>
                              {itemServicoEditando !== item.id ? (
                                <Button type="button" variant="secondary" size="sm" onClick={() => iniciarEdicaoServicos(item)}>
                                  Editar serviços
                                </Button>
                              ) : null}
                            </div>

                            {itemServicoEditando === item.id ? (
                              <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--accent-soft)] bg-[color:var(--accent-tint)] p-3">
                                <Combobox
                                  options={servicosDisponiveis
                                    .filter((servico) => !servicosEditando.some((itemEditado) => itemEditado.servico?.id === servico.id))
                                    .map((servico) => ({ value: servico.id, label: servico.nome }))}
                                  value=""
                                  onChange={adicionarServicoEdicao}
                                  placeholder="Adicionar serviço..."
                                />
                                {servicosEditando.map((servicoItem, index) => (
                                  <div key={servicoItem.id} className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[1fr_140px_40px]">
                                    <p className="col-span-2 text-sm font-semibold text-[color:var(--text)] sm:col-span-1">{servicoItem.servico?.nome || "Serviço"}</p>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={servicoItem.valor}
                                      aria-label={`Valor de ${servicoItem.servico?.nome || "serviço"}`}
                                      className="text-right"
                                      onChange={(event) => {
                                        const valor = Number(event.target.value);
                                        setServicosEditando((atuais) => atuais.map((atual, atualIndex) =>
                                          atualIndex === index ? { ...atual, valor: Number.isFinite(valor) ? valor : 0 } : atual,
                                        ));
                                      }}
                                    />
                                    <button
                                      type="button"
                                      aria-label={`Remover ${servicoItem.servico?.nome || "serviço"}`}
                                      onClick={() => setServicosEditando((atuais) => atuais.filter((_, atualIndex) => atualIndex !== index))}
                                      className="inline-flex h-11 w-10 items-center justify-center rounded-[10px] text-[color:var(--muted)] hover:bg-[color:var(--danger-soft)] hover:text-[color:var(--danger)]"
                                    >
                                      <IconeLixeira />
                                    </button>
                                  </div>
                                ))}
                                {servicosErro ? <p role="alert" className="text-sm text-[color:var(--danger)]">{servicosErro}</p> : null}
                                <div className="flex flex-wrap gap-2">
                                  <Button type="button" size="sm" isLoading={salvandoServicos} onClick={() => void salvarServicos()}>
                                    Salvar serviços
                                  </Button>
                                  <Button type="button" variant="secondary" size="sm" onClick={() => setItemServicoEditando(null)}>
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : null}

                            {item.servicos.length === 0 ? (
                              <p className="text-sm text-[color:var(--text-soft)]">Sem serviços vinculados.</p>
                            ) : (
                              <ul className="flex flex-col gap-2">
                                {item.servicos.map((servicoItem) => (
                                  <li key={servicoItem.id} className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] px-3.5 py-2.5 text-sm">
                                    <span className="font-semibold text-[color:var(--text)]">{servicoItem.servico?.nome || "Serviço não informado"}</span>
                                    <span className="font-bold text-[color:var(--text)]">
                                      {currencyFormatter.format(Number(servicoItem.valor || servicoItem.servico?.precoBase || 0))}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>

                      {fotosVisiveis ? (
                        <div id={`fotos-${item.id}`}>
                          <FotoRecebimentoItem
                            ordemServicoId={ordem.id}
                            itemId={item.id}
                            descricaoItem={item.descricao}
                            fotos={item.fotos}
                            possuiFotoLegada={item.possuiFotoRecebimento && item.fotos.length === 0}
                            editavel={editavelFoto}
                            onAtualizada={() => carregarDetalhe(true)}
                          />
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-bold text-[color:var(--text-body)]">Insumos utilizados</p>
                          {item.insumos.length > 0 ? (
                            <p className="text-xs text-[color:var(--text-soft)]">
                              Custo total <span className="font-bold text-[color:var(--text)]">{currencyFormatter.format(custoInsumos)}</span>
                            </p>
                          ) : null}
                        </div>
                        {item.insumos.length === 0 ? (
                          <p className="text-sm text-[color:var(--text-soft)]">Sem insumos vinculados.</p>
                        ) : (
                          <div className="overflow-hidden rounded-[10px] border border-[color:var(--border)]">
                            <Tabela aria-label={`Insumos utilizados em ${item.descricao}`}>
                              <TabelaCabecalho colunas={COLUNAS_INSUMOS}>
                                <TabelaColuna>Insumo</TabelaColuna>
                                <TabelaColuna>Quantidade</TabelaColuna>
                                <TabelaColuna>Custo unit.</TabelaColuna>
                                <TabelaColuna alinharDireita>Custo total</TabelaColuna>
                              </TabelaCabecalho>
                              {item.insumos.map((insumoAplicado) => (
                                <TabelaLinha key={insumoAplicado.id} colunas={COLUNAS_INSUMOS} className="py-2.5">
                                  <TabelaCelula rotulo="Insumo">
                                    <p className="truncate text-[13px] font-semibold text-[color:var(--text)]" title={insumoAplicado.observacoes ?? undefined}>
                                      {insumoAplicado.insumo?.nome || "Insumo"}
                                    </p>
                                  </TabelaCelula>
                                  <TabelaCelula rotulo="Quantidade">
                                    <span className="text-[13px] text-[color:var(--text)]">
                                      {Number(insumoAplicado.quantidade || 0)} {insumoAplicado.insumo?.unidadeMedida || "un"}
                                    </span>
                                  </TabelaCelula>
                                  <TabelaCelula rotulo="Custo unit.">
                                    <span className="text-[13px] text-[color:var(--text)]">
                                      {currencyFormatter.format(Number(insumoAplicado.custoUnitarioAplicado || 0))}
                                    </span>
                                  </TabelaCelula>
                                  <TabelaCelula rotulo="Custo total" alinharDireita>
                                    <span className="text-[13px] font-bold text-[color:var(--text)]">
                                      {currencyFormatter.format(Number(insumoAplicado.custoTotalAplicado || 0))}
                                    </span>
                                  </TabelaCelula>
                                </TabelaLinha>
                              ))}
                            </Tabela>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </Card>

          <OrdemServicoLinhaDoTempo eventos={eventos} />
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-6">
          <ResumoFinanceiroCard resumo={resumo} />

          {deveExibirReceberPagamento(resumo) ? (
            <ReceberPagamentoForm
              ordemServicoId={ordemServicoId}
              formasPagamento={formasPagamento}
              onPagamentoRegistrado={handleRefresh}
            />
          ) : null}

          <AplicarInsumoForm
            ordemServicoId={ordemServicoId}
            itensOrdem={ordem.itens}
            insumosDisponiveis={insumosDisponiveis}
            onInsumoRegistrado={handleRefresh}
          />

          <HistoricoPagamentosList
            ordemServicoId={ordemServicoId}
            pagamentos={ordem.pagamentos}
            podeEstornar={ordem.status !== "CANCELADA"}
            onEstornado={handleRefresh}
          />
        </aside>
      </div>

      <ConfirmDialog
        aberto={confirmandoCancelamento}
        titulo="Cancelar Ordem de Serviço?"
        descricao="Esta ação marcará a ordem como cancelada. A ordem continuará registrada no sistema."
        textoConfirmar="Cancelar OS"
        textoCancelar="Voltar"
        tone="danger"
        onConfirmar={() => void cancelarOrdemServico()}
        onCancelar={fecharConfirmacaoCancelamento}
        isConfirmando={cancelando}
      />
      <CompartilharAcompanhamentoDialog
        titulo="Compartilhar acompanhamento"
        dados={
          compartilhando
            ? {
                numeroOS: ordem.numero,
                nomeCliente: ordem.cliente.nome,
                telefone: ordem.cliente.telefone,
                caminhoAcompanhamento: ordem.caminhoAcompanhamento,
              }
            : null
        }
        onFechar={fecharCompartilhamento}
      />
      <SugerirWhatsAppConclusaoDialog dados={sugestaoConclusao} onFechar={fecharSugestaoConclusao} />
      <SugerirWhatsAppAvaliacaoDialog dados={sugestaoAvaliacao} onFechar={fecharSugestaoAvaliacao} />
    </div>
  );
}
