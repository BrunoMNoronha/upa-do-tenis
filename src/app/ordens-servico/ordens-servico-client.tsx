"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";

import { Badge, Card, FilterChip, KpiCard, PanelHeader, SearchInput, Button } from "@/components/ui";
import { Tabela, TabelaCabecalho, TabelaColuna, TabelaVazia } from "@/components/data-table";
import {
  CompartilharAcompanhamentoDialog,
  type DadosCompartilhamentoAcompanhamento,
} from "@/components/compartilhar-acompanhamento-dialog";
import { SugerirWhatsAppConclusaoDialog } from "@/components/sugerir-whatsapp-conclusao-dialog";
import { SugerirWhatsAppAvaliacaoDialog } from "@/components/sugerir-whatsapp-avaliacao-dialog";
import { type DadosSugestaoAvaliacao } from "@/lib/os-avaliacao-whatsapp";
import { type DadosSugestaoConclusao } from "@/lib/os-conclusao-whatsapp";
import type {
  FiltrosListagemOrdensServico,
  StatusFinanceiroListagem,
  StatusOperacionalListagem,
} from "@/lib/ordens-servico-listagem";
import type { EstatisticasOrdensServico, OrdemServicoResumo } from "@/lib/ordens-servico";
import { criarControladorFiltrosUrl } from "@/lib/filtros-url";
import type { PaginacaoInfo } from "@/lib/paginacao";
import { Paginacao, textoIntervalo, usePaginacaoUrl } from "@/components/paginacao";
import { COLUNAS_ORDENS, OrdemServicoLinha } from "./ordem-servico-linha";
import type { Cliente, Servico } from "./ordem-servico-form";

const OrdemServicoForm = dynamic(() => import("./ordem-servico-form").then((modulo) => modulo.OrdemServicoForm), {
  loading: () => <p className="p-6 text-sm" role="status">Carregando formulário...</p>,
});

type StatusFilter = StatusOperacionalListagem;
type OrdemServicoReal = OrdemServicoResumo;

const filterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "TODAS", label: "Todas" },
  { value: "ABERTA", label: "Abertas" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "CONCLUIDA", label: "Concluídas" },
  { value: "ENTREGUE", label: "Entregues" },
  { value: "CANCELADA", label: "Canceladas" },
];

const financeFilterOptions: Array<{ value: Exclude<StatusFinanceiroListagem, "TODAS">; label: string }> = [
  { value: "PENDENTES", label: "Pendentes" },
  { value: "PARCIAIS", label: "Parciais" },
  { value: "PAGAS", label: "Pagas" },
  { value: "COM_SALDO_EM_ABERTO", label: "Com saldo" },
];

type OrdemServicoListProps = {
  ordens: OrdemServicoReal[];
  pagination: PaginacaoInfo;
  estatisticas: EstatisticasOrdensServico;
  filtros: FiltrosListagemOrdensServico;
  nomeExibicaoEmpresa: string;
};

const BUSCA_DEBOUNCE_MS = 350;

