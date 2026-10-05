"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProdutoForm } from "./components/produto-form";
import { ProdutoImagem } from "./components/produto-imagem";
import { ProdutoList } from "./components/produto-list";
import type { PaginacaoInfo } from "@/lib/paginacao";
import type { ProdutoListado } from "./types";

type ProdutosClientProps = {
  produtos: ProdutoListado[];
  busca: string;
  pagination: PaginacaoInfo;
};

export function ProdutosClient({ produtos, busca, pagination }: ProdutosClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editando, setEditando] = useState<ProdutoListado | null>(null);
  // O formulário guarda o retrato do início da edição; a imagem e a situação
  // no catálogo usam a versão mais recente depois de cada router.refresh().
  const editandoAtual = editando ? produtos.find((produto) => produto.id === editando.id) ?? editando : null;

  const iniciarEdicao = (produto: ProdutoListado) => {
    setEditando(produto);
  };

  const cancelarEdicao = () => {
    setEditando(null);
  };

  const onDeleteCurrent = (id: string) => {
    if (editando?.id === id) {
      cancelarEdicao();
    }
  };

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="grid content-start gap-6">
        <ProdutoForm
          editando={editando}
          onCancel={cancelarEdicao}
          onSuccess={cancelarEdicao}
        />
        {editandoAtual ? (
          <ProdutoImagem
            produto={editandoAtual}
            onAtualizada={() => startTransition(() => router.refresh())}
          />
        ) : null}
      </div>
      <ProdutoList
        produtos={produtos}
        busca={busca}
        pagination={pagination}
        onEdit={iniciarEdicao}
        onDeleteCurrent={onDeleteCurrent}
      />
    </section>
  );
}
