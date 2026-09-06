"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Badge, Button, Card, Input, Label, SectionTitle } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCadastroAcoes } from "@/components/use-cadastro-acoes";
import { formaPagamentoFormSchema, type FormaPagamentoFormValues } from "@/lib/formas-pagamento-schema";
import {
  TIPOS_FORMA_PAGAMENTO,
  TIPO_FORMA_PAGAMENTO_LABELS,
  type TipoFormaPagamento,
} from "@/lib/formas-pagamento-tipos";

export type FormaPagamentoListada = {
  id: string;
  nome: string;
  tipo: string | null;
  ativo: boolean;
  /** Já possui pagamento, venda ou movimentação de caixa vinculados. */
  possuiMovimento: boolean;
};

type FormasPagamentoClientProps = {
  formas: FormaPagamentoListada[];
};

const defaultValues: Partial<FormaPagamentoFormValues> = {
  nome: "",
};

function rotularTipo(tipo: string | null) {
  if (!tipo) {
    return "Não informado";
  }

  return TIPO_FORMA_PAGAMENTO_LABELS[tipo as TipoFormaPagamento] ?? tipo;
}

export function FormasPagamentoClient({ formas }: FormasPagamentoClientProps) {
  const router = useRouter();
  const [editando, setEditando] = useState<FormaPagamentoListada | null>(null);
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
  } = useCadastroAcoes<FormaPagamentoListada>({
    endpoint: "/api/formas-pagamento",
    rotulo: "a forma de pagamento",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormaPagamentoFormValues>({
    resolver: zodResolver(formaPagamentoFormSchema),
    defaultValues,
    mode: "onChange",
  });

  // O caixa identifica dinheiro físico por `tipo` (ver src/lib/caixa.ts): trocar
  // o tipo de uma forma que já tem movimento reescreveria fechamentos passados.
  const tipoBloqueado = editando !== null && editando.possuiMovimento;

  const iniciarEdicao = (forma: FormaPagamentoListada) => {
    setEditando(forma);
    setSubmitError(null);
    reset({
      nome: forma.nome,
      tipo: (forma.tipo ?? undefined) as FormaPagamentoFormValues["tipo"],
    });
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setSubmitError(null);
    reset(defaultValues);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const url = editando ? `/api/formas-pagamento/${editando.id}` : "/api/formas-pagamento";

    // Com o tipo travado, envia só o que pode mudar — assim um reenvio do mesmo
    // valor não é confundido com tentativa de alteração.
    const body = tipoBloqueado ? { nome: values.nome } : values;

    const response = await fetch(url, {
      method: editando ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setSubmitError(payload.message ?? "Não foi possível salvar a forma de pagamento.");
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
            {editando ? "Editar Forma" : "Novo Cadastro"}
          </p>
          <SectionTitle className="mt-2 text-2xl">
            {editando ? `Editando ${editando.nome}` : "Adicionar forma"}
          </SectionTitle>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" {...register("nome")} placeholder="Ex: Cartão de Crédito Visa" />
            {errors.nome ? <p className="text-sm text-red-600">{errors.nome.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tipo">Tipo Interno</Label>
            <select
              id="tipo"
              {...register("tipo")}
              disabled={tipoBloqueado}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="" disabled>
                Selecione o tipo...
              </option>
              {TIPOS_FORMA_PAGAMENTO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {TIPO_FORMA_PAGAMENTO_LABELS[tipo]}
                </option>
              ))}
            </select>
            {tipoBloqueado ? (
              <p className="text-xs text-amber-700">
                O tipo está travado porque esta forma já possui pagamentos, vendas ou movimentações de caixa —
                alterá-lo reescreveria o fechamento de caixa. Para corrigir, inative-a e cadastre uma nova forma
                com o tipo correto.
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Use &quot;Dinheiro&quot; para formas que representam dinheiro físico — o caixa usa este campo para
                calcular o saldo da gaveta.
              </p>
            )}
            {errors.tipo ? <p className="text-sm text-red-600">{errors.tipo.message}</p> : null}
          </div>

          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting || isPending}>
              {isSubmitting || isPending ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar"}
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
            <h2 className="mt-2 text-2xl font-semibold">Formas Aceitas</h2>
          </div>
          <Badge tone="accent">Total: {formas.length}</Badge>
        </div>

        {listaError ? (
          <p className="mb-4 rounded-2xl border border-rose-500/50 bg-rose-950/20 p-4 text-sm text-rose-200">
            {listaError}
          </p>
        ) : null}

        {formas.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-200">
            Nenhuma forma de pagamento cadastrada.
          </div>
        ) : (
          <div className="space-y-4">
            {formas.map((forma) => (
              <article
                key={forma.id}
                className={`rounded-3xl border p-5 ${
                  forma.ativo ? "border-white/10 bg-white/5" : "border-rose-500/50 bg-rose-950/20"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{forma.nome}</h3>
                    <p className="mt-1 text-sm text-slate-400">Tipo: {rotularTipo(forma.tipo)}</p>
                  </div>
                  <Badge tone={forma.ativo ? "success" : "danger"}>{forma.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => iniciarEdicao(forma)}
                    className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => alternarStatus(forma)}
                    disabled={isPending}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      forma.ativo
                        ? "border-amber-400/40 text-amber-200 hover:bg-amber-950/40"
                        : "border-emerald-400/40 text-emerald-200 hover:bg-emerald-950/40"
                    }`}
                  >
                    {forma.ativo ? "Inativar" : "Reativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => pedirExclusao(forma)}
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
        titulo="Excluir forma de pagamento"
        descricao={`Excluir a forma de pagamento "${itemParaExcluir?.nome ?? ""}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
        tone="danger"
        onConfirmar={() =>
          confirmarExclusao((forma) => {
            if (editando?.id === forma.id) {
              cancelarEdicao();
            }
          })
        }
        onCancelar={cancelarExclusao}
      />
    </section>
  );
}
