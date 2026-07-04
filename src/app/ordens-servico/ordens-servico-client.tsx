"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Badge, Button, Card, Input, Label, SectionTitle, Textarea } from "@/components/ui";
import { Combobox } from "@/components/combobox";
import { formatCurrency, formatPhone, whatsappLink } from "@/lib/formatters";
import { ordemServicoFormSchema, type OrdemServicoFormValues } from "@/lib/ordens-servico-schema";
import type { OsStatus } from "@/lib/ordens-servico";
import {
  filtrarOrdensServicoListagem,
  ordemServicoCorrespondeBusca,
  type StatusFinanceiroListagem,
  type StatusOperacionalListagem,
} from "@/lib/ordens-servico-listagem";

type StatusFilter = StatusOperacionalListagem;

const statusOptions: Array<{ value: OsStatus; label: string; tone: "neutral" | "success" | "warning" | "danger" | "accent" }> = [
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

const financeFilterOptions: Array<{ value: StatusFinanceiroListagem; label: string }> = [
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

function getStatusTone(status: string): "neutral" | "success" | "warning" | "danger" | "accent" {
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

const defaultValues: OrdemServicoFormValues = {
  clienteId: "",
  numeroSufixo: "",
  itemRecebido: "",
  servicoId: "",
  prazoPrevisto: "",
  valorEstimado: 0,
  observacoes: "",
};

// Types corresponding to what Prisma returns
type Cliente = { id: string; nome: string; telefone: string };
type Servico = { id: string; nome: string; precoBase: any };
type ItemServico = { servico: Servico };
type Item = { descricao: string; valor: any; servicos: ItemServico[] };
type HistoricoStatus = { id: string; statusAnterior: string | null; statusNovo: string; observacao: string | null; criadoEm: Date };
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

function OrdemServicoCard({ ordem, isAtrasada }: { ordem: OrdemServicoReal, isAtrasada: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const statusLabel = statusOptions.find((o) => o.value === ordem.status)?.label ?? ordem.status;
  const itemPrincipal = ordem.itens?.[0];
  const servicoPrincipal = itemPrincipal?.servicos?.[0]?.servico;
  const statusFinanceiroLabel = ordem.statusFinanceiro === "PARCIAL"
    ? "Parcial"
    : ordem.statusFinanceiro === "PENDENTE"
      ? "Pendente"
      : ordem.statusFinanceiro === "PAGO"
        ? "Pago"
        : "Cancelado";
  const statusFinanceiroTone = ordem.statusFinanceiro === "PAGO"
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
      <Button type="button" onClick={() => handleStatusChange("EM_ANDAMENTO")} disabled={isPending}>
        {isPending ? "Processando..." : "Iniciar Serviço"}
      </Button>
    );
  } else if (ordem.status === "EM_ANDAMENTO") {
    actionButton = (
      <Button type="button" onClick={() => handleStatusChange("CONCLUIDA")} disabled={isPending}>
        {isPending ? "Processando..." : "Marcar como Concluída"}
      </Button>
    );
  } else if (ordem.status === "CONCLUIDA") {
    actionButton = (
      <Button type="button" onClick={() => handleStatusChange("ENTREGUE")} disabled={isPending}>
        {isPending ? "Processando..." : "Entregar ao Cliente"}
      </Button>
    );
  }

  return (
    <article className={`rounded-3xl border p-5 shadow-[0_12px_30px_rgba(0,0,0,0.08)] ${
      isAtrasada ? "border-rose-500/50 bg-rose-950/20" : "border-white/10 bg-white/5"
    }`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-soft)]">{ordem.numero}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{ordem.cliente?.nome}</h3>
          {(() => {
            const telefone = ordem.cliente?.telefone;
            if (!telefone) return null;
            const telefoneMascarado = formatPhone(telefone);
            const link = whatsappLink(telefone);
            if (!link) {
              return <p className="mt-1 text-sm text-slate-200">{telefoneMascarado}</p>;
            }
            return (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm text-[color:var(--accent-soft)] hover:underline"
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

      <div className="mt-5 grid gap-3 text-sm text-slate-200 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Item</p>
          <p className="mt-1 text-white">{itemPrincipal?.descricao || "Nenhum"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Serviço</p>
          <p className="mt-1 text-white">{servicoPrincipal?.nome || "Geral"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Prazo</p>
          <p className="mt-1 text-white">{ordem.dataPrevisao ? dateFormatter.format(new Date(ordem.dataPrevisao)) : "-"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Valor Total</p>
          <p className="mt-1 text-white">{currencyFormatter.format(Number(ordem.valorTotal))}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Valor Pago</p>
          <p className="mt-1 text-white">{currencyFormatter.format(Number(ordem.valorPago || 0))}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Saldo</p>
          <p className="mt-1 text-white">{currencyFormatter.format(Number(ordem.saldo || 0))}</p>
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Observações</p>
          <p className="mt-1 text-white">{ordem.observacoes || "Sem observações adicionais."}</p>
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-400">{error}</p>}

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
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
            className="text-sm font-semibold text-[color:var(--accent-soft)] hover:underline"
          >
            {showHistory ? "Ocultar Histórico" : "Ver Histórico"}
          </button>
        )}
      </div>

      {showHistory && ordem.historicosStatus && (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Histórico de Status</p>
          <div className="space-y-2">
            {ordem.historicosStatus.map((h) => (
              <div key={h.id} className="flex items-start gap-3 text-sm">
                <span className="whitespace-nowrap text-slate-400">
                  {new Date(h.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </span>
                <span className="text-slate-200">
                  {h.statusAnterior ? `${h.statusAnterior} → ` : ""}
                  <span className="font-semibold text-white">{h.statusNovo}</span>
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

export function OrdensServicoClient({
  initialOrders,
  clientes,
  servicos,
}: {
  initialOrders: any[];
  clientes: Cliente[];
  servicos: Servico[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get("statusOp") as StatusFilter) || "TODAS"
  );
  const [financeFilter, setFinanceFilter] = useState<StatusFinanceiroListagem>(
    (searchParams.get("statusFin") as StatusFinanceiroListagem) || "TODAS"
  );
  const [searchTerm, setSearchTerm] = useState(searchParams.get("busca") || "");
  const [showAtrasadas, setShowAtrasadas] = useState(searchParams.get("atrasadas") === "true");

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
    [searchParams]
  );

  const updateFilters = (key: string, value: string) => {
    const qs = createQueryString(key, value);
    router.replace(`${pathname}?${qs}`, { scroll: false });
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrdemServicoFormValues>({
    resolver: zodResolver(ordemServicoFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const selectedServicoId = watch("servicoId");

  useEffect(() => {
    if (selectedServicoId) {
      const servico = servicos.find(s => s.id === selectedServicoId);
      if (servico && servico.precoBase) {
        setValue("valorEstimado", Number(servico.precoBase));
      }
    }
  }, [selectedServicoId, servicos, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const response = await fetch("/api/ordens-servico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = await response.json();
      setSubmitError(payload.message ?? "Não foi possível criar a ordem de serviço.");
      return;
    }

    reset(defaultValues);

    startTransition(() => {
      router.refresh();
    });
  });

  const ordens = initialOrders as OrdemServicoReal[];
  
  const filteredOrders = filtrarOrdensServicoListagem({
    ordens,
    statusOperacional: statusFilter,
    statusFinanceiro: financeFilter,
  }).filter((ordem) => {
    // Aplica filtro de texto (Busca): nome, número da OS e telefone normalizado
    if (searchTerm && !ordemServicoCorrespondeBusca(ordem, searchTerm)) {
      return false;
    }
    
    // Aplica filtro de atrasadas
    if (showAtrasadas) {
      if (ordem.status === "CONCLUIDA" || ordem.status === "ENTREGUE" || ordem.status === "CANCELADA") return false;
      const prev = new Date(ordem.dataPrevisao);
      prev.setHours(23, 59, 59, 999);
      if (prev >= new Date()) return false;
    }
    
    return true;
  });

  const checkIsAtrasada = (ordem: OrdemServicoReal) => {
    if (ordem.status === "CONCLUIDA" || ordem.status === "ENTREGUE" || ordem.status === "CANCELADA") return false;
    const prev = new Date(ordem.dataPrevisao);
    prev.setHours(23, 59, 59, 999);
    return prev < new Date();
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section id="nova-ordem">
        <Card className="p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Nova ordem</p>
              <SectionTitle className="mt-2 text-2xl">Cadastro de OS</SectionTitle>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
                Selecione o cliente e os dados do serviço para registrar no banco de dados.
              </p>
            </div>
            <Badge tone="accent">Banco Real</Badge>
          </div>

          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="clienteId">Cliente</Label>
              <Combobox
                id="clienteId"
                options={clientes.map(c => ({ value: c.id, label: c.nome, subLabel: c.telefone }))}
                value={watch("clienteId")}
                onChange={(val) => setValue("clienteId", val, { shouldValidate: true })}
                placeholder="Selecione um cliente..."
                emptyText="Cliente não encontrado"
              />
              {errors.clienteId ? <p className="text-sm text-red-600">{errors.clienteId.message}</p> : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="numeroSufixo">Número da OS (4 dígitos finais)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 font-semibold uppercase">OS-{new Date().toLocaleDateString('pt-BR', {timeZone: 'America/Sao_Paulo'}).replace(/\//g, '')}-</span>
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
              {errors.numeroSufixo ? <p className="text-sm text-red-600">{errors.numeroSufixo.message}</p> : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="itemRecebido">Item recebido</Label>
              <Input
                id="itemRecebido"
                {...register("itemRecebido")}
                placeholder="Ex.: tênis preto"
              />
              {errors.itemRecebido ? <p className="text-sm text-red-600">{errors.itemRecebido.message}</p> : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="servicoId">Serviço Solicitado (Opcional)</Label>
              <Combobox
                id="servicoId"
                options={servicos.map(s => ({ value: s.id, label: s.nome }))}
                value={watch("servicoId") || ""}
                onChange={(val) => setValue("servicoId", val, { shouldValidate: true })}
                placeholder="Nenhum / Cadastrar depois"
                emptyText="Serviço não encontrado"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="prazoPrevisto">Prazo previsto</Label>
                <Input
                  id="prazoPrevisto"
                  type="date"
                  {...register("prazoPrevisto")}
                />
                {errors.prazoPrevisto ? <p className="text-sm text-red-600">{errors.prazoPrevisto.message}</p> : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="valorEstimado">Valor total (R$)</Label>
                <Input
                  id="valorEstimado"
                  type="text"
                  {...register("valorEstimado")}
                  onChange={(e) => {
                    e.target.value = formatCurrency(e.target.value);
                    register("valorEstimado").onChange(e);
                  }}
                  placeholder="R$ 0,00"
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

            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Cadastrar ordem"}
              </Button>
            </div>
          </form>
        </Card>
      </section>

      <Card className="bg-[color:var(--text)] p-6 text-white">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-soft)]">Lista de ordens</p>
            <h2 className="mt-2 text-2xl font-semibold">OS Registradas</h2>
          </div>

          <Badge tone="accent">{ordens.length} ordens</Badge>
        </div>

        <div className="mb-4">
          <Input 
            placeholder="Buscar por cliente ou número da OS..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              updateFilters("busca", e.target.value);
            }}
            className="max-w-md !bg-white/10 !text-white !border-white/20 placeholder:text-slate-400"
          />
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const active = statusFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setStatusFilter(option.value as StatusFilter);
                  updateFilters("statusOp", option.value);
                }}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-transparent bg-white text-[color:var(--text)]"
                    : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {option.label}
              </button>
            );
          })}
          
          <button
            type="button"
            onClick={() => {
              setShowAtrasadas(!showAtrasadas);
              updateFilters("atrasadas", (!showAtrasadas).toString());
            }}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              showAtrasadas
                ? "border-transparent bg-rose-500 text-white"
                : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            Atrasadas
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {financeFilterOptions.map((option) => {
            const active = financeFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setFinanceFilter(option.value);
                  updateFilters("statusFin", option.value);
                }}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-transparent bg-amber-100 text-amber-900"
                    : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-200">
            Nenhuma ordem encontrada.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((ordem) => (
              <OrdemServicoCard key={ordem.id} ordem={ordem} isAtrasada={checkIsAtrasada(ordem)} />
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}