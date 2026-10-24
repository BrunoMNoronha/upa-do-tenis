"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge, Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BuscaListagem } from "@/components/busca-listagem";
import { ChipsFiltroUrl } from "@/components/chips-filtro-url";
import {
  AcoesLinha,
  BotaoExcluirLinha,
  BotaoStatusLinha,
  ErroLista,
  LinhaFiltros,
  PainelLista,
} from "@/components/cadastro-layout";
import {
  CelulaSubtitulo,
  CelulaTitulo,
  Tabela,
  TabelaCabecalho,
  TabelaCelula,
  TabelaColuna,
  TabelaLinha,
  TabelaVazia,
} from "@/components/data-table";
import { useCadastroAcoes } from "@/components/use-cadastro-acoes";
import type { PaginacaoInfo } from "@/lib/paginacao";
import { ROTULO_SITUACAO_CATALOGO, situacaoNoCatalogo } from "@/lib/catalogo-regras";
import { Paginacao, textoIntervalo, usePaginacaoUrl } from "@/components/paginacao";
import type { FiltrosProdutos } from "../produtos-client";
import type { ProdutoListado } from "../types";

type ProdutoListProps = {
  produtos: ProdutoListado[];
  busca: string;
  pagination: PaginacaoInfo;
  filtros: FiltrosProdutos;
  onEdit: (produto: ProdutoListado) => void;
  onDeleteCurrent: (id: string) => void;
};

