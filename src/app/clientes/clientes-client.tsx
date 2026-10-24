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
import { clienteFormSchema, type ClienteFormValues } from "@/lib/clientes-schema";
import type { EstatisticasClientes } from "@/lib/clientes";
import type { FiltroStatusCadastro } from "@/lib/cadastros-filtros";
import { formatCPFCNPJ, formatPhone, maskCPFCNPJ, maskPhone, whatsappLink } from "@/lib/formatters";
import type { PaginacaoInfo } from "@/lib/paginacao";
import { Paginacao, textoIntervalo, usePaginacaoUrl } from "@/components/paginacao";

export type ClienteListado = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  cpfCnpj: string | null;
  observacoes: string | null;
  ativo: boolean;
  criadoEm: string;
};

type ClientesClientProps = {
  clientes: ClienteListado[];
  busca: string;
  pagination: PaginacaoInfo;
  estatisticas: EstatisticasClientes;
  filtroStatus: FiltroStatusCadastro | undefined;
};

const defaultValues: ClienteFormValues = {
  nome: "",
  telefone: "",
  email: "",
  cpfCnpj: "",
  observacoes: "",
};

const COLUNAS = "1.5fr 1.3fr 1fr 0.9fr 0.7fr 1.3fr";
const FORM_ID = "form-cliente";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const mesFormatter = new Intl.DateTimeFormat("pt-BR", { month: "2-digit" });

