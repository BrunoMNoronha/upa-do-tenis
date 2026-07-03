"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Badge, Button, Card, Input, Label, SectionTitle, Textarea } from "@/components/ui";
import { ordemServicoFormSchema, type OrdemServicoFormValues } from "@/lib/ordens-servico-schema";
import type { OsStatus } from "@/lib/ordens-servico";

type StatusFilter = "TODAS" | OsStatus;

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
  itemRecebido: "",
  servicoId: "",
  prazoPrevisto: "",
  valorEstimado: 0,
  observacoes: "",
};

// Types corresponding to what Prisma returns
type Cliente = { id: string; nome: string; telefone: string };
type Servico = { id: string; nome: string };
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
  itens: Item[];
  historicosStatus?: HistoricoStatus[];
};

function OrdemServicoCard({ ordem }: { ordem: OrdemServicoReal }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const statusLabel = statusOptions.find((o) => o.value === ordem.status)?.label ?? ordem.status;
  const itemPrincipal = ordem.itens?.[0];
  const servicoPrincipal = itemPrincipal?.servicos?.[0]?.servico;

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
    <article className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-soft)]">{ordem.numero}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{ordem.cliente?.nome}</h3>
          <p className="mt-1 text-sm text-slate-200">{ordem.cliente?.telefone}</p>
        </div>

        <Badge tone={getStatusTone(ordem.status)}>{statusLabel}</Badge>
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
        <div className="sm:col-span-2 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Observações</p>
          <p className="mt-1 text-white">{ordem.observacoes || "Sem observações adicionais."}</p>
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-400">{error}</p>}

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
        {actionButton ? actionButton : <div />}

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("TODAS");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrdemServicoFormValues>({
    resolver: zodResolver(ordemServicoFormSchema),
    defaultValues,
  });

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
  const filteredOrders = ordens.filter((ordem) => (statusFilter === "TODAS" ? true : ordem.status === statusFilter));

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
              <select
                id="clienteId"
                {...register("clienteId")}
                className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[color:var(--accent-strong)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} - {c.telefone}
                  </option>
                ))}
              </select>
              {errors.clienteId ? <p className="text-sm text-red-600">{errors.clienteId.message}</p> : null}
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
              <select
                id="servicoId"
                {...register("servicoId")}
                className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[color:var(--accent-strong)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Nenhum / Cadastrar depois</option>
                {servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
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
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("valorEstimado")}
                  placeholder="0,00"
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

        <div className="mb-5 flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const active = statusFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value as StatusFilter)}
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
        </div>

        {filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-200">
            Nenhuma ordem encontrada.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((ordem) => (
              <OrdemServicoCard key={ordem.id} ordem={ordem} />
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}