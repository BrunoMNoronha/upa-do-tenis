"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Badge, Button, Card, Input, Label, SectionTitle, Textarea } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCadastroAcoes } from "@/components/use-cadastro-acoes";
import { insumoFormSchema, type InsumoFormValues } from "@/lib/insumos-schema";
import { formatCurrency, maskCurrency } from "@/lib/formatters";

export type InsumoListado = {
  id: string;
  nome: string;
  descricao: string | null;
  unidadeMedida: string;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  custoUnitario: number;
  ativo: boolean;
};

type InsumosClientProps = {
  insumos: InsumoListado[];
  mostrarAlerta: boolean;
};

const defaultValues: InsumoFormValues = {
  nome: "",
  descricao: "",
  unidadeMedida: "",
  quantidadeEstoque: 0,
  estoqueMinimo: 0,
  custoUnitario: 0,
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function InsumosClient({ insumos, mostrarAlerta }: InsumosClientProps) {
  const router = useRouter();
  const [editando, setEditando] = useState<InsumoListado | null>(null);
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
  } = useCadastroAcoes<InsumoListado>({ endpoint: "/api/insumos", rotulo: "o insumo" });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InsumoFormValues>({
    resolver: zodResolver(insumoFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const iniciarEdicao = (insumo: InsumoListado) => {
    setEditando(insumo);
    setSubmitError(null);
    reset({
      nome: insumo.nome,
      descricao: insumo.descricao ?? "",
      unidadeMedida: insumo.unidadeMedida,
      quantidadeEstoque: insumo.quantidadeEstoque,
      estoqueMinimo: insumo.estoqueMinimo,
      custoUnitario: formatCurrency(insumo.custoUnitario) as unknown as number,
    });
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setSubmitError(null);
    reset(defaultValues);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    if (editando) {
      // O saldo só muda pela tela de movimentações, que registra o extrato.
      const { quantidadeEstoque: _ignorado, ...dadosCadastro } = values;

      const response = await fetch(`/api/insumos/${editando.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dadosCadastro),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setSubmitError(payload.message ?? "Não foi possível salvar o insumo.");
        return;
      }
    } else {
      const response = await fetch("/api/insumos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setSubmitError(payload.message ?? "Não foi possível salvar o insumo.");
        return;
      }
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
            {editando ? "Editar Insumo" : "Novo Cadastro"}
          </p>
          <SectionTitle className="mt-2 text-2xl">
            {editando ? `Editando ${editando.nome}` : "Preencha os dados básicos"}
          </SectionTitle>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" {...register("nome")} placeholder="Nome do produto ou material" />
            {errors.nome ? <p className="text-sm text-red-600">{errors.nome.message}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="unidadeMedida">Unidade de Medida</Label>
              <Input id="unidadeMedida" {...register("unidadeMedida")} placeholder="Ex: un, par, ml, kg" />
              {errors.unidadeMedida ? (
                <p className="text-sm text-red-600">{errors.unidadeMedida.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="custoUnitario">Custo Unitário (R$)</Label>
              <Input
                id="custoUnitario"
                type="text"
                {...register("custoUnitario")}
                onChange={(e) => {
                  e.target.value = maskCurrency(e.target.value);
                  register("custoUnitario").onChange(e);
                }}
                onBlur={(e) => {
                  if (e.target.value) {
                    e.target.value = formatCurrency(e.target.value);
                    register("custoUnitario").onChange(e);
                  }
                  register("custoUnitario").onBlur(e);
                }}
                placeholder="R$ 0,00"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="quantidadeEstoque">Quantidade Atual</Label>
              <Input
                id="quantidadeEstoque"
                type="number"
                step="0.01"
                min="0"
                disabled={editando !== null}
                {...register("quantidadeEstoque")}
              />
              {editando ? (
                <p className="text-xs text-slate-500">
                  O saldo só muda por lançamento de estoque, para preservar o extrato.{" "}
                  <Link
                    href={`/insumos/${editando.id}/movimentacoes`}
                    className="text-[color:var(--accent-strong)] hover:underline"
                  >
                    Ir para movimentações
                  </Link>
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="estoqueMinimo">Estoque Mínimo</Label>
              <Input id="estoqueMinimo" type="number" step="0.01" min="0" {...register("estoqueMinimo")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" {...register("descricao")} rows={3} placeholder="Detalhes adicionais" />
          </div>

          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting || isPending}>
              {isSubmitting || isPending ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar Insumo"}
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-soft)]">
              Lista de Estoque
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {mostrarAlerta ? "Itens em Alerta" : "Itens Cadastrados"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {mostrarAlerta ? (
              <Link href="/insumos" className="text-xs text-[color:var(--accent-base)] hover:underline">
                Limpar filtros
              </Link>
            ) : null}
            <Badge tone="accent">Total: {insumos.length}</Badge>
          </div>
        </div>

        {listaError ? (
          <p className="mb-4 rounded-2xl border border-rose-500/50 bg-rose-950/20 p-4 text-sm text-rose-200">
            {listaError}
          </p>
        ) : null}

        {insumos.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-200">
            Nenhum item cadastrado ainda. Use o formulário ao lado para criar o primeiro registro.
          </div>
        ) : (
          <div className="space-y-4">
            {insumos.map((item) => {
              const isZerado = item.quantidadeEstoque === 0;
              const isBaixoEstoque = item.quantidadeEstoque <= item.estoqueMinimo && !isZerado;

              return (
                <article
                  key={item.id}
                  className={`rounded-3xl border p-5 ${
                    !item.ativo
                      ? "border-rose-500/50 bg-rose-950/20"
                      : isZerado
                        ? "border-rose-500/50 bg-rose-950/20"
                        : isBaixoEstoque
                          ? "border-amber-500/50 bg-amber-950/20"
                          : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.nome}</h3>
                      {item.descricao ? <p className="mt-1 text-sm text-slate-300">{item.descricao}</p> : null}
                      <div className="mt-2">
                        <Link
                          href={`/insumos/${item.id}/movimentacoes`}
                          className="text-xs uppercase tracking-wider text-[color:var(--accent-base)] transition-colors hover:text-white"
                        >
                          Ver Extrato / Lançamentos &rarr;
                        </Link>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge tone={isZerado ? "danger" : isBaixoEstoque ? "warning" : "success"}>
                        {isZerado ? "Sem Estoque" : isBaixoEstoque ? "Estoque Baixo" : "Normal"}
                      </Badge>
                      <Badge tone={item.ativo ? "success" : "danger"}>{item.ativo ? "Ativo" : "Inativo"}</Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-200 sm:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Estoque</p>
                      <p className="mt-1 font-medium">
                        {item.quantidadeEstoque} {item.unidadeMedida}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Mínimo</p>
                      <p className="mt-1 font-medium">
                        {item.estoqueMinimo} {item.unidadeMedida}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Custo Ref.</p>
                      <p className="mt-1 font-medium">{currencyFormatter.format(item.custoUnitario)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => iniciarEdicao(item)}
                      className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => alternarStatus(item)}
                      disabled={isPending}
                      className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        item.ativo
                          ? "border-amber-400/40 text-amber-200 hover:bg-amber-950/40"
                          : "border-emerald-400/40 text-emerald-200 hover:bg-emerald-950/40"
                      }`}
                    >
                      {item.ativo ? "Inativar" : "Reativar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => pedirExclusao(item)}
                      disabled={isPending}
                      className="rounded-full border border-rose-400/40 px-4 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      <ConfirmDialog
        aberto={itemParaExcluir !== null}
        titulo="Excluir insumo"
        descricao={`Excluir o insumo "${itemParaExcluir?.nome ?? ""}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
        tone="danger"
        onConfirmar={() =>
          confirmarExclusao((insumo) => {
            if (editando?.id === insumo.id) {
              cancelarEdicao();
            }
          })
        }
        onCancelar={cancelarExclusao}
      />
    </section>
  );
}
