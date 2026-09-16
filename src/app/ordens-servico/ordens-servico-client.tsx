"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";

import {
  Badge,
  Button,
  Card,
  FilterChip,
  Input,
  Label,
  PanelHeader,
  SectionTitle,
  StatCard,
  Textarea,
} from "@/components/ui";
import { Combobox } from "@/components/combobox";
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
  maskCPFCNPJ,
  maskPhone,
  whatsappLink,
} from "@/lib/formatters";
import {
  clienteFormSchema,
  type ClienteFormValues,
} from "@/lib/clientes-schema";
import {
  ordemServicoFormSchema,
  type OrdemServicoFormValues,
  type OrdemServicoItemValues,
} from "@/lib/ordens-servico-schema";
import {
  LIMITE_ITENS_POR_OS,
  TIPO_ITEM_PADRAO,
  calcularTotalItens,
  resumirItensOrdem,
} from "@/lib/ordens-servico-itens";
import {
  ItemRecebidoFormCard,
  gerarClientKeyItem,
  type EstadoFotoItem,
  type StatusUploadFotoItem,
} from "./item-recebido-form-card";
import { dataOperacionalHoje } from "@/lib/date-range";
import type { OsStatus } from "@/lib/ordens-servico-status";
import { previaNumeroOS } from "@/lib/ordens-servico-numero";
import { calcularPrazoPrevistoPadrao } from "@/lib/ordens-servico-prazo";
import { alterarStatusOS, type DadosSugestaoConclusao } from "@/lib/os-conclusao-whatsapp";
import {
  ordemServicoEstaAtrasada,
  type FiltrosListagemOrdensServico,
  type StatusFinanceiroListagem,
  type StatusOperacionalListagem,
} from "@/lib/ordens-servico-listagem";
import type { EstatisticasOrdensServico } from "@/lib/ordens-servico";
import { resetarPagina, type PaginacaoInfo } from "@/lib/paginacao";
import { Paginacao, usePaginacaoUrl } from "@/components/paginacao";
import { NOME_EMPRESA_FALLBACK, nomeExibicaoEmpresa as montarNomeEmpresa } from "@/lib/dados-empresa";
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

const criarItemVazio = (): OrdemServicoItemValues => ({
  clientKey: gerarClientKeyItem(),
  tipoItem: TIPO_ITEM_PADRAO,
  descricao: "",
  observacoes: "",
  servicos: [],
});

const criarDefaultValues = (): OrdemServicoFormValues => {
  const hoje = dataOperacionalHoje();
  return {
    clienteId: "",
    itens: [criarItemVazio()],
    servicos: [],
    dataEntrada: hoje,
    numeroOS: "",
    justificativaDataEntrada: "",
    // Sugestão inicial: 5 dias sem contar domingos. O operador pode alterar.
    prazoPrevisto: calcularPrazoPrevistoPadrao(hoje),
    valorEstimado: 0,
    observacoes: "",
  };
};

type UploadFotoItem = {
  clientKey: string;
  itemId: string;
  arquivo: File;
  status: StatusUploadFotoItem;
  erro?: string;
};

type OrdemCriadaComCliente = {
  id: string;
  numero: string;
  caminhoAcompanhamento?: string;
  nomeCliente: string;
  telefone?: string;
};

/** OS já criada cujo upload de foto de algum item ainda não terminou bem. */
type OrdemPendenteFoto = OrdemCriadaComCliente & { uploads: UploadFotoItem[] };

const defaultClienteValues: ClienteFormValues = {
  nome: "",
  telefone: "",
  email: "",
  cpfCnpj: "",
  observacoes: "",
};

