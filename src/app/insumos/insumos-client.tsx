"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Badge, Button, Input, KpiCard, Label, Textarea } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BuscaListagem } from "@/components/busca-listagem";
import { ChipsFiltroUrl } from "@/components/chips-filtro-url";
import {
  AcoesLinha,
  BotaoExcluirLinha,
  BotaoStatusLinha,
  CadastroLayout,
  ErroCampo,
  ErroLista,
  LinhaFiltros,
  PainelCadastroRapido,
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
import { insumoFormSchema, type InsumoFormValues } from "@/lib/insumos-schema";
import type { EstatisticasInsumos } from "@/lib/insumos";
import type { FiltroEstoqueInsumos, FiltroStatusCadastro } from "@/lib/cadastros-filtros";
import { formatCurrency, maskCurrency } from "@/lib/formatters";
import type { PaginacaoInfo } from "@/lib/paginacao";
import { Paginacao, textoIntervalo, usePaginacaoUrl } from "@/components/paginacao";

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

type FiltrosInsumos = {
  status: FiltroStatusCadastro | undefined;
  estoque: FiltroEstoqueInsumos | undefined;
};

type InsumosClientProps = {
  insumos: InsumoListado[];
  busca: string;
  pagination: PaginacaoInfo;
  estatisticas: EstatisticasInsumos;
  filtros: FiltrosInsumos;
};

const defaultValues: InsumoFormValues = {
  nome: "",
  descricao: "",
  unidadeMedida: "",
  quantidadeEstoque: 0,
  estoqueMinimo: 0,
  custoUnitario: 0,
};

const COLUNAS = "1.8fr 0.6fr 1.3fr 0.9fr 0.7fr 1.7fr";
const FORM_ID = "form-insumo";
// Os parâmetros legados do alerta (`alerta`, `estoqueBaixo`) são limpos ao trocar de chip.
const LIMPAR_LEGADO = { alerta: null, estoqueBaixo: null };

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const quantidadeFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function situacaoEstoque(insumo: InsumoListado): { rotulo: string; tone: "danger" | "warning" | "success" } {
  if (insumo.quantidadeEstoque <= 0) return { rotulo: "Zerado", tone: "danger" };
  if (insumo.quantidadeEstoque <= insumo.estoqueMinimo) return { rotulo: "Abaixo do mínimo", tone: "warning" };
  return { rotulo: "OK", tone: "success" };
}

export function InsumosClient({ insumos, busca, pagination, estatisticas, filtros }: InsumosClientProps) {
  const router = useRouter();
  const { criarHref } = usePaginacaoUrl();
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
    document.getElementById("cadastro-rapido")?.scrollIntoView({ block: "nearest" });
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

  const semFiltro = !filtros.status && !filtros.estoque;

  const kpis = (
    <>
      <KpiCard size="sm" label="Total" value={estatisticas.total} hint="insumos cadastrados" dot="accent" href="/insumos" active={semFiltro} />
      <KpiCard size="sm" label="Abaixo do mínimo" value={estatisticas.abaixoDoMinimo} hint="repor em breve" dot="warning" href="/insumos?estoque=baixo" active={filtros.estoque === "baixo"} />
      <KpiCard size="sm" label="Zerados" value={estatisticas.zerados} hint="bloqueiam o consumo" dot="danger" href="/insumos?estoque=zerado" active={filtros.estoque === "zerado"} />
      <KpiCard size="sm" label="Custo em estoque" value={currencyFormatter.format(estatisticas.custoEstoque)} hint="a custo unitário" dot="success" />
    </>
  );

  const filtrosBarra = (
    <>
      <BuscaListagem id="busca-insumos" label="Buscar insumo" placeholder="Buscar insumo..." busca={busca} />
      <LinhaFiltros resumo={textoIntervalo(pagination)}>
        <ChipsFiltroUrl
          aria-label="Filtrar insumos"
          opcoes={[
            { label: "Todos", alteracoes: { estoque: null, status: null, ...LIMPAR_LEGADO }, ativo: semFiltro },
            { label: "Estoque baixo", alteracoes: { estoque: "baixo", status: null, ...LIMPAR_LEGADO }, ativo: filtros.estoque === "baixo" && !filtros.status },
            { label: "Zerados", alteracoes: { estoque: "zerado", status: null, ...LIMPAR_LEGADO }, ativo: filtros.estoque === "zerado" && !filtros.status },
            { label: "Inativos", alteracoes: { status: "inativos", estoque: null, ...LIMPAR_LEGADO }, ativo: filtros.status === "inativos" && !filtros.estoque },
          ]}
        />
      </LinhaFiltros>
    </>
  );

  const lista = (
    <PainelLista filtros={filtrosBarra} rodape={<Paginacao pagination={pagination} rotulo="insumos" criarHref={criarHref} exibirResumo={false} />}>
      {listaError ? <ErroLista>{listaError}</ErroLista> : null}

      <Tabela aria-label="Insumos cadastrados">
        <TabelaCabecalho colunas={COLUNAS}>
          <TabelaColuna>Insumo</TabelaColuna>
          <TabelaColuna>Unidade</TabelaColuna>
          <TabelaColuna>Quantidade / mínimo</TabelaColuna>
          <TabelaColuna>Custo unitário</TabelaColuna>
          <TabelaColuna>Status</TabelaColuna>
          <TabelaColuna alinharDireita>Ações</TabelaColuna>
        </TabelaCabecalho>

        {insumos.length === 0 ? (
          <TabelaVazia
            mensagem={busca ? `Nenhum insumo encontrado para "${busca}".` : "Nenhum insumo cadastrado ainda. Use o painel ao lado para criar o primeiro registro."}
          />
        ) : (
          insumos.map((item) => {
            const situacao = situacaoEstoque(item);
            return (
              <TabelaLinha key={item.id} colunas={COLUNAS} inativa={!item.ativo}>
                <TabelaCelula rotulo="Insumo">
                  <CelulaTitulo>{item.nome}</CelulaTitulo>
                  {item.descricao ? <CelulaSubtitulo title={item.descricao}>{item.descricao}</CelulaSubtitulo> : null}
                </TabelaCelula>
                <TabelaCelula rotulo="Unidade">
                  <span className="text-[13px] font-medium text-[color:var(--text)]">{item.unidadeMedida}</span>
                </TabelaCelula>
                <TabelaCelula rotulo="Quantidade / mínimo">
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-[13px] text-[color:var(--text)]">
                      <span className="font-bold">
                        {quantidadeFormatter.format(item.quantidadeEstoque)} {item.unidadeMedida}
                      </span>
                      <span className="font-medium text-[color:var(--text-soft)]"> / mín. {quantidadeFormatter.format(item.estoqueMinimo)}</span>
                    </span>
                    <Badge tone={situacao.tone}>{situacao.rotulo}</Badge>
                  </div>
                </TabelaCelula>
                <TabelaCelula rotulo="Custo unitário">
                  <span className="text-[13px] font-bold text-[color:var(--text)]">{currencyFormatter.format(item.custoUnitario)}</span>
                </TabelaCelula>
                <TabelaCelula rotulo="Status">
                  <Badge tone={item.ativo ? "success" : "danger"}>{item.ativo ? "Ativo" : "Inativo"}</Badge>
                </TabelaCelula>
                <TabelaCelula rotulo="Ações" alinharDireita>
                  <AcoesLinha>
                    <Button type="button" variant="secondary" size="sm" onClick={() => iniciarEdicao(item)}>
                      Editar
                    </Button>
                    <Button href={`/insumos/${item.id}/movimentacoes`} variant="secondary" size="sm">
                      Movimentações
                    </Button>
                    <BotaoStatusLinha ativo={item.ativo} onClick={() => alternarStatus(item)} disabled={isPending} />
                    <BotaoExcluirLinha onClick={() => pedirExclusao(item)} disabled={isPending} rotulo={`Excluir insumo ${item.nome}`} />
                  </AcoesLinha>
                </TabelaCelula>
              </TabelaLinha>
            );
          })
        )}
      </Tabela>
    </PainelLista>
  );

  const aside = (
    <PainelCadastroRapido
      titulo={editando ? "Editar insumo" : "Novo insumo"}
      dica={editando ? `Editando ${editando.nome}.` : "Quantidade atual só na criação; ajustes posteriores vão por Movimentações."}
      rodape={
        <>
          <Button type="button" variant="secondary" onClick={cancelarEdicao}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} isLoading={isSubmitting || isPending} className="min-w-[160px]">
            {editando ? "Salvar alterações" : "Cadastrar insumo"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="grid gap-3.5" onSubmit={onSubmit} noValidate>
        <div className="grid gap-1">
          <Label htmlFor="nome" obrigatorio>Nome</Label>
          <Input id="nome" {...register("nome")} placeholder="Nome do material" aria-invalid={Boolean(errors.nome)} aria-describedby={errors.nome ? "nome-error" : undefined} />
          {errors.nome ? <ErroCampo id="nome-error">{errors.nome.message}</ErroCampo> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="unidadeMedida" obrigatorio>Unidade de medida</Label>
            <Input
              id="unidadeMedida"
              {...register("unidadeMedida")}
              placeholder="Ex.: un, par, ml, kg"
              aria-invalid={Boolean(errors.unidadeMedida)}
              aria-describedby={errors.unidadeMedida ? "unidadeMedida-error" : undefined}
            />
            {errors.unidadeMedida ? <ErroCampo id="unidadeMedida-error">{errors.unidadeMedida.message}</ErroCampo> : null}
          </div>

          <div className="grid gap-1">
            <Label htmlFor="custoUnitario" obrigatorio>Custo unitário (R$)</Label>
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
              aria-invalid={Boolean(errors.custoUnitario)}
              aria-describedby={errors.custoUnitario ? "custoUnitario-error" : undefined}
            />
            {errors.custoUnitario ? <ErroCampo id="custoUnitario-error">{errors.custoUnitario.message}</ErroCampo> : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="quantidadeEstoque">Quantidade atual</Label>
            <Input
              id="quantidadeEstoque"
              type="number"
              step="0.01"
              min="0"
              disabled={editando !== null}
              {...register("quantidadeEstoque")}
              aria-invalid={Boolean(errors.quantidadeEstoque)}
              aria-describedby={editando ? "quantidadeEstoque-hint" : errors.quantidadeEstoque ? "quantidadeEstoque-error" : undefined}
            />
            {editando ? (
              <p id="quantidadeEstoque-hint" className="text-xs text-[color:var(--text-soft)]">
                O saldo só muda por lançamento de estoque, para preservar o extrato.{" "}
                <Link href={`/insumos/${editando.id}/movimentacoes`} className="font-semibold text-[color:var(--accent)] hover:underline">
                  Ir para movimentações
                </Link>
              </p>
            ) : errors.quantidadeEstoque ? (
              <ErroCampo id="quantidadeEstoque-error">{errors.quantidadeEstoque.message}</ErroCampo>
            ) : null}
          </div>

          <div className="grid gap-1">
            <Label htmlFor="estoqueMinimo" obrigatorio>Estoque mínimo</Label>
            <Input
              id="estoqueMinimo"
              type="number"
              step="0.01"
              min="0"
              {...register("estoqueMinimo")}
              aria-invalid={Boolean(errors.estoqueMinimo)}
              aria-describedby={errors.estoqueMinimo ? "estoqueMinimo-error" : undefined}
            />
            {errors.estoqueMinimo ? <ErroCampo id="estoqueMinimo-error">{errors.estoqueMinimo.message}</ErroCampo> : null}
          </div>
        </div>

        <div className="grid gap-1">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea id="descricao" {...register("descricao")} rows={3} placeholder="Detalhes adicionais" />
        </div>

        {submitError ? <ErroCampo id="insumo-submit-error">{submitError}</ErroCampo> : null}
      </form>
    </PainelCadastroRapido>
  );

  return (
    <>
      <CadastroLayout kpis={kpis} lista={lista} aside={aside} />

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
        isConfirmando={isPending}
      />
    </>
  );
}
