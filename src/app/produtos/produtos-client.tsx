"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Badge, Button, Card, Input, Label, SectionTitle, Textarea } from "@/components/ui";
import { produtoFormSchema, type ProdutoFormValues } from "@/lib/produtos-schema";
import { formatCurrency, maskCurrency } from "@/lib/formatters";

type ProdutoListado = {
  id: string;
  nome: string;
  descricao: string | null;
  precoVenda: number;
  ativo: boolean;
  criadoEm: string;
};

type ProdutosClientProps = {
  produtos: ProdutoListado[];
};

const defaultValues: ProdutoFormValues = {
  nome: "",
  descricao: "",
  precoVenda: 0,
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

export function ProdutosClient({ produtos }: ProdutosClientProps) {
  const router = useRouter();
  const [editando, setEditando] = useState<ProdutoListado | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [listaError, setListaError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const iniciarEdicao = (produto: ProdutoListado) => {
    setEditando(produto);
    setSubmitError(null);
    reset({
      nome: produto.nome,
      descricao: produto.descricao ?? "",
      precoVenda: formatCurrency(produto.precoVenda) as unknown as number,
    });
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setSubmitError(null);
    reset(defaultValues);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const url = editando ? `/api/produtos/${editando.id}` : "/api/produtos";

    const response = await fetch(url, {
      method: editando ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setSubmitError(payload.message ?? "Não foi possível salvar o produto.");
      return;
    }

    setEditando(null);
    reset(defaultValues);

    startTransition(() => {
      router.refresh();
    });
  });

  const alternarStatus = async (produto: ProdutoListado) => {
    setListaError(null);

    const response = await fetch(`/api/produtos/${produto.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ativo: !produto.ativo }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      setListaError(body.message ?? "Não foi possível alterar o status do produto.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  };

  const excluirProduto = async (produto: ProdutoListado) => {
    setListaError(null);

    const confirmado = window.confirm(`Excluir o produto "${produto.nome}"? Esta ação não pode ser desfeita.`);

    if (!confirmado) {
      return;
    }

    const response = await fetch(`/api/produtos/${produto.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      setListaError(body.message ?? "Não foi possível excluir o produto.");
      return;
    }

    if (editando?.id === produto.id) {
      cancelarEdicao();
    }

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
            {editando ? "Editar Produto" : "Novo Cadastro"}
          </p>
          <SectionTitle className="mt-2 text-2xl">
            {editando ? `Editando ${editando.nome}` : "Dados do produto"}
          </SectionTitle>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome do Produto</Label>
            <Input
              id="nome"
              {...register("nome")}
              placeholder="Ex: Cadarço 120cm"
            />
            {errors.nome ? <p className="text-sm text-red-600">{errors.nome.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="precoVenda">Preço de Venda (R$)</Label>
            <Input
              id="precoVenda"
              type="text"
              {...register("precoVenda")}
              onChange={(e) => {
                e.target.value = maskCurrency(e.target.value);
                register("precoVenda").onChange(e);
              }}
              onBlur={(e) => {
                if (e.target.value) {
                  e.target.value = formatCurrency(e.target.value);
                  register("precoVenda").onChange(e);
                }
                register("precoVenda").onBlur(e);
              }}
              placeholder="R$ 0,00"
            />
            {errors.precoVenda ? <p className="text-sm text-red-600">{errors.precoVenda.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              {...register("descricao")}
              rows={3}
              placeholder="Detalhes adicionais sobre o produto"
            />
          </div>

          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting || isPending}>
              {isSubmitting || isPending
                ? "Salvando..."
                : editando
                  ? "Salvar alterações"
                  : "Cadastrar Produto"}
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
            <h2 className="mt-2 text-2xl font-semibold">Produtos Cadastrados</h2>
          </div>
          <Badge tone="accent">Total: {produtos.length}</Badge>
        </div>

        {listaError ? (
          <p className="mb-4 rounded-2xl border border-rose-500/50 bg-rose-950/20 p-4 text-sm text-rose-200">
            {listaError}
          </p>
        ) : null}

        {produtos.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-200">
            Nenhum produto cadastrado ainda. Use o formulário ao lado para criar o primeiro registro.
          </div>
        ) : (
          <div className="space-y-4">
            {produtos.map((produto) => (
              <article
                key={produto.id}
                className={`rounded-3xl border p-5 ${
                  produto.ativo ? "border-white/10 bg-white/5" : "border-rose-500/50 bg-rose-950/20"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{produto.nome}</h3>
                    {produto.descricao ? (
                      <p className="mt-1 text-sm text-slate-300">{produto.descricao}</p>
                    ) : null}
                    <p className="mt-2 text-xs uppercase tracking-[0.1em] text-slate-400">
                      Criado em {dateFormatter.format(new Date(produto.criadoEm))}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone="neutral">{currencyFormatter.format(produto.precoVenda)}</Badge>
                    <Badge tone={produto.ativo ? "success" : "danger"}>
                      {produto.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => iniciarEdicao(produto)}
                    className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => alternarStatus(produto)}
                    disabled={isPending}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      produto.ativo
                        ? "border-amber-400/40 text-amber-200 hover:bg-amber-950/40"
                        : "border-emerald-400/40 text-emerald-200 hover:bg-emerald-950/40"
                    }`}
                  >
                    {produto.ativo ? "Inativar" : "Reativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => excluirProduto(produto)}
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
    </section>
  );
}