function OrdemServicoList({ ordens, pagination, estatisticas, filtros, nomeExibicaoEmpresa }: OrdemServicoListProps) {
  // Estado no nível da lista: após router.refresh() a OS concluída pode sair
  // do filtro atual e desmontar, mas a sugestão de WhatsApp deve continuar aberta.
  const [sugestaoConclusao, setSugestaoConclusao] = useState<DadosSugestaoConclusao | null>(null);
  const fecharSugestaoConclusao = useCallback(() => setSugestaoConclusao(null), []);
  const [sugestaoAvaliacao, setSugestaoAvaliacao] = useState<DadosSugestaoAvaliacao | null>(null);
  const fecharSugestaoAvaliacao = useCallback(() => setSugestaoAvaliacao(null), []);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { criarHref } = usePaginacaoUrl();

  // Os filtros vigentes vêm do servidor (URL normalizada). O termo de busca
  // mantém estado local para o input responder a cada tecla, enquanto a
  // navegação para o servidor é feita com debounce.
  const statusFilter: StatusFilter = filtros.statusOperacional ?? "TODAS";
  const financeFilter: StatusFinanceiroListagem = filtros.statusFinanceiro ?? "TODAS";
  const showAtrasadas = filtros.atrasadas === true;
  const [searchTerm, setSearchTerm] = useState(filtros.busca ?? "");
  // Toda navegação de filtro parte do último estado pedido: uma busca com
  // debounce pendente não pode reaplicar parâmetros antigos depois de "Limpar".
  const [filtrosUrl] = useState(() =>
    criarControladorFiltrosUrl({
      inicial: searchParams.toString(),
      debounceMs: BUSCA_DEBOUNCE_MS,
      navegar: (qs) => {
        startTransition(() => {
          router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        });
      },
    }),
  );

  useEffect(() => {
    // Sincroniza o input quando a URL muda por fora (voltar/avançar, limpar).
    setSearchTerm(filtros.busca ?? "");
  }, [filtros.busca]);

  useEffect(() => {
    filtrosUrl.sincronizar(searchParams.toString());
  }, [filtrosUrl, searchParams]);

  useEffect(() => filtrosUrl.cancelar, [filtrosUrl]);

  /**
   * Aplica um filtro na URL e volta para a página 1. `page` é sempre
   * removido: mudar busca/filtro invalida a posição anterior.
   */
  const updateFilters = useCallback(
    (key: string, value: string) => {
      filtrosUrl.aplicar(key, value !== "TODAS" && value !== "false" ? value : null);
    },
    [filtrosUrl],
  );

  const limparFiltros = () => {
    setSearchTerm("");
    filtrosUrl.limpar(["statusOp", "statusFin", "busca", "atrasadas"]);
  };

  const aoDigitarBusca = (valor: string) => {
    setSearchTerm(valor);
    const termo = valor.trim();
    filtrosUrl.agendar("busca", termo !== "TODAS" && termo !== "false" ? termo : null);
  };

  // Total global vindo do servidor: não depende da página nem do filtro ativo.
  const totalAtrasadas = estatisticas.atrasadas;

  const toggleAtrasadas = () => updateFilters("atrasadas", (!showAtrasadas).toString());

  return (
    <div className="flex flex-col gap-5">
      {/* Contadores globais (clicáveis: aplicam o filtro correspondente) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Abertas"
          value={estatisticas.abertas}
          hint="aguardando análise"
          dot="warning"
          active={statusFilter === "ABERTA"}
          onClick={() => updateFilters("statusOp", statusFilter === "ABERTA" ? "TODAS" : "ABERTA")}
        />
        <KpiCard
          label="Em andamento"
          value={estatisticas.emAndamento}
          hint="na oficina"
          dot="accent"
          active={statusFilter === "EM_ANDAMENTO"}
          onClick={() => updateFilters("statusOp", statusFilter === "EM_ANDAMENTO" ? "TODAS" : "EM_ANDAMENTO")}
        />
        <KpiCard
          label="Com saldo em aberto"
          value={estatisticas.comSaldo}
          hint="ordens a receber"
          dot="success"
          active={financeFilter === "COM_SALDO_EM_ABERTO"}
          onClick={() => updateFilters("statusFin", financeFilter === "COM_SALDO_EM_ABERTO" ? "TODAS" : "COM_SALDO_EM_ABERTO")}
        />
        <KpiCard
          label="Atrasadas"
          value={totalAtrasadas}
          hint="prazo vencido e não entregues"
          tone="danger"
          active={showAtrasadas}
          linkLabel={showAtrasadas ? "Mostrar todas" : "Ver atrasadas →"}
          onClick={toggleAtrasadas}
        />
      </div>
      {totalAtrasadas > 0 ? (
        <p role="status" className="sr-only">
          {totalAtrasadas === 1 ? "1 ordem de serviço atrasada" : `${totalAtrasadas} ordens de serviço atrasadas`}
        </p>
      ) : null}

      {/* Busca e filtros */}
      <Card className="flex flex-col gap-3 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            id="busca-ordens"
            label="Buscar ordens de serviço"
            value={searchTerm}
            onChange={aoDigitarBusca}
            placeholder="Buscar por cliente, telefone, item ou número da OS..."
            isPending={isPending}
            className="min-w-[16rem] flex-1"
          />
          <span className="text-[13px] font-semibold text-[color:var(--text-soft)]">Ordenadas por favoritas e entrada</span>
          <Button type="button" variant="text" onClick={limparFiltros}>
            Limpar filtros
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div role="group" aria-label="Filtrar por status operacional" className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-bold text-[color:var(--text-soft)]">Status</span>
            {filterOptions.map((option) => (
              <FilterChip
                key={option.value}
                active={statusFilter === option.value}
                onClick={() => updateFilters("statusOp", option.value)}
              >
                {option.label}
              </FilterChip>
            ))}
          </div>
          <div role="group" aria-label="Filtrar por situação financeira" className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-bold text-[color:var(--text-soft)]">Financeiro</span>
            {financeFilterOptions.map((option) => (
              <FilterChip
                key={option.value}
                active={financeFilter === option.value}
                onClick={() => updateFilters("statusFin", financeFilter === option.value ? "TODAS" : option.value)}
              >
                {option.label}
              </FilterChip>
            ))}
          </div>
        </div>
      </Card>

      {/* Lista */}
      <Card className="flex flex-col overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-[22px] py-4">
          <PanelHeader
            title="OS registradas"
            badge={<Badge tone="accent" size="md">{pagination.total} ordens</Badge>}
            action={
              <p className="text-[13px] text-[color:var(--text-soft)]">
                {textoIntervalo(pagination)} · ordenadas por favoritas e entrada
              </p>
            }
          />
        </div>

        {isPending ? (
          <p className="px-[22px] pt-3 text-xs text-[color:var(--text-soft)]" role="status" aria-live="polite">
            Atualizando lista...
          </p>
        ) : null}

        <Tabela aria-label="Ordens de serviço">
          <TabelaCabecalho colunas={COLUNAS_ORDENS}>
            <TabelaColuna>
              <span className="sr-only">Favorita</span>
            </TabelaColuna>
            <TabelaColuna>OS / Cliente</TabelaColuna>
            <TabelaColuna>Item e serviços</TabelaColuna>
            <TabelaColuna>Prazo</TabelaColuna>
            <TabelaColuna>Total · Pago · Saldo</TabelaColuna>
            <TabelaColuna>Status</TabelaColuna>
            <TabelaColuna alinharDireita>Ações</TabelaColuna>
          </TabelaCabecalho>

          {ordens.length === 0 ? (
            <TabelaVazia mensagem="Nenhuma ordem encontrada." />
          ) : (
            <div className={isPending ? "opacity-60" : undefined} aria-busy={isPending}>
              {ordens.map((ordem) => (
                <OrdemServicoLinha
                  key={ordem.id}
                  ordem={ordem}
                  nomeExibicaoEmpresa={nomeExibicaoEmpresa}
                  onConcluida={setSugestaoConclusao}
                  onEntregue={setSugestaoAvaliacao}
                />
              ))}
            </div>
          )}
        </Tabela>

        <div className="mt-auto border-t border-[color:var(--border)] px-[22px] py-3">
          <Paginacao pagination={pagination} rotulo="ordens" criarHref={criarHref} carregando={isPending} exibirResumo={false} />
        </div>
      </Card>

      <SugerirWhatsAppConclusaoDialog dados={sugestaoConclusao} onFechar={fecharSugestaoConclusao} />
      <SugerirWhatsAppAvaliacaoDialog dados={sugestaoAvaliacao} onFechar={fecharSugestaoAvaliacao} />
    </div>
  );
}

