"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";

import {
  Badge,
  Button,
  Card,
  FilterChip,
  Input,
  PanelHeader,
  StatCard,
} from "@/components/ui";
import {
  CompartilharAcompanhamentoDialog,
  type DadosCompartilhamentoAcompanhamento,
} from "@/components/compartilhar-acompanhamento-dialog";
import { SugerirWhatsAppConclusaoDialog } from "@/components/sugerir-whatsapp-conclusao-dialog";
import { SugerirWhatsAppAvaliacaoDialog } from "@/components/sugerir-whatsapp-avaliacao-dialog";
import { type DadosSugestaoAvaliacao } from "@/lib/os-avaliacao-whatsapp";
import {
  formatCurrency,
  formatPhone,
  whatsappLink,
} from "@/lib/formatters";
import { resumirItensOrdem } from "@/lib/ordens-servico-itens";
import type { OsStatus } from "@/lib/ordens-servico-status";
import { alterarStatusOS, type DadosSugestaoConclusao } from "@/lib/os-conclusao-whatsapp";
import {
  ordemServicoEstaAtrasada,
  type FiltrosListagemOrdensServico,
  type StatusFinanceiroListagem,
  type StatusOperacionalListagem,
} from "@/lib/ordens-servico-listagem";
import type { EstatisticasOrdensServico, OrdemServicoResumo } from "@/lib/ordens-servico";
import { criarControladorFiltrosUrl } from "@/lib/filtros-url";
import type { PaginacaoInfo } from "@/lib/paginacao";
import { Paginacao, usePaginacaoUrl } from "@/components/paginacao";
import type { Cliente, Servico } from "./ordem-servico-form";

const OrdemServicoForm = dynamic(() => import("./ordem-servico-form").then((modulo) => modulo.OrdemServicoForm), {
  loading: () => <p className="p-6 text-sm" role="status">Carregando formulário...</p>,
});
type StatusFilter = StatusOperacionalListagem;

const statusOptions: Array<{
  value: OsStatus;
  label: string;
  tone: "neutral" | "success" | "warning" | "danger" | "accent";
}> = [
  { value: "ABERTA", label: "Aberta", tone: "neutral" },
  { value: "EM_ANDAMENTO", label: "Em andamento", tone: "warning" },
  { value: "CONCLUIDA", label: "Concluída", tone: "success" },
  { value: "ENTREGUE", label: "Entregue", tone: "neutral" },
  { value: "CANCELADA", label: "Cancelada", tone: "danger" },
];

const filterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "TODAS", label: "Todas" },
  { value: "ABERTA", label: "Abertas" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "CONCLUIDA", label: "Concluídas" },
  { value: "ENTREGUE", label: "Entregues" },
  { value: "CANCELADA", label: "Canceladas" },
];

const financeFilterOptions: Array<{
  value: StatusFinanceiroListagem;
  label: string;
}> = [
  { value: "TODAS", label: "Todas" },
  { value: "PENDENTES", label: "Pendentes" },
  { value: "PARCIAIS", label: "Parciais" },
  { value: "PAGAS", label: "Pagas" },
  { value: "COM_SALDO_EM_ABERTO", label: "Com saldo em aberto" },
];

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});



function getStatusTone(
  status: string,
): "neutral" | "success" | "warning" | "danger" | "accent" {
  switch (status) {
    case "EM_ANDAMENTO":
      return "warning";
    case "CONCLUIDA":
      return "success";
    case "ENTREGUE":
      return "neutral";
    case "CANCELADA":
      return "danger";
    default:
      return "neutral";
  }
}

type OrdemServicoReal = OrdemServicoResumo;

