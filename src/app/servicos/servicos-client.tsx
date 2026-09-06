"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Badge, Button, Card, Input, Label, SectionTitle, Textarea } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCadastroAcoes } from "@/components/use-cadastro-acoes";
import { servicoFormSchema, type ServicoFormValues } from "@/lib/servicos-schema";
import { formatCurrency, maskCurrency } from "@/lib/formatters";

export type ServicoListado = {
  id: string;
  nome: string;
  descricao: string | null;
  precoBase: number;
  ativo: boolean;
  criadoEm: string;
};

type ServicosClientProps = {
  servicos: ServicoListado[];
};

const defaultValues: ServicoFormValues = {
  nome: "",
  descricao: "",
  precoBase: 0,
  ativo: true,
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

export function ServicosClient({ servicos }: ServicosClientProps) {
  const router = useRouter();
  const [editando, setEditando] = useState<ServicoListado | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    listaError,
    isPending,
    startTransition,
    alternarStatus,
    itemParaExcluir,
    pedirExclusao,
    cancelarExclusao,
    confirmarExclusao,
  } = useCadastroAcoes<ServicoListado>({ endpoint: "/api/servicos", rotulo: "o serviço" });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServicoFormValues>({
    resolver: zodResolver(servicoFormSchema),
    defaultValues,
    mode: "onChange",
  });
  const precoBaseField = register("precoBase");

  const iniciarEdicao = (servico: ServicoListado) => {
    setEditando(servico);
    setSubmitError(null);
    reset({
      nome: servico.nome,
      descricao: servico.descricao ?? "",
      precoBase: formatCurrency(servico.precoBase) as unknown as number,
      ativo: servico.ativo,
    });
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setSubmitError(null);
    reset(defaultValues);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const url = editando ? `/api/servicos/${editando.id}` : "/api/servicos";

    const response = await fetch(url, {
      method: editando ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setSubmitError(payload.message ?? "Não foi possível salvar o serviço.");
      return;
    }

    setEditando(null);
    reset(defaultValues);

    startTransition(() => {
      router.refresh();
    });
  });

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
            {editando ? "Editar Serviço" : "Novo Cadastro"}
          </p>
          <SectionTitle className="mt-2 text-2xl">
            {editando ? `Editando ${editando.nome}` : "Dados do serviço"}
          </SectionTitle>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome do Serviço</Label>
            <Input id="nome" {...register("nome")} placeholder="Ex: Troca de Sola" />
            {errors.nome ? <p className="text-sm text-red-600">{errors.nome.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="precoBase">Preço Base (R$)</Label>
            <Input
              id="precoBase"
              type="text"
              {...precoBaseField}
              onChange={(e) => {
                e.target.value = maskCurrency(e.target.value);
                precoBaseField.onChange(e);
              }}
              onBlur={(e) => {
                if (e.target.value) {
                  e.target.value = formatCurrency(e.target.value);
                  precoBaseField.onChange(e);
                }
                precoBaseField.onBlur(e);
              }}
              placeholder="R$ 0,00"
            />
            {errors.precoBase ? <p className="text-sm text-red-600">{errors.precoBase.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              {...register("descricao")}
              rows={3}
              placeholder="Detalhes adicionais sobre o serviço"
            />
          </div>

          {editando ? (
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <Input type="checkbox" className="h-4 w-4" {...register("ativo")} />
              Serviço ativo
            </label>
          ) : null}

          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting || isPending}>
              {isSubmitting || isPending ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar Serviço"}
            </Button>
            {editando ? (
              <Button type="button" variant="secondary" onClick={cancelarEdicao}>
                Cancelar edição
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="bg-[color:var(--text)] p-6 text-white">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-soft)]">Lista</p>
            <h2 className="mt-2 text-2xl font-semibold">Serviços Cadastrados</h2>
          </div>
          <Badge tone="accent">Total: {servicos.length}</Badge>
        </div>

        {listaError ? (
          <p className="mb-4 rounded-2xl border border-rose-500/50 bg-rose-950/20 p-4 text-sm text-rose-200">
            {listaError}
          </p>
        ) : null}

        {servicos.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-200">
            Nenhum serviço cadastrado ainda. Use o formulário ao lado para criar o primeiro registro.
          </div>
        ) : (
          <div className="space-y-4">
            {servicos.map((servico) => (
              <article
                key={servico.id}
                className={`rounded-3xl border p-5 ${
                  servico.ativo ? "border-white/10 bg-white/5" : "border-rose-500/50 bg-rose-950/20"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{servico.nome}</h3>
                    {servico.descricao ? (
                      <p className="mt-1 text-sm text-slate-300">{servico.descricao}</p>
                    ) : null}
                    <p className="mt-2 text-xs uppercase tracking-[0.1em] text-slate-400">
                      Criado em {dateFormatter.format(new Date(servico.criadoEm))}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone="neutral">{currencyFormatter.format(servico.precoBase)}</Badge>
                    <Badge tone={servico.ativo ? "success" : "danger"}>
                      {servico.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => iniciarEdicao(servico)}
                    className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => alternarStatus(servico)}
                    disabled={isPending || editando !== null}
                    title={editando ? "Salve ou cancele a edição antes de alterar o status pela lista." : undefined}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      servico.ativo
                        ? "border-amber-400/40 text-amber-200 hover:bg-amber-950/40"
                        : "border-emerald-400/40 text-emerald-200 hover:bg-emerald-950/40"
                    }`}
                  >
                    {servico.ativo ? "Inativar" : "Reativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => pedirExclusao(servico)}
                    disabled={isPending}
                    className="rounded-full border border-rose-400/40 px-4 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        aberto={itemParaExcluir !== null}
        titulo="Excluir serviço"
        descricao={`Excluir o serviço "${itemParaExcluir?.nome ?? ""}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
        tone="danger"
        onConfirmar={() =>
          confirmarExclusao((servico) => {
            if (editando?.id === servico.id) {
              cancelarEdicao();
            }
          })
        }
        onCancelar={cancelarExclusao}
      />
    </section>
  );
}