const COLUNAS = "2fr 1fr 1fr 0.8fr 1.7fr";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const quantidadeFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function ProdutoList({ produtos, busca, pagination, filtros, onEdit, onDeleteCurrent }: ProdutoListProps) {
  const { criarHref } = usePaginacaoUrl();
  const {
    listaError,
    isPending,
    alternarStatus,
    itemParaExcluir,
    pedirExclusao,
    cancelarExclusao,
    confirmarExclusao,
  } = useCadastroAcoes<ProdutoListado>({ endpoint: "/api/produtos", rotulo: "o produto" });
  const router = useRouter();
  const [publicacaoPendente, startPublicacao] = useTransition();
  const [alterandoPublicacao, setAlterandoPublicacao] = useState<string | null>(null);
  const [erroPublicacao, setErroPublicacao] = useState<string | null>(null);

  const alternarPublicacao = async (produto: ProdutoListado) => {
    if (alterandoPublicacao) return;
    setErroPublicacao(null);
    setAlterandoPublicacao(produto.id);
    try {
      const response = await fetch(`/api/produtos/${produto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicadoNoCatalogo: !produto.publicadoNoCatalogo }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        setErroPublicacao(payload.message ?? "Não foi possível alterar a publicação do produto.");
        return;
      }
      startPublicacao(() => router.refresh());
    } catch {
      setErroPublicacao("Falha de comunicação ao alterar a publicação do produto.");
    } finally {
      setAlterandoPublicacao(null);
    }
  };

  const semFiltro = !filtros.status && !filtros.estoque;

  const filtrosBarra = (
    <>
      <BuscaListagem id="busca-produtos" label="Buscar produto" placeholder="Buscar produto..." busca={busca} />
      <LinhaFiltros resumo={textoIntervalo(pagination)}>
        <ChipsFiltroUrl
          aria-label="Filtrar produtos"
          opcoes={[
            { label: "Todos", alteracoes: { status: null, estoque: null }, ativo: semFiltro },
            { label: "Ativos", alteracoes: { status: "ativos", estoque: null }, ativo: filtros.status === "ativos" && !filtros.estoque },
            { label: "Inativos", alteracoes: { status: "inativos", estoque: null }, ativo: filtros.status === "inativos" && !filtros.estoque },
            { label: "Sem estoque", alteracoes: { estoque: "sem", status: null }, ativo: filtros.estoque === "sem" },
          ]}
        />
      </LinhaFiltros>
    </>
  );

  return (
    <PainelLista filtros={filtrosBarra} rodape={<Paginacao pagination={pagination} rotulo="produtos" criarHref={criarHref} exibirResumo={false} />}>
      {listaError || erroPublicacao ? <ErroLista>{listaError ?? erroPublicacao}</ErroLista> : null}

      <Tabela aria-label="Produtos cadastrados">
        <TabelaCabecalho colunas={COLUNAS}>
          <TabelaColuna>Produto</TabelaColuna>
          <TabelaColuna>Preço de venda</TabelaColuna>
          <TabelaColuna>Estoque</TabelaColuna>
          <TabelaColuna>Status</TabelaColuna>
          <TabelaColuna alinharDireita>Ações</TabelaColuna>
        </TabelaCabecalho>

        {produtos.length === 0 ? (
          <TabelaVazia
            mensagem={busca ? `Nenhum produto encontrado para "${busca}".` : "Nenhum produto cadastrado ainda. Use o painel ao lado para criar o primeiro registro."}
          />
        ) : (
          produtos.map((produto) => {
            const situacao = situacaoNoCatalogo(produto);
            const semEstoque = produto.quantidadeEstoque <= 0;
            return (
              <TabelaLinha key={produto.id} colunas={COLUNAS} inativa={!produto.ativo}>
                <TabelaCelula rotulo="Produto">
                  <CelulaTitulo>{produto.nome}</CelulaTitulo>
                  <CelulaSubtitulo title={produto.descricao ?? undefined}>
                    {produto.descricao ? `${produto.descricao} · ` : ""}
                    {ROTULO_SITUACAO_CATALOGO[situacao]}
                  </CelulaSubtitulo>
                </TabelaCelula>
                <TabelaCelula rotulo="Preço de venda">
                  <span className="text-[13px] font-bold text-[color:var(--text)]">{currencyFormatter.format(produto.precoVenda)}</span>
                </TabelaCelula>
                <TabelaCelula rotulo="Estoque">
                  <Badge tone={semEstoque ? "danger" : "accent"}>
                    {semEstoque ? "Sem estoque" : `${quantidadeFormatter.format(produto.quantidadeEstoque)} un`}
                  </Badge>
                </TabelaCelula>
                <TabelaCelula rotulo="Status">
                  <Badge tone={produto.ativo ? "success" : "danger"}>{produto.ativo ? "Ativo" : "Inativo"}</Badge>
                </TabelaCelula>
                <TabelaCelula rotulo="Ações" alinharDireita>
                  <AcoesLinha>
                    <Button type="button" variant="secondary" size="sm" onClick={() => onEdit(produto)}>
                      Editar
                    </Button>
                    <Button href={`/produtos/${produto.id}/movimentacoes`} variant="secondary" size="sm">
                      Movimentações
                    </Button>
                    <Button
                      type="button"
                      variant="text"
                      size="sm"
                      onClick={() => void alternarPublicacao(produto)}
                      disabled={alterandoPublicacao !== null || publicacaoPendente}
                      aria-label={`${produto.publicadoNoCatalogo ? "Retirar do catálogo" : "Publicar no catálogo"}: ${produto.nome}`}
                      className="font-bold"
                    >
                      {produto.publicadoNoCatalogo ? "Retirar do catálogo" : "Publicar no catálogo"}
                    </Button>
                    <BotaoStatusLinha ativo={produto.ativo} onClick={() => alternarStatus(produto)} disabled={isPending} />
                    <BotaoExcluirLinha onClick={() => pedirExclusao(produto)} disabled={isPending} rotulo={`Excluir produto ${produto.nome}`} />
                  </AcoesLinha>
                </TabelaCelula>
              </TabelaLinha>
            );
          })
        )}
      </Tabela>

      <ConfirmDialog
        aberto={itemParaExcluir !== null}
        titulo="Excluir produto"
        descricao={`Excluir o produto "${itemParaExcluir?.nome ?? ""}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
        tone="danger"
        onConfirmar={() => confirmarExclusao((produto) => onDeleteCurrent(produto.id))}
        onCancelar={cancelarExclusao}
        isConfirmando={isPending}
      />
    </PainelLista>
  );
}
