"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
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
import type { OsStatus } from "@/lib/ordens-servico";
import {
  filtrarOrdensServicoListagem,
  ordemServicoCorrespondeBusca,
  type StatusFinanceiroListagem,
  type StatusOperacionalListagem,
} from "@/lib/ordens-servico-listagem";

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
];

const filterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "TODAS", label: "Todas" },
  { value: "ABERTA", label: "Abertas" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "CONCLUIDA", label: "Concluídas" },
  { value: "ENTREGUE", label: "Entregues" },
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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
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
    default:
      return "neutral";
  }
}

const criarDefaultValues = (): OrdemServicoFormValues => ({
  clienteId: "",
  numeroSufixo: "",
  itemRecebido: "",
  servicoId: "",
  servicos: [],
  dataEntrada: dataOperacionalHoje(),
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

  let actionButton = null;
  if (ordem.status === "ABERTA") {
    actionButton = (
      <Button
        type="button"
        onClick={() => handleStatusChange("EM_ANDAMENTO")}
        disabled={isPending}
      >
        {isPending ? "Processando..." : "Iniciar Serviço"}
      </Button>
    );
  } else if (ordem.status === "EM_ANDAMENTO") {
    actionButton = (
      <Button
        type="button"
        onClick={() => handleStatusChange("CONCLUIDA")}
        disabled={isPending}
      >
        {isPending ? "Processando..." : "Marcar como Concluída"}
      </Button>
    );
  } else if (ordem.status === "CONCLUIDA") {
    actionButton = (
      <Button
        type="button"
        onClick={() => handleStatusChange("ENTREGUE")}
        disabled={isPending}
      >
        {isPending ? "Processando..." : "Entregar ao Cliente"}
      </Button>
    );
  }

  return (
    <article
      className={`rounded-[var(--r-field)] border p-4 transition ${
        isAtrasada
          ? "border-rose-300 bg-rose-50/60"
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
            {currencyFormatter.format(Number(ordem.valorTotal))}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Valor Pago
          </p>
          <p className="mt-1 text-[color:var(--text)]">
            {currencyFormatter.format(Number(ordem.valorPago || 0))}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Saldo
          </p>
          <p className="mt-1 font-semibold text-[color:var(--text)]">
            {currencyFormatter.format(Number(ordem.saldo || 0))}
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
                  disabled={clienteSubmitting}
                  onClick={onSubmitCliente}
                >
                  {clienteSubmitting ? "Salvando cliente..." : "Salvar cliente"}
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
            <Label htmlFor="numeroSufixo">
              Número da OS (4 dígitos finais)
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 font-semibold uppercase">
                OS-
                {new Date()
                  .toLocaleDateString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })
                  .replace(/\//g, "")}
                -
              </span>
              <Input
                id="numeroSufixo"
                {...register("numeroSufixo")}
                onChange={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, "");
                  register("numeroSufixo").onChange(e);
                }}
                placeholder="Ex.: 0001"
                maxLength={4}
                className="w-32"
              />
            </div>
            {errors.numeroSufixo ? (
              <p className="text-sm text-red-600">
                {errors.numeroSufixo.message}
              </p>
            ) : null}
          </div>

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
                Registro retroativo — o número da OS continua sendo gerado com a
                data de hoje.
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Cadastrar ordem"}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}

function OrdemServicoList({ ordens }: { ordens: OrdemServicoReal[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get("statusOp") as StatusFilter) || "TODAS",
  );
  const [financeFilter, setFinanceFilter] = useState<StatusFinanceiroListagem>(
    (searchParams.get("statusFin") as StatusFinanceiroListagem) || "TODAS",
  );
  const [searchTerm, setSearchTerm] = useState(searchParams.get("busca") || "");
  const [showAtrasadas, setShowAtrasadas] = useState(
    searchParams.get("atrasadas") === "true",
  );

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "TODAS" && value !== "false") {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams],
  );

  const updateFilters = (key: string, value: string) => {
    const qs = createQueryString(key, value);
    router.replace(`${pathname}?${qs}`, { scroll: false });
  };

  const filteredOrders = filtrarOrdensServicoListagem({
    ordens,
    statusOperacional: statusFilter,
    statusFinanceiro: financeFilter,
  }).filter((ordem) => {
    if (searchTerm && !ordemServicoCorrespondeBusca(ordem, searchTerm)) {
      return false;
    }

    if (showAtrasadas) {
      if (
        ordem.status === "CONCLUIDA" ||
        ordem.status === "ENTREGUE" ||
        ordem.status === "CANCELADA"
      )
        return false;
      const prev = new Date(ordem.dataPrevisao);
      prev.setHours(23, 59, 59, 999);
      if (prev >= new Date()) return false;
    }

    return true;
  });

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

  const totalAbertas = ordens.filter(
    (ordem) => ordem.status === "ABERTA",
  ).length;
  const totalEmAndamento = ordens.filter(
    (ordem) => ordem.status === "EM_ANDAMENTO",
  ).length;
  const totalComSaldo = ordens.filter(
    (ordem) => Number(ordem.saldo || 0) > 0,
  ).length;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[color:var(--border)] p-5">
        <PanelHeader
          eyebrow="Fila de atendimento"
          title="OS registradas"
          description={`${filteredOrders.length} de ${ordens.length} ordens visíveis`}
          action={<Badge tone="accent">{ordens.length} ordens</Badge>}
        />
      </div>

      <div className="grid gap-3 border-b border-[color:var(--border)] p-4 sm:grid-cols-3">
        <StatCard
          label="Abertas"
          value={totalAbertas}
          hint="Aguardando início"
          active={statusFilter === "ABERTA"}
          onClick={() => {
            setStatusFilter("ABERTA");
            updateFilters("statusOp", "ABERTA");
          }}
        />
        <StatCard
          label="Em andamento"
          value={totalEmAndamento}
          hint="Na oficina"
          active={statusFilter === "EM_ANDAMENTO"}
          onClick={() => {
            setStatusFilter("EM_ANDAMENTO");
            updateFilters("statusOp", "EM_ANDAMENTO");
          }}
        />
        <StatCard
          label="Com saldo"
          value={totalComSaldo}
          hint="A receber"
          active={financeFilter === "COM_SALDO_EM_ABERTO"}
          onClick={() => {
            setFinanceFilter("COM_SALDO_EM_ABERTO");
            updateFilters("statusFin", "COM_SALDO_EM_ABERTO");
          }}
        />
      </div>

      <div className="border-b border-[color:var(--border)] p-4">
        <Input
          placeholder="Buscar por cliente ou número da OS..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            updateFilters("busca", e.target.value);
          }}
          className="max-w-md"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <FilterChip
              key={option.value}
              active={statusFilter === option.value}
              onClick={() => {
                setStatusFilter(option.value as StatusFilter);
                updateFilters("statusOp", option.value);
              }}
            >
              {option.label}
            </FilterChip>
          ))}
          {financeFilterOptions.slice(1).map((option) => (
            <FilterChip
              key={option.value}
              tone="warning"
              active={financeFilter === option.value}
              onClick={() => {
                setFinanceFilter(option.value);
                updateFilters("statusFin", option.value);
              }}
            >
              Financeiro: {option.label}
            </FilterChip>
          ))}
          <FilterChip
            tone="danger"
            active={showAtrasadas}
            onClick={() => {
              setShowAtrasadas(!showAtrasadas);
              updateFilters("atrasadas", (!showAtrasadas).toString());
            }}
          >
            Atrasadas
          </FilterChip>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="m-4 rounded-[var(--r-field)] border border-dashed border-black/10 bg-[color:var(--surface-muted)] p-6 text-sm leading-6 text-slate-600">
          Nenhuma ordem encontrada.
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {filteredOrders.map((ordem) => (
            <OrdemServicoCard
              key={ordem.id}
              ordem={ordem}
              isAtrasada={checkIsAtrasada(ordem)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

export function OrdensServicoClient({
  initialOrders,
  clientes,
  servicos,
}: {
  initialOrders: any[];
  clientes: Cliente[];
  servicos: Servico[];
}) {
  const ordens = initialOrders as OrdemServicoReal[];
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    if (window.location.hash === "#nova-ordem") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    const syncDrawerWithHash = () => {
      setDrawerOpen(window.location.hash === "#nova-ordem");
    };

    syncDrawerWithHash();
    window.addEventListener("hashchange", syncDrawerWithHash);
    return () => window.removeEventListener("hashchange", syncDrawerWithHash);
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
      <OrdemServicoList ordens={ordens} />
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
