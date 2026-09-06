"use client";

import { useState } from "react";
import { ProdutoForm } from "./components/produto-form";
import { ProdutoList } from "./components/produto-list";

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

export function ProdutosClient({ produtos }: ProdutosClientProps) {
  const [editando, setEditando] = useState<ProdutoListado | null>(null);

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
      <ProdutoForm
        editando={editando}
        onCancel={cancelarEdicao}
        onSuccess={cancelarEdicao}
      />
      <ProdutoList
        produtos={produtos}
        onEdit={iniciarEdicao}
        onDeleteCurrent={onDeleteCurrent}
      />
    </section>
  );
}