const NOVA_ORDEM_PARAM = "nova";

export function OrdensServicoClient({
  initialOrders,
  pagination,
  estatisticas,
  filtros,
  nomeEmpresa,
}: {
  initialOrders: OrdemServicoReal[];
  pagination: PaginacaoInfo;
  estatisticas: EstatisticasOrdensServico;
  filtros: FiltrosListagemOrdensServico;
  nomeEmpresa: string;
}) {
  const ordens = initialOrders;
  const searchParams = useSearchParams();

  // O drawer é controlado pela URL (?nova=1). O Link "Nova ordem" navega via
  // App Router, que atualiza useSearchParams; um hash (#nova-ordem) não
  // dispara "hashchange" nessa navegação, por isso o hash não é mais usado.
  const drawerOpen = searchParams.get(NOVA_ORDEM_PARAM) === "1";
  const router = useRouter();
  // Atualização da lista pedida ao concluir o cadastro. Só roda depois que o
  // fechamento do drawer (replaceState) já refletiu em useSearchParams; antes
  // disso, o App Router abortaria a requisição do refresh.
  const [atualizarAposFechar, setAtualizarAposFechar] = useState(false);
  useEffect(() => {
    if (drawerOpen || !atualizarAposFechar) return;
    setAtualizarAposFechar(false);
    router.refresh();
  }, [drawerOpen, atualizarAposFechar, router]);
  const [compartilhamento, setCompartilhamento] =
    useState<DadosCompartilhamentoAcompanhamento | null>(null);
  const [opcoesCadastro, setOpcoesCadastro] = useState<{ clientes: Cliente[]; servicos: Servico[] } | null>(null);
  const [erroOpcoes, setErroOpcoes] = useState<string | null>(null);
  const [tentativaOpcoes, setTentativaOpcoes] = useState(0);
  const fecharCompartilhamento = useCallback(() => setCompartilhamento(null), []);

  useEffect(() => {
    if (!drawerOpen) {
      setOpcoesCadastro(null);
      setErroOpcoes(null);
      return;
    }
    const controller = new AbortController();
    setErroOpcoes(null);
    // Baixa o formulário em paralelo com as opções, em vez de só depois delas.
    void import("./ordem-servico-form").catch(() => {});
    fetch("/api/ordens-servico/opcoes-cadastro", { cache: "no-store", signal: controller.signal })
      .then(async (resposta) => {
        if (resposta.status === 401) {
          router.replace("/login");
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        if (!resposta.ok) throw new Error("Não foi possível carregar clientes e serviços.");
        return resposta.json() as Promise<{ clientes: Cliente[]; servicos: Servico[] }>;
      })
      .then((opcoes) => { if (!controller.signal.aborted) setOpcoesCadastro(opcoes); })
      .catch((falha) => {
        if (!controller.signal.aborted) setErroOpcoes(falha instanceof Error ? falha.message : "Falha de comunicação.");
      });
    return () => controller.abort();
  }, [drawerOpen, router, tentativaOpcoes]);

  const closeDrawer = useCallback(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(NOVA_ORDEM_PARAM)) return;
    url.searchParams.delete(NOVA_ORDEM_PARAM);
    // replaceState é integrado ao App Router (Next 14.1+): useSearchParams
    // reflete a mudança sem nova requisição ao servidor.
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);

  useEffect(() => {
    // Compatibilidade com links antigos (#nova-ordem) salvos pelo usuário.
    if (window.location.hash === "#nova-ordem") {
      const url = new URL(window.location.href);
      url.hash = "";
      url.searchParams.set(NOVA_ORDEM_PARAM, "1");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeDrawer, drawerOpen]);

  return (
    <section>
      <OrdemServicoList
        ordens={ordens}
        pagination={pagination}
        estatisticas={estatisticas}
        filtros={filtros}
        nomeExibicaoEmpresa={nomeEmpresa}
      />
      {drawerOpen ? (
        <>
          <button
            type="button"
            aria-label="Fechar cadastro de OS"
            onClick={closeDrawer}
            className="fixed inset-0 z-40 cursor-default bg-[rgba(15,23,42,0.45)]"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="cadastro-os-titulo"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[640px] flex-col overflow-y-auto border-l border-[color:var(--border)] bg-[color:var(--surface)] shadow-[-24px_0_60px_rgba(31,41,55,0.18)]"
          >
            {/* O formulário traz o título visível; enquanto carrega, o diálogo usa este rótulo. */}
            {opcoesCadastro ? null : (
              <h2 id="cadastro-os-titulo" className="sr-only">
                Nova ordem de serviço
              </h2>
            )}
            {erroOpcoes ? (
              <div role="alert" className="p-6 text-sm text-red-700">{erroOpcoes} <button type="button" className="underline" onClick={() => setTentativaOpcoes((atual) => atual + 1)}>Tentar novamente</button></div>
            ) : opcoesCadastro ? (
              <OrdemServicoForm
                clientes={opcoesCadastro.clientes}
                servicos={opcoesCadastro.servicos}
                onClose={closeDrawer}
                onCriada={(dados) => setCompartilhamento({ ...dados, nomeExibicaoEmpresa: nomeEmpresa })}
                onConcluida={() => setAtualizarAposFechar(true)}
              />
            ) : <p className="p-6 text-sm" role="status">Carregando clientes e serviços...</p>}
          </aside>
        </>
      ) : null}
      <CompartilharAcompanhamentoDialog
        dados={compartilhamento}
        onFechar={fecharCompartilhamento}
      />
    </section>
  );
}
