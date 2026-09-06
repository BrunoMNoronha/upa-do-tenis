"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card } from "@/components/ui";

type ProdutoListado = {
  id: string;
  nome: string;
  descricao: string | null;
  precoVenda: number;
  ativo: boolean;
  criadoEm: string;
};

type ProdutoListProps = {
  produtos: ProdutoListado[];
  onEdit: (produto: ProdutoListado) => void;
  onDeleteCurrent: (id: string) => void;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

export function ProdutoList({ produtos, onEdit, onDeleteCurrent }: ProdutoListProps) {
  const router = useRouter();
  const [listaError, setListaError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

    onDeleteCurrent(produto.id);

    startTransition(() => {
      router.refresh();
    });
  };

  return (
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
                  onClick={() => onEdit(produto)}
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
  );
}
