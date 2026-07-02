"use client";

import { useState } from "react";

import { Badge, Button, Card, Input, Label, SectionTitle, Textarea } from "@/components/ui";

type OsStatus = "ABERTA" | "EM_ANDAMENTO" | "AGUARDANDO_APROVACAO" | "FINALIZADA" | "ENTREGUE";

type OrdemServico = {
  numero: number;
  cliente: string;
  telefone: string;
  item: string;
  servico: string;
  observacoes: string;
  prazoPrevisto: string;
  valorEstimado: number;
  status: OsStatus;
};

type NovaOrdemForm = {
  cliente: string;
  telefone: string;
  itemRecebido: string;
  servicoSolicitado: string;
  observacoes: string;
  prazoPrevisto: string;
  valorEstimado: string;
  status: OsStatus;
};

const statusOptions: Array<{ value: OsStatus; label: string; tone: "neutral" | "success" | "warning" | "danger" | "accent" }> = [
  { value: "ABERTA", label: "Aberta", tone: "neutral" },
  { value: "EM_ANDAMENTO", label: "Em andamento", tone: "warning" },
  { value: "AGUARDANDO_APROVACAO", label: "Aguardando aprovação", tone: "accent" },
  { value: "FINALIZADA", label: "Finalizada", tone: "success" },
  { value: "ENTREGUE", label: "Entregue", tone: "neutral" },
];

const initialOrders: OrdemServico[] = [
  {
    numero: 1201,
    cliente: "Marcos Almeida",
    telefone: "(11) 98888-1201",
    item: "Tênis casual preto",
    servico: "Troca de sola e limpeza",
    observacoes: "Cliente pediu prioridade para sexta-feira.",
    prazoPrevisto: "2026-07-04",
    valorEstimado: 120,
    status: "EM_ANDAMENTO",
  },
  {
    numero: 1202,
    cliente: "Carla Souza",
    telefone: "(11) 97777-1202",
    item: "Sapatilha de couro",
    servico: "Reforço nas laterais",
    observacoes: "Aguardando confirmação do valor.",
    prazoPrevisto: "2026-07-05",
    valorEstimado: 85,
    status: "AGUARDANDO_APROVACAO",
  },
  {
    numero: 1203,
    cliente: "João Pedro",
    telefone: "(11) 96666-1203",
    item: "Bota marrom",
    servico: "Troca de zíper",
    observacoes: "Recebida com desgaste interno.",
    prazoPrevisto: "2026-07-03",
    valorEstimado: 95,
    status: "ABERTA",
  },
];