// Types corresponding to what Prisma returns
type Cliente = { id: string; nome: string; telefone: string };
type Servico = { id: string; nome: string; precoBase: any };
type ItemServico = { servico: Servico };
type Item = { descricao: string; valor: any; servicos: ItemServico[] };
type HistoricoStatus = {
  id: string;
  statusAnterior: string | null;
  statusNovo: string;
  observacao: string | null;
  criadoEm: Date;
};
type OrdemServicoReal = {
  id: string;
  numero: string;
  cliente: Cliente;
  status: string;
  dataPrevisao: Date;
  valorTotal: any;
  observacoes: string | null;
  valorPago: number;
  saldo: number;
  statusFinanceiro: "PENDENTE" | "PARCIAL" | "PAGO" | "CANCELADO";
  itens: Item[];
  historicosStatus?: HistoricoStatus[];
  favorita?: boolean;
};

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
            className="text-sm font-semibold text-[color:var(--accent-strong)] hover:underline"
          >
            {showHistory ? "Ocultar Histórico" : "Ver Histórico"}
          </button>
        )}
      </div>

      {showHistory && ordem.historicosStatus && (
        <div className="mt-4 space-y-3 border-t border-black/5 pt-4">
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

/**
 * Blocos de apresentação do formulário de cadastro de OS. Apenas layout:
 * não alteram bindings, validação nem payload.
 */
function FormSection({
  titulo,
  descricao,
  obrigatorio = false,
  children,
}: {
  titulo: string;
  descricao?: string;
  /** Marca a seção cujo campo principal é obrigatório (o label fica só para leitores de tela). */
  obrigatorio?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4">
      <div className="border-b border-[color:var(--border)] pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--accent-strong)]">
          {titulo}
          {obrigatorio ? (
            <>
              {" "}
              <span aria-hidden="true" className="text-red-600">*</span>
            </>
          ) : null}
        </h3>
        {descricao ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">{descricao}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function CampoObrigatorio() {
  return (
    <>
      <span aria-hidden="true" className="text-red-600">*</span>
      <span className="sr-only"> (obrigatório)</span>
    </>
  );
}

function ErroCampo({ mensagem }: { mensagem?: string | null }) {
  if (!mensagem) return null;
  return (
    <p role="alert" className="text-sm text-red-600">
      {mensagem}
    </p>
  );
}

function OrdemServicoForm({
  clientes,
  servicos,
  onClose,
  onCriada,
}: {
  clientes: Cliente[];
  servicos: Servico[];
  onClose: () => void;
  onCriada: (dados: DadosCompartilhamentoAcompanhamento) => void;
}) {
  const router = useRouter();
  const [clientesDisponiveis, setClientesDisponiveis] =
    useState<Cliente[]>(clientes);
  const [mostrarNovoCliente, setMostrarNovoCliente] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [clienteError, setClienteError] = useState<string | null>(null);
  // Fotos ficam fora do JSON do formulário, indexadas pela clientKey do item.
  const [fotosPorItem, setFotosPorItem] = useState<Record<string, EstadoFotoItem>>({});
  const fotoProcessando = Object.values(fotosPorItem).some((estado) => estado.processando);
  // OS já criada cujo upload de foto de algum item falhou: o botão de
  // cadastrar não pode criar outra OS, e só as fotos com erro são reenviadas.
  const [ordemPendenteFoto, setOrdemPendenteFoto] = useState<OrdemPendenteFoto | null>(null);
  const [reenviandoFoto, setReenviandoFoto] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrdemServicoFormValues>({
    resolver: zodResolver(ordemServicoFormSchema),
    defaultValues: criarDefaultValues(),
    mode: "onChange",
  });
  const { fields: itensFields, append: adicionarItem, remove: removerItemDoFormulario } = useFieldArray({
    control,
    name: "itens",
    keyName: "fieldId",
  });
  const itensAtuais = watch("itens");
  const totalOrdem = calcularTotalItens(itensAtuais ?? []);

  const registrarFotoDoItem = useCallback((clientKey: string, estado: EstadoFotoItem) => {
    setFotosPorItem((atual) => {
      const anterior = atual[clientKey];
      if (anterior && anterior.arquivo === estado.arquivo && anterior.processando === estado.processando) {
        return atual;
      }
      return { ...atual, [clientKey]: estado };
    });
  }, []);

  const hojeOperacional = dataOperacionalHoje();
  const dataEntradaSelecionada = watch("dataEntrada");
  const exigeJustificativaDataEntrada =
    !!dataEntradaSelecionada && dataEntradaSelecionada !== hojeOperacional;
  const numeroOSDigitado = watch("numeroOS");
  const previaNumero = previaNumeroOS(
    dataEntradaSelecionada || hojeOperacional,
    numeroOSDigitado,
  );

  const enviarFoto = async (ordemId: string, itemId: string, arquivo: File) => {
    const dados = new FormData();
    dados.set("foto", arquivo);
    const response = await fetch(`/api/ordens-servico/${ordemId}/itens/${itemId}/foto`, {
      method: "POST",
      body: dados,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.message || "A OS foi criada, mas não foi possível salvar a foto.");
    }
  };

  /**
   * Envia as fotos uma a uma (baixa concorrência no celular) e devolve a
   * lista com o resultado de cada uma. Falha em uma foto não interrompe as
   * demais nem apaga a OS.
   */
  const enviarFotosDosItens = async (ordemId: string, uploads: UploadFotoItem[]) => {
    const resultado: UploadFotoItem[] = [];
    for (const upload of uploads) {
      if (upload.status === "enviada") {
        resultado.push(upload);
        continue;
      }
      try {
        await enviarFoto(ordemId, upload.itemId, upload.arquivo);
        resultado.push({ ...upload, status: "enviada", erro: undefined });
      } catch (error) {
        resultado.push({
          ...upload,
          status: "erro",
          erro: error instanceof Error ? error.message : "Não foi possível salvar a foto.",
        });
      }
    }
    return resultado;
  };

  const concluirCriacao = (criada: OrdemCriadaComCliente) => {
    // Novas clientKeys remontam os cards e limpam as fotos de cada item.
    reset(criarDefaultValues());
    setFotosPorItem({});
    setOrdemPendenteFoto(null);
    onClose();
    if (criada.caminhoAcompanhamento) {
      onCriada({
        numeroOS: criada.numero,
        nomeCliente: criada.nomeCliente,
        telefone: criada.telefone,
        caminhoAcompanhamento: criada.caminhoAcompanhamento,
      });
    }
    startTransition(() => router.refresh());
  };

  const reenviarFoto = async () => {
    if (!ordemPendenteFoto || reenviandoFoto) return;
    setReenviandoFoto(true);
    setSubmitError(null);
    try {
      // Só as fotos com falha são reenviadas; as já salvas ficam como estão.
      const uploads = await enviarFotosDosItens(ordemPendenteFoto.id, ordemPendenteFoto.uploads);
      const comErro = uploads.filter((upload) => upload.status === "erro");
      if (comErro.length === 0) {
        concluirCriacao(ordemPendenteFoto);
        return;
      }
      setOrdemPendenteFoto({ ...ordemPendenteFoto, uploads });
      setSubmitError(montarMensagemFotosComErro(comErro.length));
    } finally {
      setReenviandoFoto(false);
    }
  };

  const montarMensagemFotosComErro = (quantidade: number) =>
    quantidade === 1
      ? "A OS foi criada, mas a foto de um item não foi salva. Reenvie a foto ou abra a OS para continuar."
      : `A OS foi criada, mas as fotos de ${quantidade} itens não foram salvas. Reenvie as fotos ou abra a OS para continuar.`;

  const {
    register: registerCliente,
    handleSubmit: handleSubmitCliente,
    reset: resetCliente,
    formState: { errors: clienteErrors, isSubmitting: clienteSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: defaultClienteValues,
    mode: "onChange",
  });

  const cancelarNovoCliente = () => {
    setMostrarNovoCliente(false);
    setClienteError(null);
    resetCliente(defaultClienteValues);
  };

  const onSubmitCliente = handleSubmitCliente(async (values) => {
    setClienteError(null);

    const response = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setClienteError(
        payload.message ?? "Não foi possível cadastrar o cliente.",
      );
      return;
    }

    const payload = (await response.json()) as { cliente: Cliente };
    setClientesDisponiveis((atuais) => [...atuais, payload.cliente]);
    setValue("clienteId", payload.cliente.id, { shouldValidate: true });
    cancelarNovoCliente();
  });

  // Serviços vivem em `itens[indice].servicos`; o subtotal do item e o total
  // da OS são derivados deles, nunca digitados.
  const servicosDoItem = (indice: number) => itensAtuais?.[indice]?.servicos ?? [];
  const definirServicosDoItem = (indice: number, atualizados: OrdemServicoItemValues["servicos"]) => {
    setValue(`itens.${indice}.servicos`, atualizados, { shouldValidate: true, shouldDirty: true });
  };

  const adicionarServico = (indice: number, servicoId: string) => {
    const atuais = servicosDoItem(indice);
    // Mesmo serviço em itens diferentes é permitido; repetido no item, não.
    if (!servicoId || atuais.some((item) => item.servicoId === servicoId)) {
      return;
    }

    const servico = servicos.find((item) => item.id === servicoId);
    if (!servico) {
      return;
    }

    definirServicosDoItem(indice, [
      ...atuais,
      { servicoId, valor: Number(servico.precoBase || 0) },
    ]);
  };

  const atualizarValorServico = (indice: number, servicoId: string, valor: string) => {
    const valorNumerico = Number(valor.replace(",", "."));
    definirServicosDoItem(
      indice,
      servicosDoItem(indice).map((item) =>
        item.servicoId === servicoId
          ? { ...item, valor: Number.isFinite(valorNumerico) ? valorNumerico : 0 }
          : item,
      ),
    );
  };

  const removerServico = (indice: number, servicoId: string) => {
    definirServicosDoItem(
      indice,
      servicosDoItem(indice).filter((item) => item.servicoId !== servicoId),
    );
  };

  const adicionarNovoItem = () => {
    if (itensFields.length >= LIMITE_ITENS_POR_OS) return;
    adicionarItem(criarItemVazio());
  };

  const removerItem = (indice: number) => {
    if (itensFields.length <= 1) return;
    const item = itensAtuais?.[indice];
    const clientKey = itensFields[indice]?.clientKey ?? item?.clientKey ?? "";
    const temConteudo =
      (item?.servicos?.length ?? 0) > 0 || Boolean(fotosPorItem[clientKey]?.arquivo);
    if (temConteudo && !window.confirm(`Remover o item ${indice + 1}? Os serviços e a foto dele serão descartados.`)) {
      return;
    }
    removerItemDoFormulario(indice);
    setFotosPorItem((atual) => {
      if (!(clientKey in atual)) return atual;
      const { [clientKey]: _removida, ...restantes } = atual;
      return restantes;
    });
  };

  const onSubmit = handleSubmit(async (values) => {
    if (ordemPendenteFoto) {
      setSubmitError("Esta OS já foi criada. Reenvie as fotos ou abra o detalhe para continuar.");
      return;
    }
    if (fotoProcessando) {
      setSubmitError("Aguarde a otimização das fotos terminar.");
      return;
    }
    setSubmitError(null);

    const response = await fetch("/api/ordens-servico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = await response.json();
      setSubmitError(
        payload.message ?? "Não foi possível criar a ordem de serviço.",
      );
      return;
    }

    // Só chega aqui com a criação confirmada (201): a sugestão de WhatsApp
    // nunca aparece antes disso, e fechar a sugestão não afeta a OS.
    const criada = (await response.json()) as {
      id: string;
      numero: string;
      caminhoAcompanhamento?: string;
      itens: Array<{ id: string; clientKey?: string }>;
    };
    const cliente = clientesDisponiveis.find((item) => item.id === values.clienteId);
    const criadaComCliente: OrdemCriadaComCliente = {
      id: criada.id,
      numero: criada.numero,
      caminhoAcompanhamento: criada.caminhoAcompanhamento,
      nomeCliente: cliente?.nome ?? "",
      telefone: cliente?.telefone,
    };

    // Associa cada foto ao item persistido pela clientKey devolvida pela API.
    // Sem clientKey na resposta (API antiga), cai na posição do item.
    const uploads: UploadFotoItem[] = [];
    values.itens.forEach((item, indice) => {
      const clientKey = item.clientKey ?? "";
      const arquivo = fotosPorItem[clientKey]?.arquivo;
      if (!arquivo) return;
      const persistido =
        criada.itens.find((candidato) => candidato.clientKey && candidato.clientKey === clientKey) ??
        criada.itens[indice];
      if (!persistido) return;
      uploads.push({ clientKey, itemId: persistido.id, arquivo, status: "pendente" });
    });

    if (uploads.length > 0) {
      const resultado = await enviarFotosDosItens(criada.id, uploads);
      const comErro = resultado.filter((upload) => upload.status === "erro");
      if (comErro.length > 0) {
        setOrdemPendenteFoto({ ...criadaComCliente, uploads: resultado });
        setSubmitError(montarMensagemFotosComErro(comErro.length));
        return;
      }
    }

    concluirCriacao(criadaComCliente);
  });

  const statusUploadPorClientKey = new Map(
    (ordemPendenteFoto?.uploads ?? []).map((upload) => [upload.clientKey, upload] as const),
  );

  return (
    <section id="nova-ordem">
      <Card className="p-6 shadow-none">
        <div className="-mx-6 -mt-6 mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-5">
          <SectionTitle className="text-2xl">
            Cadastro de OS
          </SectionTitle>
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar cadastro de OS"
              className="rounded-full p-2 text-slate-500 transition hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
            >
              <span aria-hidden="true" className="text-xl leading-none">×</span>
            </button>
          </div>
        </div>

        <form className="grid gap-8" onSubmit={onSubmit}>
          {/* 1. Cliente */}
          <FormSection titulo="Cliente" obrigatorio>
            <div className="grid gap-2">
              <Label htmlFor="clienteId" className="sr-only">
                Cliente <CampoObrigatorio />
              </Label>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Combobox
                    id="clienteId"
                    options={clientesDisponiveis.map((c) => ({
                      value: c.id,
                      label: c.nome,
                      subLabel: c.telefone,
                    }))}
                    value={watch("clienteId")}
                    onChange={(val) =>
                      setValue("clienteId", val, { shouldValidate: true })
                    }
                    placeholder="Selecione um cliente..."
                    emptyText="Cliente não encontrado"
                  />
                </div>
                <button
                  type="button"
                  aria-label={
                    mostrarNovoCliente
                      ? "Fechar cadastro rápido de cliente"
                      : "Cadastrar novo cliente"
                  }
                  title={
                    mostrarNovoCliente
                      ? "Fechar cadastro rápido"
                      : "Cadastrar novo cliente"
                  }
                  aria-expanded={mostrarNovoCliente}
                  aria-controls="cadastro-rapido-cliente"
                  onClick={() => {
                    setClienteError(null);
                    setMostrarNovoCliente((atual) => !atual);
                  }}
                  className={`inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] ${
                    mostrarNovoCliente
                      ? "border-[color:var(--accent)] bg-[color:var(--accent-tint)] text-[color:var(--accent-strong)]"
                      : "border-black/10 bg-white text-[color:var(--accent-strong)] hover:border-[color:var(--accent-soft)] hover:bg-[color:var(--accent-tint)]"
                  }`}
                >
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {mostrarNovoCliente ? (
                      <path d="M6 6l12 12M18 6L6 18" />
                    ) : (
                      <>
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M19 8v6M22 11h-6" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
              <ErroCampo mensagem={errors.clienteId?.message} />
            </div>

            {mostrarNovoCliente ? (
              <div
                id="cadastro-rapido-cliente"
                className="grid gap-4 rounded-2xl border border-[color:var(--accent-soft)] bg-[color:var(--surface-muted)] p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text)]">
                    Cadastro rápido de cliente
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    O cliente será selecionado automaticamente após o cadastro.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="novoClienteNome">Nome</Label>
                    <Input
                      id="novoClienteNome"
                      {...registerCliente("nome")}
                      placeholder="Nome do cliente"
                    />
                    <ErroCampo mensagem={clienteErrors.nome?.message} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="novoClienteTelefone">Telefone</Label>
                    <Input
                      id="novoClienteTelefone"
                      {...registerCliente("telefone")}
                      onChange={(e) => {
                        e.target.value = maskPhone(e.target.value);
                        registerCliente("telefone").onChange(e);
                      }}
                      placeholder="(11) 99999-9999"
                    />
                    <ErroCampo mensagem={clienteErrors.telefone?.message} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="novoClienteEmail">E-mail (opcional)</Label>
                    <Input
                      id="novoClienteEmail"
                      {...registerCliente("email")}
                      placeholder="cliente@exemplo.com"
                    />
                    <ErroCampo mensagem={clienteErrors.email?.message} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="novoClienteCpfCnpj">
                      CPF ou CNPJ (opcional)
                    </Label>
                    <Input
                      id="novoClienteCpfCnpj"
                      {...registerCliente("cpfCnpj")}
                      onChange={(e) => {
                        e.target.value = maskCPFCNPJ(e.target.value);
                        registerCliente("cpfCnpj").onChange(e);
                      }}
                      placeholder="Opcional"
                    />
                    <ErroCampo mensagem={clienteErrors.cpfCnpj?.message} />
                  </div>
                </div>

                <ErroCampo mensagem={clienteError} />

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    isLoading={clienteSubmitting}
                    onClick={onSubmitCliente}
                    className="w-full sm:w-auto"
                  >
                    Salvar cliente
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={cancelarNovoCliente}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : null}
          </FormSection>

          {/* 2. Dados da Ordem de Serviço */}
          <FormSection titulo="Dados da Ordem de Serviço">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid content-start gap-2">
                <Label htmlFor="dataEntrada">Data de entrada</Label>
                <Input
                  id="dataEntrada"
                  type="date"
                  defaultValue={hojeOperacional}
                  max={hojeOperacional}
                  {...register("dataEntrada")}
                />
                <ErroCampo mensagem={errors.dataEntrada?.message} />
                {exigeJustificativaDataEntrada ? (
                  <p className="text-xs text-slate-500">
                    Registro retroativo — o número da OS usa a data de entrada
                    informada.
                  </p>
                ) : null}
              </div>

              <div className="grid content-start gap-2">
                <Label htmlFor="numeroOS">
                  Número da OS <CampoObrigatorio />
                </Label>
                <Input
                  id="numeroOS"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ex.: 0124"
                  {...register("numeroOS")}
                />
                <ErroCampo mensagem={errors.numeroOS?.message} />
                {previaNumero ? (
                  <p className="text-xs text-slate-500">
                    Identificador: <span className="font-semibold text-[color:var(--text)]">{previaNumero}</span>
                  </p>
                ) : null}
              </div>

              <div className="grid content-start gap-2">
                <Label htmlFor="prazoPrevisto">
                  Prazo previsto <CampoObrigatorio />
                </Label>
                <Input
                  id="prazoPrevisto"
                  type="date"
                  defaultValue={calcularPrazoPrevistoPadrao(hojeOperacional)}
                  {...register("prazoPrevisto")}
                />
                <ErroCampo mensagem={errors.prazoPrevisto?.message} />
              </div>

              {exigeJustificativaDataEntrada ? (
                <div className="grid gap-2 md:col-span-3">
                  <Label htmlFor="justificativaDataEntrada">
                    Justificativa da data retroativa <CampoObrigatorio />
                  </Label>
                  <Textarea
                    id="justificativaDataEntrada"
                    rows={2}
                    {...register("justificativaDataEntrada")}
                  />
                  <ErroCampo mensagem={errors.justificativaDataEntrada?.message} />
                </div>
              ) : null}
            </div>
          </FormSection>

          {/* 3. Itens recebidos (issue #205): um card por objeto entregue */}
          <FormSection
            titulo="Itens recebidos"
            obrigatorio
            descricao="Cada objeto entregue pelo cliente é um item, com a própria foto e os próprios serviços."
          >
            <div className="grid gap-4">
              {itensFields.map((campo, indice) => {
                const upload = statusUploadPorClientKey.get(campo.clientKey ?? "");
                return (
                  <ItemRecebidoFormCard
                    key={campo.fieldId}
                    indice={indice}
                    clientKey={campo.clientKey ?? campo.fieldId}
                    descricaoField={register(`itens.${indice}.descricao`)}
                    erroDescricao={errors.itens?.[indice]?.descricao?.message}
                    erroServicos={errors.itens?.[indice]?.servicos?.message}
                    servicos={servicosDoItem(indice)}
                    catalogo={servicos}
                    onAdicionarServico={(servicoId) => adicionarServico(indice, servicoId)}
                    onAtualizarValorServico={(servicoId, valor) => atualizarValorServico(indice, servicoId, valor)}
                    onRemoverServico={(servicoId) => removerServico(indice, servicoId)}
                    onFotoChange={registrarFotoDoItem}
                    statusUpload={upload?.status}
                    erroUpload={upload?.erro}
                    onRemoverItem={() => removerItem(indice)}
                    podeRemover={itensFields.length > 1}
                    bloqueado={Boolean(ordemPendenteFoto)}
                  />
                );
              })}
              <ErroCampo mensagem={errors.itens?.message ?? errors.itens?.root?.message} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={adicionarNovoItem}
                  disabled={Boolean(ordemPendenteFoto) || itensFields.length >= LIMITE_ITENS_POR_OS}
                >
                  + Adicionar outro item
                </Button>
                <p className="text-xs text-slate-500">
                  {itensFields.length} de {LIMITE_ITENS_POR_OS} itens
                </p>
              </div>
            </div>

            <div className="grid gap-2 rounded-2xl border border-[color:var(--accent-soft)] bg-[color:var(--accent-tint)] p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--accent-strong)]">
                  Total da OS
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Soma dos subtotais de todos os itens.
                </p>
              </div>
              <p
                data-testid="total-ordem"
                className="text-right text-lg font-semibold text-[color:var(--accent-strong)] sm:w-56"
              >
                {formatCurrency(totalOrdem)}
              </p>
            </div>
          </FormSection>

          {/* 5. Observações */}
          <FormSection titulo="Observações">
            <div className="grid gap-2">
              <Label htmlFor="observacoes" className="sr-only">Observações</Label>
              <Textarea
                id="observacoes"
                rows={4}
                {...register("observacoes")}
                placeholder="Detalhes adicionais do atendimento"
              />
            </div>
          </FormSection>

          {submitError ? (
            <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-red-600">
              <p role="alert">{submitError}</p>
              {ordemPendenteFoto ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" isLoading={reenviandoFoto} onClick={() => void reenviarFoto()}>Reenviar fotos com falha</Button>
                  <Button href={`/ordens-servico/${ordemPendenteFoto.id}`} variant="secondary">Abrir OS já criada</Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* 6. Ações */}
          <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-col-reverse gap-3 border-t border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={isPending || isSubmitting}
              disabled={Boolean(ordemPendenteFoto) || fotoProcessando}
              className="w-full sm:w-auto sm:min-w-[12rem]"
            >
              Cadastrar ordem
            </Button>
          </div>
        </form>
      </Card>
    </section>
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
  const buscaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Sincroniza o input quando a URL muda por fora (voltar/avançar, limpar).
    setSearchTerm(filtros.busca ?? "");
  }, [filtros.busca]);

  useEffect(() => {
    return () => {
      if (buscaTimeout.current) clearTimeout(buscaTimeout.current);
    };
  }, []);

  /**
   * Aplica um filtro na URL e volta para a página 1. `page` é sempre
   * removido: mudar busca/filtro invalida a posição anterior.
   */
  const updateFilters = useCallback(
    (key: string, value: string) => {
      const params = resetarPagina(searchParams.toString());
      if (value && value !== "TODAS" && value !== "false") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const limparFiltros = () => {
    setSearchTerm("");
    const params = new URLSearchParams(searchParams.toString());
    ["statusOp", "statusFin", "busca", "atrasadas", "page"].forEach((chave) => params.delete(chave));
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const aoDigitarBusca = (valor: string) => {
    setSearchTerm(valor);
    if (buscaTimeout.current) clearTimeout(buscaTimeout.current);
    buscaTimeout.current = setTimeout(() => {
      updateFilters("busca", valor.trim());
    }, BUSCA_DEBOUNCE_MS);
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
  clientes,
  servicos,
}: {
  initialOrders: any[];
  pagination: PaginacaoInfo;
  estatisticas: EstatisticasOrdensServico;
  filtros: FiltrosListagemOrdensServico;
  clientes: Cliente[];
  servicos: Servico[];
}) {
  const ordens = initialOrders as OrdemServicoReal[];
  const searchParams = useSearchParams();

  // O drawer é controlado pela URL (?nova=1). O Link "Nova ordem" navega via
  // App Router, que atualiza useSearchParams; um hash (#nova-ordem) não
  // dispara "hashchange" nessa navegação, por isso o hash não é mais usado.
  const drawerOpen = searchParams.get(NOVA_ORDEM_PARAM) === "1";
  const [compartilhamento, setCompartilhamento] =
    useState<DadosCompartilhamentoAcompanhamento | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState(NOME_EMPRESA_FALLBACK);
  const fecharCompartilhamento = useCallback(() => setCompartilhamento(null), []);

  useEffect(() => {
    let ativo = true;
    fetch("/api/configuracoes/dados-empresa")
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados) => {
        if (ativo && dados?.nomeFantasia) setNomeEmpresa(montarNomeEmpresa(dados));
      })
      .catch(() => undefined);
    return () => { ativo = false; };
  }, []);

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
            <OrdemServicoForm
              clientes={clientes}
              servicos={servicos}
              onClose={closeDrawer}
              onCriada={(dados) => setCompartilhamento({ ...dados, nomeExibicaoEmpresa: nomeEmpresa })}
            />
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
