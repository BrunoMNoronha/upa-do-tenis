"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

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
  formatCurrency,
  formatPhone,
  maskCPFCNPJ,
  maskCurrency,
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
  type OrdemServicoServicoValues,
} from "@/lib/ordens-servico-schema";
import { dataOperacionalHoje } from "@/lib/date-range";
import type { OsStatus } from "@/lib/ordens-servico-status";
import { previaNumeroOS } from "@/lib/ordens-servico-numero";
import {
  type FiltrosListagemOrdensServico,
  type StatusFinanceiroListagem,
  type StatusOperacionalListagem,
} from "@/lib/ordens-servico-listagem";
import type { EstatisticasOrdensServico } from "@/lib/ordens-servico";
import { resetarPagina, type PaginacaoInfo } from "@/lib/paginacao";
import { Paginacao, usePaginacaoUrl } from "@/components/paginacao";

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

const criarDefaultValues = (): OrdemServicoFormValues => ({
  clienteId: "",
  itemRecebido: "",
  servicoId: "",
  servicos: [],
  dataEntrada: dataOperacionalHoje(),
  numeroOS: "",
  justificativaDataEntrada: "",
  prazoPrevisto: "",
  valorEstimado: 0,
  observacoes: "",
});

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
}: {
  ordem: OrdemServicoReal;
  isAtrasada: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [favoritaPending, setFavoritaPending] = useState(false);
  const isFavorita = ordem.favorita === true;

  const statusLabel =
    statusOptions.find((o) => o.value === ordem.status)?.label ?? ordem.status;
  const itemPrincipal = ordem.itens?.[0];
  const servicosDaOrdem = itemPrincipal?.servicos
    ?.map((item) => item.servico?.nome)
    .filter(Boolean)
    .join(", ");
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
    setError(null);
    const response = await fetch(`/api/ordens-servico/${ordem.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusNovo: novoStatus }),
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.message || "Erro ao atualizar status.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
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
        isLoading={isPending}
      >
        Iniciar Serviço
      </Button>
    );
  } else if (ordem.status === "EM_ANDAMENTO") {
    actionButton = (
      <Button
        type="button"
        onClick={() => handleStatusChange("CONCLUIDA")}
        isLoading={isPending}
      >
        Marcar como Concluída
      </Button>
    );
  } else if (ordem.status === "CONCLUIDA") {
    actionButton = (
      <Button
        type="button"
        onClick={() => handleStatusChange("ENTREGUE")}
        isLoading={isPending}
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
            Item
          </p>
          <p className="mt-1 text-[color:var(--text)]">
            {itemPrincipal?.descricao || "Nenhum"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Serviço
          </p>
          <p className="mt-1 text-[color:var(--text)]">
            {servicosDaOrdem || "Geral"}
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

function OrdemServicoForm({
  clientes,
  servicos,
  onClose,
}: {
  clientes: Cliente[];
  servicos: Servico[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [clientesDisponiveis, setClientesDisponiveis] =
    useState<Cliente[]>(clientes);
  const [mostrarNovoCliente, setMostrarNovoCliente] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [clienteError, setClienteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [servicosSelecionados, setServicosSelecionados] = useState<
    OrdemServicoServicoValues[]
  >([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrdemServicoFormValues>({
    resolver: zodResolver(ordemServicoFormSchema),
    defaultValues: criarDefaultValues(),
    mode: "onChange",
  });

  const hojeOperacional = dataOperacionalHoje();
  const dataEntradaSelecionada = watch("dataEntrada");
  const exigeJustificativaDataEntrada =
    !!dataEntradaSelecionada && dataEntradaSelecionada !== hojeOperacional;
  const numeroOSDigitado = watch("numeroOS");
  const previaNumero = previaNumeroOS(
    dataEntradaSelecionada || hojeOperacional,
    numeroOSDigitado,
  );

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

  const adicionarServico = (servicoId: string) => {
    if (
      !servicoId ||
      servicosSelecionados.some((item) => item.servicoId === servicoId)
    ) {
      return;
    }

    const servico = servicos.find((item) => item.id === servicoId);
    if (!servico) {
      return;
    }

    const novoServico = {
      servicoId,
      valor: Number(servico.precoBase || 0),
    };
    const atualizados = [...servicosSelecionados, novoServico];
    setServicosSelecionados(atualizados);
    setValue("servicos", atualizados);
    setValue(
      "valorEstimado",
      atualizados.reduce(
        (total, item) => total + Number(item.valor || 0),
        0,
      ) as unknown as number,
    );
  };

  const atualizarValorServico = (servicoId: string, valor: string) => {
    const valorNumerico = Number(valor.replace(",", "."));
    const atualizados = servicosSelecionados.map((item) =>
      item.servicoId === servicoId
        ? { ...item, valor: Number.isFinite(valorNumerico) ? valorNumerico : 0 }
        : item,
    );
    setServicosSelecionados(atualizados);
    setValue("servicos", atualizados);
    setValue(
      "valorEstimado",
      atualizados.reduce(
        (total, item) => total + Number(item.valor || 0),
        0,
      ) as unknown as number,
    );
  };

  const removerServico = (servicoId: string) => {
    const atualizados = servicosSelecionados.filter(
      (item) => item.servicoId !== servicoId,
    );
    setServicosSelecionados(atualizados);
    setValue("servicos", atualizados);
    setValue(
      "valorEstimado",
      atualizados.reduce(
        (total, item) => total + Number(item.valor || 0),
        0,
      ) as unknown as number,
    );
  };

  const onSubmit = handleSubmit(async (values) => {
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

    reset(criarDefaultValues());
    setServicosSelecionados([]);
    onClose();

    startTransition(() => {
      router.refresh();
    });
  });

  return (
    <section id="nova-ordem">
      <Card className="p-6 shadow-none">
        <div className="sticky -mx-6 -mt-6 mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
              Nova ordem
            </p>
            <SectionTitle className="mt-2 text-2xl">
              Cadastro de OS
            </SectionTitle>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
              Selecione o cliente e os dados do serviço para registrar no banco
              de dados.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Badge tone="accent">Banco Real</Badge>
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

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="clienteId">Cliente</Label>
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
            <div className="flex justify-start">
              <Button
                type="button"
                variant="ghost"
                className="px-0 py-1 text-sm text-[color:var(--accent-strong)]"
                onClick={() => {
                  setClienteError(null);
                  setMostrarNovoCliente((atual) => !atual);
                }}
              >
                {mostrarNovoCliente
                  ? "Fechar cadastro rápido"
                  : "+ Cadastrar novo cliente"}
              </Button>
            </div>
            {errors.clienteId ? (
              <p className="text-sm text-red-600">{errors.clienteId.message}</p>
            ) : null}
          </div>

          {mostrarNovoCliente ? (
            <div className="grid gap-4 rounded-2xl border border-[color:var(--accent-soft)] bg-[color:var(--surface-muted)] p-4">
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
                  {clienteErrors.nome ? (
                    <p className="text-sm text-red-600">
                      {clienteErrors.nome.message}
                    </p>
                  ) : null}
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
                  {clienteErrors.telefone ? (
                    <p className="text-sm text-red-600">
                      {clienteErrors.telefone.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="novoClienteEmail">E-mail (opcional)</Label>
                  <Input
                    id="novoClienteEmail"
                    {...registerCliente("email")}
                    placeholder="cliente@exemplo.com"
                  />
                  {clienteErrors.email ? (
                    <p className="text-sm text-red-600">
                      {clienteErrors.email.message}
                    </p>
                  ) : null}
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
                  {clienteErrors.cpfCnpj ? (
                    <p className="text-sm text-red-600">
                      {clienteErrors.cpfCnpj.message}
                    </p>
                  ) : null}
                </div>
              </div>

              {clienteError ? (
                <p className="text-sm text-red-600">{clienteError}</p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  isLoading={clienteSubmitting}
                  onClick={onSubmitCliente}
                >
                  Salvar cliente
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={cancelarNovoCliente}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : null}


          <div className="grid gap-2">
            <Label htmlFor="itemRecebido">Item recebido</Label>
            <Input
              id="itemRecebido"
              {...register("itemRecebido")}
              placeholder="Ex.: tênis preto"
            />
            {errors.itemRecebido ? (
              <p className="text-sm text-red-600">
                {errors.itemRecebido.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3">
            <Label htmlFor="servicoId">Serviços solicitados (opcional)</Label>
            <Combobox
              id="servicoId"
              options={servicos.map((s) => ({ value: s.id, label: s.nome }))}
              value=""
              onChange={adicionarServico}
              placeholder="Adicionar serviço..."
              emptyText="Serviço não encontrado"
            />
            {servicosSelecionados.length > 0 ? (
              <div className="space-y-2">
                {servicosSelecionados.map((item) => {
                  const servico = servicos.find(
                    (option) => option.id === item.servicoId,
                  );
                  return (
                    <div
                      key={item.servicoId}
                      className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
                    >
                      <p className="text-sm font-medium text-slate-700">
                        {servico?.nome || "Serviço"}
                      </p>
                      <Input
                        aria-label={`Valor de ${servico?.nome || "serviço"}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.valor}
                        onChange={(event) =>
                          atualizarValorServico(
                            item.servicoId,
                            event.target.value,
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removerServico(item.servicoId)}
                      >
                        Remover
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Nenhum serviço selecionado. O item poderá ser detalhado depois.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dataEntrada">Data de entrada</Label>
            <Input
              id="dataEntrada"
              type="date"
              max={hojeOperacional}
              {...register("dataEntrada")}
            />
            {errors.dataEntrada ? (
              <p className="text-sm text-red-600">
                {errors.dataEntrada.message}
              </p>
            ) : null}
            {exigeJustificativaDataEntrada ? (
              <p className="text-xs text-slate-500">
                Registro retroativo — o número da OS usa a data de entrada
                informada.
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="numeroOS">Número da OS</Label>
            <Input
              id="numeroOS"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Ex.: 0124"
              {...register("numeroOS")}
            />
            {errors.numeroOS ? (
              <p className="text-sm text-red-600">{errors.numeroOS.message}</p>
            ) : null}
            {previaNumero ? (
              <p className="text-xs text-slate-500">
                Identificador: <span className="font-semibold text-[color:var(--text)]">{previaNumero}</span>
              </p>
            ) : null}
          </div>

          {exigeJustificativaDataEntrada ? (
            <div className="grid gap-2">
              <Label htmlFor="justificativaDataEntrada">
                Justificativa da data retroativa
              </Label>
              <Textarea
                id="justificativaDataEntrada"
                rows={2}
                {...register("justificativaDataEntrada")}
              />
              {errors.justificativaDataEntrada ? (
                <p className="text-sm text-red-600">
                  {errors.justificativaDataEntrada.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="prazoPrevisto">Prazo previsto</Label>
              <Input
                id="prazoPrevisto"
                type="date"
                {...register("prazoPrevisto")}
              />
              {errors.prazoPrevisto ? (
                <p className="text-sm text-red-600">
                  {errors.prazoPrevisto.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="valorEstimado">
                Valor total dos serviços (R$)
              </Label>
              <Input
                id="valorEstimado"
                type="text"
                {...register("valorEstimado")}
                onChange={(e) => {
                  e.target.value = maskCurrency(e.target.value);
                  register("valorEstimado").onChange(e);
                }}
                onBlur={(e) => {
                  if (e.target.value) {
                    e.target.value = formatCurrency(e.target.value);
                    register("valorEstimado").onChange(e);
                  }
                  register("valorEstimado").onBlur(e);
                }}
                placeholder="R$ 0,00"
                readOnly={servicosSelecionados.length > 0}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              rows={4}
              {...register("observacoes")}
              placeholder="Detalhes adicionais do atendimento"
            />
          </div>

          {submitError ? (
            <p className="text-sm text-red-600">{submitError}</p>
          ) : null}

          <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-wrap justify-between gap-3 border-t border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isPending}>
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
};

const BUSCA_DEBOUNCE_MS = 350;

function OrdemServicoList({ ordens, pagination, estatisticas, filtros }: OrdemServicoListProps) {
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

  const checkIsAtrasada = (ordem: OrdemServicoReal) => {
    if (
      ordem.status === "CONCLUIDA" ||
      ordem.status === "ENTREGUE" ||
      ordem.status === "CANCELADA"
    )
      return false;
    const prev = new Date(ordem.dataPrevisao);
    prev.setHours(23, 59, 59, 999);
    return prev < new Date();
  };

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
            placeholder="Buscar por cliente, telefone ou número da OS..."
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
            onClick={() => updateFilters("atrasadas", (!showAtrasadas).toString())}
          >
            Atrasadas
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
              isAtrasada={checkIsAtrasada(ordem)}
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
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col overflow-y-auto border-l border-[color:var(--border)] bg-[color:var(--surface)] shadow-2xl"
          >
            <div id="cadastro-os-titulo" className="sr-only">
              Cadastro de nova ordem de serviço
            </div>
            <OrdemServicoForm
              clientes={clientes}
              servicos={servicos}
              onClose={closeDrawer}
            />
          </aside>
        </>
      ) : null}
    </section>
  );
}
