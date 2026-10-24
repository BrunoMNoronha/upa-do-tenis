"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CadastroLayout } from "@/components/cadastro-layout";
import { KpiCard } from "@/components/ui";
import type { FiltroEstoqueProdutos, FiltroStatusCadastro } from "@/lib/cadastros-filtros";
import type { EstatisticasProdutos } from "@/lib/produtos";
import type { PaginacaoInfo } from "@/lib/paginacao";
import { ProdutoForm } from "./components/produto-form";
import { ProdutoImagem } from "./components/produto-imagem";
import { ProdutoList } from "./components/produto-list";
import type { ProdutoListado } from "./types";

export type FiltrosProdutos = {
  status: FiltroStatusCadastro | undefined;
  estoque: FiltroEstoqueProdutos | undefined;
};

type ProdutosClientProps = {
  produtos: ProdutoListado[];
  busca: string;
  pagination: PaginacaoInfo;
  estatisticas: EstatisticasProdutos;
  filtros: FiltrosProdutos;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ProdutosClient({ produtos, busca, pagination, estatisticas, filtros }: ProdutosClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editando, setEditando] = useState<ProdutoListado | null>(null);
  // O formulário guarda o retrato do início da edição; a imagem e a situação
  // no catálogo usam a versão mais recente depois de cada router.refresh().
  const editandoAtual = editando ? produtos.find((produto) => produto.id === editando.id) ?? editando : null;

  const iniciarEdicao = (produto: ProdutoListado) => {
    setEditando(produto);
    document.getElementById("cadastro-rapido")?.scrollIntoView({ block: "nearest" });
  };

  const cancelarEdicao = () => {
    setEditando(null);
  };

  const onDeleteCurrent = (id: string) => {
    if (editando?.id === id) {
      cancelarEdicao();
    }
  };

  const semFiltro = !filtros.status && !filtros.estoque;

  const kpis = (
    <>
      <KpiCard size="sm" label="Total" value={estatisticas.total} hint="produtos cadastrados" dot="accent" href="/produtos" active={semFiltro} />
      <KpiCard size="sm" label="Ativos" value={estatisticas.ativos} hint="disponíveis no balcão" dot="success" href="/produtos?status=ativos" active={filtros.status === "ativos" && !filtros.estoque} />
      <KpiCard size="sm" label="Sem estoque" value={estatisticas.semEstoque} hint="bloqueados na venda" dot="danger" href="/produtos?estoque=sem" active={filtros.estoque === "sem"} />
      <KpiCard size="sm" label="Valor em estoque" value={currencyFormatter.format(estatisticas.valorEstoqueVenda)} hint="a preço de venda" dot="warning" />
    </>
  );

  return (
    <CadastroLayout
      kpis={kpis}
      lista={
        <ProdutoList
          produtos={produtos}
          busca={busca}
          pagination={pagination}
          filtros={filtros}
          onEdit={iniciarEdicao}
          onDeleteCurrent={onDeleteCurrent}
        />
      }
      aside={
        <div className="flex flex-col gap-5">
          <ProdutoForm editando={editando} onCancel={cancelarEdicao} onSuccess={cancelarEdicao} />
          {editandoAtual ? (
            <ProdutoImagem produto={editandoAtual} onAtualizada={() => startTransition(() => router.refresh())} />
          ) : null}
        </div>
      }
    />
  );
}