const defaultFormValues: NovaOrdemForm = {
  cliente: "",
  telefone: "",
  itemRecebido: "",
  servicoSolicitado: "",
  observacoes: "",
  prazoPrevisto: "",
  valorEstimado: "",
  status: "ABERTA",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatOsNumero(numero: number) {
  return `OS-${String(numero).padStart(4, "0")}`;
}

function getStatusTone(status: OsStatus): "neutral" | "success" | "warning" | "danger" | "accent" {
  switch (status) {
    case "EM_ANDAMENTO":
      return "warning";
    case "AGUARDANDO_APROVACAO":
      return "accent";
    case "FINALIZADA":
      return "success";
    case "ENTREGUE":
      return "neutral";
    default:
      return "neutral";
  }
}

export function OrdensServicoClient() {
  const [ordens, setOrdens] = useState(initialOrders);
  const [formValues, setFormValues] = useState(defaultFormValues);

  function updateField(field: keyof NovaOrdemForm, value: string) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setOrdens((current) => {
      const nextNumero = current.reduce((maxNumero, ordem) => Math.max(maxNumero, ordem.numero), 1200) + 1;
      const novaOrdem: OrdemServico = {
        numero: nextNumero,
        cliente: formValues.cliente.trim(),
        telefone: formValues.telefone.trim(),
        item: formValues.itemRecebido.trim(),
        servico: formValues.servicoSolicitado.trim(),
        observacoes: formValues.observacoes.trim(),
        prazoPrevisto: formValues.prazoPrevisto,
        valorEstimado: Number(formValues.valorEstimado),
        status: formValues.status,
      };

      return [novaOrdem, ...current];
    });

    setFormValues(defaultFormValues);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section id="nova-ordem">
        <Card className="p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Nova ordem</p>
            <SectionTitle className="mt-2 text-2xl">Cadastro rápido em memória</SectionTitle>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
              Preencha os dados principais da OS para simular o fluxo de atendimento e ver o novo registro imediatamente na listagem ao lado.
            </p>
          </div>

          <Badge tone="accent">Local</Badge>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Input
              id="cliente"
              required
              value={formValues.cliente}
              onChange={(event) => updateField("cliente", event.target.value)}
              placeholder="Nome do cliente"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              required
              value={formValues.telefone}
              onChange={(event) => updateField("telefone", event.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="itemRecebido">Item recebido</Label>
            <Input
              id="itemRecebido"
              required
              value={formValues.itemRecebido}
              onChange={(event) => updateField("itemRecebido", event.target.value)}
              placeholder="Ex.: tênis, bota, sandália"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="servicoSolicitado">Serviço solicitado</Label>
            <Input
              id="servicoSolicitado"
              required
              value={formValues.servicoSolicitado}
              onChange={(event) => updateField("servicoSolicitado", event.target.value)}
              placeholder="Ex.: colagem, troca de sola, ajuste"
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="prazoPrevisto">Prazo previsto</Label>
              <Input
                id="prazoPrevisto"
                required
                type="date"
                value={formValues.prazoPrevisto}
                onChange={(event) => updateField("prazoPrevisto", event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="valorEstimado">Valor estimado</Label>
              <Input
                id="valorEstimado"
                required
                inputMode="decimal"
                type="number"
                min="0"
                step="0.01"
                value={formValues.valorEstimado}
                onChange={(event) => updateField("valorEstimado", event.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status inicial</Label>
            <select
              id="status"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]"
              value={formValues.status}
              onChange={(event) => updateField("status", event.target.value as OsStatus)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              rows={4}
              value={formValues.observacoes}
              onChange={(event) => updateField("observacoes", event.target.value)}
              placeholder="Detalhes adicionais do atendimento"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit">Cadastrar ordem</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFormValues(defaultFormValues)}
            >
              Limpar
            </Button>
          </div>
        </form>
        </Card>
      </section>

      <Card className="bg-[color:var(--text)] p-6 text-white">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-soft)]">Lista de ordens</p>
            <h2 className="mt-2 text-2xl font-semibold">OS mockadas e novas inclusões</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
              A fila abaixo representa a visão inicial do balcão, com os campos essenciais para consulta rápida e uma nova ordem adicionada em memória.
            </p>
          </div>

          <Badge tone="accent">{ordens.length} ordens</Badge>
        </div>

        {ordens.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-200">
            Nenhuma ordem cadastrada ainda. Use o formulário ao lado para criar a primeira OS.
          </div>
        ) : (
          <div className="space-y-4">
            {ordens.map((ordem) => {
              const statusLabel = statusOptions.find((option) => option.value === ordem.status)?.label ?? ordem.status;

              return (
                <article key={ordem.numero} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-soft)]">{formatOsNumero(ordem.numero)}</p>
                      <h3 className="mt-2 text-lg font-semibold text-white">{ordem.cliente}</h3>
                      <p className="mt-1 text-sm text-slate-200">{ordem.telefone}</p>
                    </div>

                    <Badge tone={getStatusTone(ordem.status)}>{statusLabel}</Badge>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm text-slate-200 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Item</p>
                      <p className="mt-1 text-white">{ordem.item}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Serviço</p>
                      <p className="mt-1 text-white">{ordem.servico}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Prazo</p>
                      <p className="mt-1 text-white">{dateFormatter.format(new Date(`${ordem.prazoPrevisto}T12:00:00`))}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Valor estimado</p>
                      <p className="mt-1 text-white">{currencyFormatter.format(ordem.valorEstimado)}</p>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Observações</p>
                      <p className="mt-1 text-white">{ordem.observacoes || "Sem observações adicionais."}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}