function OrdemServicoCard({
  ordem,
  isAtrasada,
  onConcluida,
  onEntregue,
  nomeExibicaoEmpresa,
}: {
  ordem: OrdemServicoReal;
  isAtrasada: boolean;
  onConcluida: (dados: DadosSugestaoConclusao) => void;
  onEntregue: (dados: DadosSugestaoAvaliacao) => void;
  nomeExibicaoEmpresa: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [favoritaPending, setFavoritaPending] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  // Ref além do estado: dois cliques no mesmo tick ainda não veem o re-render.
  const statusEmAndamentoRef = useRef(false);
  const isFavorita = ordem.favorita === true;

  const statusLabel =
    statusOptions.find((o) => o.value === ordem.status)?.label ?? ordem.status;
  // Resume todos os itens recebidos, não só o primeiro (issue #205).
  const resumoItens = resumirItensOrdem(ordem.itens);
  const statusFinanceiroLabel =
    ordem.statusFinanceiro === "PARCIAL"
      ? "Parcial"
      : ordem.statusFinanceiro === "PENDENTE"
        ? "Pendente"
        : ordem.statusFinanceiro === "PAGO"
          ? "Pago"
          : "Cancelado";
  const statusFinanceiroTone =
    ordem.statusFinanceiro === "PAGO"
      ? "success"
      : ordem.statusFinanceiro === "PARCIAL"
        ? "warning"
        : ordem.statusFinanceiro === "CANCELADO"
          ? "danger"
          : "neutral";

  const handleStatusChange = async (novoStatus: OsStatus) => {
    // Guarda contra clique duplo: uma única requisição (e um único modal).
    if (statusEmAndamentoRef.current || isPending) return;
    statusEmAndamentoRef.current = true;
    setError(null);
    setStatusPending(true);
    try {
      const resultado = await alterarStatusOS(ordem, novoStatus);

      if (!resultado.ok) {
        setError(resultado.mensagem);
        return;
      }

      // Sugestão de WhatsApp só depois de o backend confirmar a conclusão/entrega.
      if (resultado.sugestaoConclusao) {
        onConcluida({ ...resultado.sugestaoConclusao, nomeExibicaoEmpresa });
      } else if (resultado.sugestaoAvaliacao) {
        let linkAvaliacao: string | null = null;
        try {
          const resp = await fetch("/api/configuracoes");
          if (resp.ok) {
            const config = await resp.json();
            linkAvaliacao = config?.linkAvaliacaoGoogle ?? null;
          }
        } catch {
          // Erro de rede na busca do link não bloqueia a OS entregue
        }

        onEntregue({
          ...resultado.sugestaoAvaliacao,
          linkAvaliacaoGoogle: linkAvaliacao,
          nomeExibicaoEmpresa,
        });
      }

      startTransition(() => {
        router.refresh();
      });
    } finally {
      statusEmAndamentoRef.current = false;
      setStatusPending(false);
    }
  };

  // Marcador operacional (issue #153): o backend é a fonte de verdade. Sem
  // atualização otimista: após persistir, router.refresh() reposiciona o card
  // conforme a ordenação vinda do servidor (favoritas primeiro).
  const handleToggleFavorita = async () => {
    if (favoritaPending || isPending) return;
    setError(null);
    setFavoritaPending(true);
    try {
      const response = await fetch(`/api/ordens-servico/${ordem.id}/favorita`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorita: !isFavorita }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(
          payload?.message ||
            (isFavorita
              ? "Erro ao remover a OS dos favoritos."
              : "Erro ao favoritar a OS."),
        );
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("Não foi possível comunicar com o servidor. Tente novamente.");
    } finally {
      setFavoritaPending(false);
    }
  };

  let actionButton = null;
  if (ordem.status === "ABERTA") {
    actionButton = (
      <Button
        type="button"
        onClick={() => handleStatusChange("EM_ANDAMENTO")}
        isLoading={isPending || statusPending}
      >
        Iniciar Serviço
      </Button>
    );
  } else if (ordem.status === "EM_ANDAMENTO") {
    actionButton = (
      <Button
        type="button"
        onClick={() => handleStatusChange("CONCLUIDA")}
        isLoading={isPending || statusPending}
      >
        Marcar como Concluída
      </Button>
    );
  } else if (ordem.status === "CONCLUIDA") {
    actionButton = (
      <Button
        type="button"
        onClick={() => handleStatusChange("ENTREGUE")}
        isLoading={isPending || statusPending}
      >
        Entregar ao Cliente
      </Button>
    );
  }

  return (
    <article
      data-favorita={isFavorita ? "true" : "false"}
      className={`rounded-[var(--r-field)] border p-4 transition ${
        isAtrasada
          ? "border-rose-300 bg-rose-50/60"
          : isFavorita
            ? "border-amber-300 bg-amber-50/40 hover:border-amber-400"
            : "border-black/10 bg-white hover:border-[color:var(--accent-soft)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--accent-strong)]">
            {ordem.numero}
          </p>
          <h3 className="mt-1 text-base font-semibold text-[color:var(--text)]">
            {ordem.cliente?.nome}
          </h3>
          {(() => {
            const telefone = ordem.cliente?.telefone;
            if (!telefone) return null;
            const telefoneMascarado = formatPhone(telefone);
            const link = whatsappLink(telefone);
            if (!link) {
              return (
                <p className="mt-1 text-sm text-slate-600">
                  {telefoneMascarado}
                </p>
              );
            }
            return (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm text-slate-600 hover:text-[color:var(--accent-strong)] hover:underline"
              >
                {telefoneMascarado}
              </a>
            );
          })()}
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={handleToggleFavorita}
            disabled={favoritaPending || isPending}
            aria-pressed={isFavorita}
            aria-busy={favoritaPending}
            aria-label={
              isFavorita ? "Remover dos favoritos" : "Favoritar ordem de serviço"
            }
            title={isFavorita ? "Remover dos favoritos" : "Favoritar ordem de serviço"}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              isFavorita
                ? "border-amber-300 bg-amber-100 text-amber-600 hover:bg-amber-200"
                : "border-black/10 bg-white text-slate-400 hover:border-amber-300 hover:text-amber-500"
            }`}
          >
            {favoritaPending ? (
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={isFavorita ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z" />
              </svg>
            )}
          </button>
          {isFavorita && <Badge tone="warning">Favorita</Badge>}
          {isAtrasada && <Badge tone="danger">Atrasada</Badge>}
          <Badge tone={getStatusTone(ordem.status)}>{statusLabel}</Badge>
          <Badge tone={statusFinanceiroTone}>{statusFinanceiroLabel}</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            {resumoItens.quantidade > 1 ? "Itens" : "Item"}
          </p>
          <p className="mt-1 text-[color:var(--text)]">
            {resumoItens.itens}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            {resumoItens.servicos.includes(",") ? "Serviços" : "Serviço"}
          </p>
          <p className="mt-1 text-[color:var(--text)]">
            {resumoItens.servicos}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Prazo
          </p>
          <p className="mt-1 text-[color:var(--text)]">
            {ordem.dataPrevisao
              ? dateFormatter.format(new Date(ordem.dataPrevisao))
              : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Valor Total
          </p>
          <p className="mt-1 text-[color:var(--text)]">
            {formatCurrency(Number(ordem.valorTotal))}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Valor Pago
          </p>
          <p className="mt-1 text-[color:var(--text)]">
            {formatCurrency(Number(ordem.valorPago || 0))}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Saldo
          </p>
          <p className="mt-1 font-semibold text-[color:var(--text)]">
            {formatCurrency(Number(ordem.saldo || 0))}
          </p>
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Observações
          </p>
          <p className="mt-1 text-[color:var(--text)]">
            {ordem.observacoes || "Sem observações adicionais."}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm font-semibold text-red-400">{error}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button href={`/ordens-servico/${ordem.id}`} variant="secondary">
            Ver detalhe
          </Button>
          {actionButton}
        </div>

        {ordem.historicosStatus && ordem.historicosStatus.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            aria-expanded={showHistory}
            aria-controls={`history-${ordem.id}`}
            className="text-sm font-semibold text-[color:var(--accent-strong)] hover:underline"
          >
            {showHistory ? "Ocultar Histórico" : "Ver Histórico"}
          </button>
        )}
      </div>

      {showHistory && ordem.historicosStatus && (
        <div id={`history-${ordem.id}`} className="mt-4 space-y-3 border-t border-black/5 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Histórico de Status
          </p>
          <div className="space-y-2">
            {ordem.historicosStatus.map((h) => (
              <div key={h.id} className="flex items-start gap-3 text-sm">
                <span className="whitespace-nowrap text-slate-500">
                  {new Date(h.criadoEm).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
                <span className="text-slate-600">
                  {h.statusAnterior ? `${h.statusAnterior} -> ` : ""}
                  <span className="font-semibold text-[color:var(--text)]">
                    {h.statusNovo}
                  </span>
                  {h.observacao ? ` - ${h.observacao}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

type OrdemServicoListProps = {
  ordens: OrdemServicoReal[];
  pagination: PaginacaoInfo;
  estatisticas: EstatisticasOrdensServico;
  filtros: FiltrosListagemOrdensServico;
  nomeExibicaoEmpresa: string;
};

const BUSCA_DEBOUNCE_MS = 350;

function OrdemServicoList({ ordens, pagination, estatisticas, filtros, nomeExibicaoEmpresa }: OrdemServicoListProps) {
  // Estado no nível da lista: após router.refresh() o card concluído pode sair
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

  const possuiFiltroAtivo =
    statusFilter !== "TODAS" || financeFilter !== "TODAS" || showAtrasadas || (filtros.busca ?? "") !== "";

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[color:var(--border)] p-5">
        <PanelHeader
          eyebrow="Fila de atendimento"
          title="OS registradas"
          description={
            possuiFiltroAtivo
              ? `${pagination.total} ordens encontradas com os filtros atuais`
              : `${pagination.total} ordens registradas`
          }
          action={<Badge tone="accent">{pagination.total} ordens</Badge>}
        />
      </div>

      {totalAtrasadas > 0 ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <p>
            <span className="font-semibold">
              {totalAtrasadas === 1
                ? "1 ordem de serviço atrasada"
                : `${totalAtrasadas} ordens de serviço atrasadas`}
            </span>{" "}
            — prazo previsto vencido e ainda não concluídas.
          </p>
          <Button type="button" variant="secondary" onClick={toggleAtrasadas}>
            {showAtrasadas ? "Mostrar todas" : "Ver atrasadas"}
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 border-b border-[color:var(--border)] p-4 sm:grid-cols-3">
        <StatCard
          label="Abertas"
          value={estatisticas.abertas}
          hint="Aguardando início"
          active={statusFilter === "ABERTA"}
          onClick={() => updateFilters("statusOp", "ABERTA")}
        />
        <StatCard
          label="Em andamento"
          value={estatisticas.emAndamento}
          hint="Na oficina"
          active={statusFilter === "EM_ANDAMENTO"}
          onClick={() => updateFilters("statusOp", "EM_ANDAMENTO")}
        />
        <StatCard
          label="Com saldo"
          value={estatisticas.comSaldo}
          hint="A receber"
          active={financeFilter === "COM_SALDO_EM_ABERTO"}
          onClick={() => updateFilters("statusFin", "COM_SALDO_EM_ABERTO")}
        />
      </div>

      <div className="border-b border-[color:var(--border)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar por cliente, telefone, item ou número da OS..."
            value={searchTerm}
            onChange={(e) => aoDigitarBusca(e.target.value)}
            className="max-w-md"
            aria-label="Buscar ordens de serviço"
          />
          {possuiFiltroAtivo ? (
            <Button type="button" variant="ghost" onClick={limparFiltros}>
              Limpar filtros
            </Button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <FilterChip
              key={option.value}
              active={statusFilter === option.value}
              onClick={() => updateFilters("statusOp", option.value)}
            >
              {option.label}
            </FilterChip>
          ))}
          {financeFilterOptions.slice(1).map((option) => (
            <FilterChip
              key={option.value}
              tone="warning"
              active={financeFilter === option.value}
              onClick={() =>
                updateFilters("statusFin", financeFilter === option.value ? "TODAS" : option.value)
              }
            >
              Financeiro: {option.label}
            </FilterChip>
          ))}
          <FilterChip
            tone="danger"
            active={showAtrasadas}
            onClick={toggleAtrasadas}
          >
            Atrasadas ({totalAtrasadas})
          </FilterChip>
        </div>
      </div>

      {isPending ? (
        <p className="px-4 pt-3 text-xs text-slate-500" role="status" aria-live="polite">
          Atualizando lista...
        </p>
      ) : null}

      {ordens.length === 0 ? (
        <div className="m-4 rounded-[var(--r-field)] border border-dashed border-black/10 bg-[color:var(--surface-muted)] p-6 text-sm leading-6 text-slate-600">
          Nenhuma ordem encontrada.
        </div>
      ) : (
        <div className={`space-y-3 p-4 ${isPending ? "opacity-60" : ""}`} aria-busy={isPending}>
          {ordens.map((ordem) => (
            <OrdemServicoCard
              key={ordem.id}
              ordem={ordem}
              isAtrasada={ordemServicoEstaAtrasada(ordem)}
              onConcluida={setSugestaoConclusao}
              onEntregue={setSugestaoAvaliacao}
              nomeExibicaoEmpresa={nomeExibicaoEmpresa}
            />
          ))}
        </div>
      )}

      <div className="border-t border-[color:var(--border)] p-4">
        <Paginacao
          pagination={pagination}
          rotulo="ordens"
          criarHref={criarHref}
          carregando={isPending}
        />
      </div>
      <SugerirWhatsAppConclusaoDialog
        dados={sugestaoConclusao}
        onFechar={fecharSugestaoConclusao}
      />
      <SugerirWhatsAppAvaliacaoDialog
        dados={sugestaoAvaliacao}
        onFechar={fecharSugestaoAvaliacao}
      />
    </Card>
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
            className="fixed inset-0 z-40 cursor-default bg-slate-950/45 backdrop-blur-[1px]"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="cadastro-os-titulo"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col overflow-y-auto border-l lg:max-w-3xl border-[color:var(--border)] bg-[color:var(--surface)] shadow-2xl"
          >
            <div id="cadastro-os-titulo" className="sr-only">
              Cadastro de nova ordem de serviço
            </div>
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
