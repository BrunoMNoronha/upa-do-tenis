"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { servicoFormSchema, type ServicoFormValues } from "@/lib/servicos-schema";
import type { EstatisticasServicos } from "@/lib/servicos";
import type { FiltroStatusCadastro } from "@/lib/cadastros-filtros";
import { formatCurrency, maskCurrency } from "@/lib/formatters";
import type { PaginacaoInfo } from "@/lib/paginacao";
import { Paginacao, textoIntervalo, usePaginacaoUrl } from "@/components/paginacao";

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
  busca: string;
  pagination: PaginacaoInfo;
  estatisticas: EstatisticasServicos;
  filtroStatus: FiltroStatusCadastro | undefined;
};

const defaultValues: ServicoFormValues = {
  nome: "",
  descricao: "",
  precoBase: 0,
  ativo: true,
};

const COLUNAS = "2fr 1fr 0.8fr 1.2fr";
const FORM_ID = "form-servico";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ServicosClient({ servicos, busca, pagination, estatisticas, filtroStatus }: ServicosClientProps) {
  const router = useRouter();
  const { criarHref } = usePaginacaoUrl();
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
    document.getElementById("cadastro-rapido")?.scrollIntoView({ block: "nearest" });
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

  const kpis = (
    <>
      <KpiCard size="sm" label="Total" value={estatisticas.total} hint="serviços no catálogo" dot="accent" href="/servicos" active={!filtroStatus} />
      <KpiCard size="sm" label="Ativos" value={estatisticas.ativos} hint="disponíveis na OS" dot="success" href="/servicos?status=ativos" active={filtroStatus === "ativos"} />
      <KpiCard size="sm" label="Inativos" value={estatisticas.inativos} hint="fora do catálogo" dot="muted" href="/servicos?status=inativos" active={filtroStatus === "inativos"} />
      <KpiCard
        size="sm"
        label="Preço médio"
        value={estatisticas.precoMedioAtivos === null ? "—" : currencyFormatter.format(estatisticas.precoMedioAtivos)}
        hint="entre os ativos"
        dot="warning"
      />
    </>
  );

  const filtros = (
    <>
      <BuscaListagem id="busca-servicos" label="Buscar serviço" placeholder="Buscar serviço..." busca={busca} />
      <LinhaFiltros resumo={textoIntervalo(pagination)}>
        <ChipsFiltroUrl
          aria-label="Filtrar serviços por status"
          opcoes={[
            { label: "Todos", alteracoes: { status: null }, ativo: !filtroStatus },
            { label: "Ativos", alteracoes: { status: "ativos" }, ativo: filtroStatus === "ativos" },
            { label: "Inativos", alteracoes: { status: "inativos" }, ativo: filtroStatus === "inativos" },
          ]}
        />
      </LinhaFiltros>
    </>
  );

  const lista = (
    <PainelLista filtros={filtros} rodape={<Paginacao pagination={pagination} rotulo="serviços" criarHref={criarHref} exibirResumo={false} />}>
      {listaError ? <ErroLista>{listaError}</ErroLista> : null}

      <Tabela aria-label="Serviços cadastrados">
        <TabelaCabecalho colunas={COLUNAS}>
          <TabelaColuna>Serviço</TabelaColuna>
          <TabelaColuna>Preço base</TabelaColuna>
          <TabelaColuna>Status</TabelaColuna>
          <TabelaColuna alinharDireita>Ações</TabelaColuna>
        </TabelaCabecalho>

        {servicos.length === 0 ? (
          <TabelaVazia
            mensagem={busca ? `Nenhum serviço encontrado para "${busca}".` : "Nenhum serviço cadastrado ainda. Use o painel ao lado para criar o primeiro registro."}
          />
        ) : (
          servicos.map((servico) => (
            <TabelaLinha key={servico.id} colunas={COLUNAS} inativa={!servico.ativo}>
              <TabelaCelula rotulo="Serviço">
                <CelulaTitulo>{servico.nome}</CelulaTitulo>
                {servico.descricao ? <CelulaSubtitulo title={servico.descricao}>{servico.descricao}</CelulaSubtitulo> : null}
              </TabelaCelula>
              <TabelaCelula rotulo="Preço base">
                <span className="text-[13px] font-bold text-[color:var(--text)]">{currencyFormatter.format(servico.precoBase)}</span>
              </TabelaCelula>
              <TabelaCelula rotulo="Status">
                <Badge tone={servico.ativo ? "success" : "danger"}>{servico.ativo ? "Ativo" : "Inativo"}</Badge>
              </TabelaCelula>
              <TabelaCelula rotulo="Ações" alinharDireita>
                <AcoesLinha>
                  <Button type="button" variant="secondary" size="sm" onClick={() => iniciarEdicao(servico)}>
                    Editar
                  </Button>
                  <BotaoStatusLinha
                    ativo={servico.ativo}
                    onClick={() => alternarStatus(servico)}
                    disabled={isPending || editando !== null}
                    title={editando ? "Salve ou cancele a edição antes de alterar o status pela lista." : undefined}
                  />
                  <BotaoExcluirLinha onClick={() => pedirExclusao(servico)} disabled={isPending} rotulo={`Excluir serviço ${servico.nome}`} />
                </AcoesLinha>
              </TabelaCelula>
            </TabelaLinha>
          ))
        )}
      </Tabela>
    </PainelLista>
  );

  const aside = (
    <PainelCadastroRapido
      titulo={editando ? "Editar serviço" : "Novo serviço"}
      dica={editando ? `Editando ${editando.nome}.` : "O preço base é sugerido e pode ser ajustado em cada OS."}
      rodape={
        <>
          <Button type="button" variant="secondary" onClick={cancelarEdicao}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} isLoading={isSubmitting || isPending} className="min-w-[160px]">
            {editando ? "Salvar alterações" : "Cadastrar serviço"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="grid gap-3.5" onSubmit={onSubmit} noValidate>
        <div className="grid gap-1">
          <Label htmlFor="nome" obrigatorio>Nome do serviço</Label>
          <Input
            id="nome"
            {...register("nome")}
            placeholder="Ex.: Troca de sola"
            aria-invalid={Boolean(errors.nome)}
            aria-describedby={errors.nome ? "nome-error" : undefined}
          />
          {errors.nome ? <ErroCampo id="nome-error">{errors.nome.message}</ErroCampo> : null}
        </div>

        <div className="grid gap-1">
          <Label htmlFor="precoBase" obrigatorio>Preço base (R$)</Label>
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
            aria-invalid={Boolean(errors.precoBase)}
            aria-describedby={errors.precoBase ? "precoBase-error" : undefined}
          />
          {errors.precoBase ? <ErroCampo id="precoBase-error">{errors.precoBase.message}</ErroCampo> : null}
        </div>

        <div className="grid gap-1">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea
            id="descricao"
            {...register("descricao")}
            rows={3}
            placeholder="Detalhes adicionais sobre o serviço"
            aria-invalid={Boolean(errors.descricao)}
            aria-describedby={errors.descricao ? "descricao-error" : undefined}
          />
          {errors.descricao ? <ErroCampo id="descricao-error">{errors.descricao.message}</ErroCampo> : null}
        </div>

        {editando ? (
          <label className="flex items-center gap-2.5 text-[13px] font-semibold text-[color:var(--text-body)]">
            <Input type="checkbox" {...register("ativo")} />
            Serviço ativo
          </label>
        ) : null}

        {submitError ? <ErroCampo id="servico-submit-error">{submitError}</ErroCampo> : null}
      </form>
    </PainelCadastroRapido>
  );

  return (
    <>
      <CadastroLayout kpis={kpis} lista={lista} aside={aside} />

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
        isConfirmando={isPending}
      />
    </>
  );
}