export function ClientesClient({ clientes, busca, pagination, estatisticas, filtroStatus }: ClientesClientProps) {
  const router = useRouter();
  const { criarHref } = usePaginacaoUrl();
  const [editando, setEditando] = useState<ClienteListado | null>(null);
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
  } = useCadastroAcoes<ClienteListado>({ endpoint: "/api/clientes", rotulo: "o cliente" });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const iniciarEdicao = (cliente: ClienteListado) => {
    setEditando(cliente);
    setSubmitError(null);
    reset({
      nome: cliente.nome,
      telefone: maskPhone(cliente.telefone),
      email: cliente.email ?? "",
      cpfCnpj: cliente.cpfCnpj ? maskCPFCNPJ(cliente.cpfCnpj) : "",
      observacoes: cliente.observacoes ?? "",
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

    const url = editando ? `/api/clientes/${editando.id}` : "/api/clientes";

    const response = await fetch(url, {
      method: editando ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setSubmitError(payload.message ?? "Não foi possível salvar o cliente.");
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
      <KpiCard size="sm" label="Total" value={estatisticas.total} hint="clientes cadastrados" dot="accent" href="/clientes" active={!filtroStatus} />
      <KpiCard size="sm" label="Ativos" value={estatisticas.ativos} hint="disponíveis para OS" dot="success" href="/clientes?status=ativos" active={filtroStatus === "ativos"} />
      <KpiCard size="sm" label="Inativos" value={estatisticas.inativos} hint="ocultos no cadastro de OS" dot="muted" href="/clientes?status=inativos" active={filtroStatus === "inativos"} />
      <KpiCard size="sm" label="Novos no mês" value={estatisticas.novosNoMes} hint={`desde 01/${mesFormatter.format(new Date())}`} dot="warning" />
    </>
  );

  const filtros = (
    <>
      <BuscaListagem id="busca-clientes" label="Buscar por nome ou telefone" placeholder="Buscar por nome ou telefone..." busca={busca} />
      <LinhaFiltros resumo={textoIntervalo(pagination)}>
        <ChipsFiltroUrl
          aria-label="Filtrar clientes por status"
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
    <PainelLista filtros={filtros} rodape={<Paginacao pagination={pagination} rotulo="clientes" criarHref={criarHref} exibirResumo={false} />}>
      {listaError ? <ErroLista>{listaError}</ErroLista> : null}

      <Tabela aria-label="Clientes cadastrados">
        <TabelaCabecalho colunas={COLUNAS}>
          <TabelaColuna>Cliente</TabelaColuna>
          <TabelaColuna>Contato</TabelaColuna>
          <TabelaColuna>Documento</TabelaColuna>
          <TabelaColuna>Cadastrado em</TabelaColuna>
          <TabelaColuna>Status</TabelaColuna>
          <TabelaColuna alinharDireita>Ações</TabelaColuna>
        </TabelaCabecalho>

        {clientes.length === 0 ? (
          <TabelaVazia mensagem={busca ? `Nenhum cliente encontrado para "${busca}".` : "Nenhum cliente encontrado."} />
        ) : (
          clientes.map((cliente) => {
            const telefoneMascarado = formatPhone(cliente.telefone);
            const link = whatsappLink(cliente.telefone);

            return (
              <TabelaLinha key={cliente.id} colunas={COLUNAS} inativa={!cliente.ativo}>
                <TabelaCelula rotulo="Cliente">
                  <CelulaTitulo>{cliente.nome}</CelulaTitulo>
                  {cliente.observacoes ? <CelulaSubtitulo title={cliente.observacoes}>{cliente.observacoes}</CelulaSubtitulo> : null}
                </TabelaCelula>
                <TabelaCelula rotulo="Contato">
                  {cliente.telefone ? (
                    link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm font-bold text-[color:var(--text)] hover:text-[color:var(--success)] hover:underline"
                        title="Abrir conversa no WhatsApp"
                      >
                        {telefoneMascarado}
                      </a>
                    ) : (
                      <CelulaTitulo>{telefoneMascarado}</CelulaTitulo>
                    )
                  ) : (
                    <CelulaTitulo className="text-[color:var(--text-soft)]">Sem telefone</CelulaTitulo>
                  )}
                  <CelulaSubtitulo>{cliente.email ?? "Sem e-mail"}</CelulaSubtitulo>
                </TabelaCelula>
                <TabelaCelula rotulo="Documento">
                  <span className={`text-[13px] font-medium ${cliente.cpfCnpj ? "text-[color:var(--text)]" : "text-[color:var(--text-soft)]"}`}>
                    {cliente.cpfCnpj ? formatCPFCNPJ(cliente.cpfCnpj) : "—"}
                  </span>
                </TabelaCelula>
                <TabelaCelula rotulo="Cadastrado em">
                  <span className="text-[13px] font-medium text-[color:var(--text)]">{dateFormatter.format(new Date(cliente.criadoEm))}</span>
                </TabelaCelula>
                <TabelaCelula rotulo="Status">
                  <Badge tone={cliente.ativo ? "success" : "danger"}>{cliente.ativo ? "Ativo" : "Inativo"}</Badge>
                </TabelaCelula>
                <TabelaCelula rotulo="Ações" alinharDireita>
                  <AcoesLinha>
                    <Button type="button" variant="secondary" size="sm" onClick={() => iniciarEdicao(cliente)}>
                      Editar
                    </Button>
                    <BotaoStatusLinha ativo={cliente.ativo} onClick={() => alternarStatus(cliente)} disabled={isPending} />
                    <BotaoExcluirLinha onClick={() => pedirExclusao(cliente)} disabled={isPending} rotulo={`Excluir cliente ${cliente.nome}`} />
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
      titulo={editando ? "Editar cliente" : "Novo cliente"}
      dica={editando ? `Editando ${editando.nome}.` : "Nome e telefone bastam para abrir uma OS."}
      rodape={
        <>
          <Button type="button" variant="secondary" onClick={cancelarEdicao}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} isLoading={isSubmitting || isPending} className="min-w-[160px]">
            {editando ? "Salvar alterações" : "Cadastrar cliente"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="grid gap-3.5" onSubmit={onSubmit} noValidate>
        <div className="grid gap-1">
          <Label htmlFor="nome" obrigatorio>Nome</Label>
          <Input id="nome" {...register("nome")} placeholder="Nome do cliente" aria-invalid={Boolean(errors.nome)} aria-describedby={errors.nome ? "nome-error" : undefined} />
          {errors.nome ? <ErroCampo id="nome-error">{errors.nome.message}</ErroCampo> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="telefone" obrigatorio>Telefone</Label>
            <Input
              id="telefone"
              type="tel"
              {...register("telefone")}
              onChange={(e) => {
                e.target.value = maskPhone(e.target.value);
                register("telefone").onChange(e);
              }}
              placeholder="(11) 99999-9999"
              aria-invalid={Boolean(errors.telefone)}
              aria-describedby={errors.telefone ? "telefone-error" : undefined}
            />
            {errors.telefone ? <ErroCampo id="telefone-error">{errors.telefone.message}</ErroCampo> : null}
          </div>

          <div className="grid gap-1">
            <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
            <Input
              id="cpfCnpj"
              {...register("cpfCnpj")}
              onChange={(e) => {
                e.target.value = maskCPFCNPJ(e.target.value);
                register("cpfCnpj").onChange(e);
              }}
              placeholder="Opcional"
              aria-invalid={Boolean(errors.cpfCnpj)}
              aria-describedby={errors.cpfCnpj ? "cpfCnpj-error" : undefined}
            />
            {errors.cpfCnpj ? <ErroCampo id="cpfCnpj-error">{errors.cpfCnpj.message}</ErroCampo> : null}
          </div>
        </div>

        <div className="grid gap-1">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" {...register("email")} placeholder="cliente@exemplo.com" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />
          {errors.email ? <ErroCampo id="email-error">{errors.email.message}</ErroCampo> : null}
        </div>

        <div className="grid gap-1">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea id="observacoes" {...register("observacoes")} rows={3} placeholder="Informações adicionais sobre o cliente" />
        </div>

        {submitError ? <ErroCampo id="cliente-submit-error">{submitError}</ErroCampo> : null}
      </form>
    </PainelCadastroRapido>
  );

  return (
    <>
      <CadastroLayout kpis={kpis} lista={lista} aside={aside} />

      <ConfirmDialog
        aberto={itemParaExcluir !== null}
        titulo="Excluir cliente"
        descricao={`Excluir o cliente "${itemParaExcluir?.nome ?? ""}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
        tone="danger"
        onConfirmar={() =>
          confirmarExclusao((cliente) => {
            if (editando?.id === cliente.id) {
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
