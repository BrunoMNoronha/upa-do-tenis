"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { IconeFechar, IconeMais } from "@/components/icones";
import { Combobox } from "@/components/combobox";
import type { DadosCompartilhamentoAcompanhamento } from "@/components/compartilhar-acompanhamento-dialog";
import { formatCurrency, maskCPFCNPJ, maskPhone } from "@/lib/formatters";
import { clienteFormSchema, type ClienteFormValues } from "@/lib/clientes-schema";
import { ordemServicoFormSchema, type OrdemServicoFormValues, type OrdemServicoItemValues } from "@/lib/ordens-servico-schema";
import { LIMITE_ITENS_POR_OS, TIPO_ITEM_PADRAO, calcularTotalItens } from "@/lib/ordens-servico-itens";
import { ItemRecebidoFormCard, gerarClientKeyItem, type EstadoFotoItem, type StatusUploadFotoItem } from "./item-recebido-form-card";
import { dataOperacionalHoje } from "@/lib/date-range";
import { previaNumeroOS } from "@/lib/ordens-servico-numero";
import { calcularPrazoPrevistoPadrao } from "@/lib/ordens-servico-prazo";

const criarItemVazio = (): OrdemServicoItemValues => ({
  clientKey: gerarClientKeyItem(),
  tipoItem: TIPO_ITEM_PADRAO,
  descricao: "",
  observacoes: "",
  servicos: [],
});

const criarDefaultValues = (): OrdemServicoFormValues => {
  const hoje = dataOperacionalHoje();
  return {
    clienteId: "",
    itens: [criarItemVazio()],
    servicos: [],
    dataEntrada: hoje,
    numeroOS: "",
    justificativaDataEntrada: "",
    // Sugestão inicial: 5 dias sem contar domingos. O operador pode alterar.
    prazoPrevisto: calcularPrazoPrevistoPadrao(hoje),
    valorEstimado: 0,
    observacoes: "",
  };
};

type UploadFotoItem = {
  clientKey: string;
  itemId: string;
  chaveIdempotencia: string;
  arquivo: File;
  status: StatusUploadFotoItem;
  erro?: string;
};

type OrdemCriadaComCliente = {
  id: string;
  numero: string;
  caminhoAcompanhamento?: string;
  nomeCliente: string;
  telefone?: string;
};

/** OS já criada cujo upload de foto de algum item ainda não terminou bem. */
type OrdemPendenteFoto = OrdemCriadaComCliente & { uploads: UploadFotoItem[] };

const defaultClienteValues: ClienteFormValues = {
  nome: "",
  telefone: "",
  email: "",
  cpfCnpj: "",
  observacoes: "",
};

// Types corresponding to what Prisma returns
export type Cliente = { id: string; nome: string; telefone: string };
export type Servico = { id: string; nome: string; precoBase: string };

/**
 * Blocos de apresentação do formulário de cadastro de OS. Apenas layout:
 * não alteram bindings, validação nem payload.
 */
function FormSection({
  titulo,
  descricao,
  obrigatorio = false,
  acao,
  children,
}: {
  titulo: string;
  descricao?: string;
  /** Marca a seção cujo campo principal é obrigatório (o label fica só para leitores de tela). */
  obrigatorio?: boolean;
  /** Ação ao lado do título (ex.: "+ Cadastrar novo cliente"). */
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[color:var(--accent-strong)]">
            {titulo}
            {obrigatorio ? (
              <>
                {" "}
                <span aria-hidden="true" className="text-[color:var(--danger)]">*</span>
              </>
            ) : null}
          </h3>
          {descricao ? (
            <p className="mt-1 text-xs leading-5 text-[color:var(--text-soft)]">{descricao}</p>
          ) : null}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

function CampoObrigatorio() {
  return (
    <>
      <span aria-hidden="true" className="text-red-600">*</span>
      <span className="sr-only"> (obrigatório)</span>
    </>
  );
}

function ErroCampo({ id, mensagem }: { id?: string; mensagem?: string | null }) {
  if (!mensagem) return null;
  return (
    <p id={id} role="alert" className="text-sm text-red-600">
      {mensagem}
    </p>
  );
}

export function OrdemServicoForm({
  clientes,
  servicos,
  onClose,
  onCriada,
  onConcluida,
}: {
  clientes: Cliente[];
  servicos: Servico[];
  onClose: () => void;
  onCriada: (dados: DadosCompartilhamentoAcompanhamento) => void;
  /** Pede à lista uma atualização assim que o drawer terminar de fechar. */
  onConcluida: () => void;
}) {
  const router = useRouter();
  const [clientesDisponiveis, setClientesDisponiveis] =
    useState<Cliente[]>(clientes);
  const [mostrarNovoCliente, setMostrarNovoCliente] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [clienteError, setClienteError] = useState<string | null>(null);
  // Fotos ficam fora do JSON do formulário, indexadas pela clientKey do item.
  const [fotosPorItem, setFotosPorItem] = useState<Record<string, EstadoFotoItem>>({});
  const fotoProcessando = Object.values(fotosPorItem).some((estado) => estado.processando);
  // OS já criada cujo upload de foto de algum item falhou: o botão de
  // cadastrar não pode criar outra OS, e só as fotos com erro são reenviadas.
  const [ordemPendenteFoto, setOrdemPendenteFoto] = useState<OrdemPendenteFoto | null>(null);
  const [reenviandoFoto, setReenviandoFoto] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrdemServicoFormValues>({
    resolver: zodResolver(ordemServicoFormSchema),
    defaultValues: criarDefaultValues(),
    mode: "onChange",
  });
  const { fields: itensFields, append: adicionarItem, remove: removerItemDoFormulario } = useFieldArray({
    control,
    name: "itens",
    keyName: "fieldId",
  });
  const itensAtuais = watch("itens");
  const totalOrdem = calcularTotalItens(itensAtuais ?? []);

  const registrarFotoDoItem = useCallback((clientKey: string, estado: EstadoFotoItem) => {
    setFotosPorItem((atual) => {
      const anterior = atual[clientKey];
      const mesmasFotos = anterior?.fotos.length === estado.fotos.length && anterior.fotos.every((foto, indice) =>
        foto.chaveIdempotencia === estado.fotos[indice]?.chaveIdempotencia && foto.arquivo === estado.fotos[indice]?.arquivo,
      );
      if (anterior && mesmasFotos && anterior.processando === estado.processando) {
        return atual;
      }
      return { ...atual, [clientKey]: estado };
    });
  }, []);

  const hojeOperacional = dataOperacionalHoje();
  const dataEntradaSelecionada = watch("dataEntrada");
  const exigeJustificativaDataEntrada =
    !!dataEntradaSelecionada && dataEntradaSelecionada !== hojeOperacional;
  const numeroOSDigitado = watch("numeroOS");
  const previaNumero = previaNumeroOS(
    dataEntradaSelecionada || hojeOperacional,
    numeroOSDigitado,
  );

  const enviarFoto = async (ordemId: string, itemId: string, arquivo: File, chaveIdempotencia: string) => {
    const dados = new FormData();
    dados.set("foto", arquivo);
    dados.set("chaveIdempotencia", chaveIdempotencia);
    const response = await fetch(`/api/ordens-servico/${ordemId}/itens/${itemId}/fotos`, {
      method: "POST",
      body: dados,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.message || "A OS foi criada, mas não foi possível salvar a foto.");
    }
  };

  /**
   * Envia as fotos uma a uma (baixa concorrência no celular) e devolve a
   * lista com o resultado de cada uma. Falha em uma foto não interrompe as
   * demais nem apaga a OS.
   */
  const enviarFotosDosItens = async (ordemId: string, uploads: UploadFotoItem[]) => {
    const resultado: UploadFotoItem[] = [];
    for (const upload of uploads) {
      if (upload.status === "enviada") {
        resultado.push(upload);
        continue;
      }
      try {
        await enviarFoto(ordemId, upload.itemId, upload.arquivo, upload.chaveIdempotencia);
        resultado.push({ ...upload, status: "enviada", erro: undefined });
      } catch (error) {
        resultado.push({
          ...upload,
          status: "erro",
          erro: error instanceof Error ? error.message : "Não foi possível salvar a foto.",
        });
      }
    }
    return resultado;
  };

  const concluirCriacao = (criada: OrdemCriadaComCliente) => {
    // Novas clientKeys remontam os cards e limpam as fotos de cada item.
    reset(criarDefaultValues());
    setFotosPorItem({});
    setOrdemPendenteFoto(null);
    // O replaceState de onClose aborta um refresh disparado neste mesmo ciclo
    // (inclusive o antecipado); a lista refaz a atualização após o fechamento.
    onConcluida();
    onClose();
    if (criada.caminhoAcompanhamento) {
      onCriada({
        numeroOS: criada.numero,
        nomeCliente: criada.nomeCliente,
        telefone: criada.telefone,
        caminhoAcompanhamento: criada.caminhoAcompanhamento,
      });
    }
  };

  const reenviarFoto = async () => {
    if (!ordemPendenteFoto || reenviandoFoto) return;
    setReenviandoFoto(true);
    setSubmitError(null);
    try {
      // Só as fotos com falha são reenviadas; as já salvas ficam como estão.
      const uploads = await enviarFotosDosItens(ordemPendenteFoto.id, ordemPendenteFoto.uploads);
      const comErro = uploads.filter((upload) => upload.status === "erro");
      if (comErro.length === 0) {
        concluirCriacao(ordemPendenteFoto);
        return;
      }
      setOrdemPendenteFoto({ ...ordemPendenteFoto, uploads });
      setSubmitError(montarMensagemFotosComErro(comErro.length));
    } finally {
      setReenviandoFoto(false);
    }
  };

  const montarMensagemFotosComErro = (quantidade: number) =>
    quantidade === 1
      ? "A OS foi criada, mas uma foto não foi salva. Reenvie a foto ou abra a OS para continuar."
      : `A OS foi criada, mas ${quantidade} fotos não foram salvas. Reenvie as fotos ou abra a OS para continuar.`;

  const {
    register: registerCliente,
    handleSubmit: handleSubmitCliente,
    reset: resetCliente,
    formState: { errors: clienteErrors, isSubmitting: clienteSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: defaultClienteValues,
    mode: "onChange",
  });

  const cancelarNovoCliente = () => {
    setMostrarNovoCliente(false);
    setClienteError(null);
    resetCliente(defaultClienteValues);
  };

  const onSubmitCliente = handleSubmitCliente(async (values) => {
    setClienteError(null);

    const response = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setClienteError(
        payload.message ?? "Não foi possível cadastrar o cliente.",
      );
      return;
    }

    const payload = (await response.json()) as { cliente: Cliente };
    setClientesDisponiveis((atuais) => [...atuais, payload.cliente]);
    setValue("clienteId", payload.cliente.id, { shouldValidate: true });
    cancelarNovoCliente();
  });

  // Serviços vivem em `itens[indice].servicos`; o subtotal do item e o total
  // da OS são derivados deles, nunca digitados.
  const servicosDoItem = (indice: number) => itensAtuais?.[indice]?.servicos ?? [];
  const definirServicosDoItem = (indice: number, atualizados: OrdemServicoItemValues["servicos"]) => {
    setValue(`itens.${indice}.servicos`, atualizados, { shouldValidate: true, shouldDirty: true });
  };

  const adicionarServico = (indice: number, servicoId: string) => {
    const atuais = servicosDoItem(indice);
    // Mesmo serviço em itens diferentes é permitido; repetido no item, não.
    if (!servicoId || atuais.some((item) => item.servicoId === servicoId)) {
      return;
    }

    const servico = servicos.find((item) => item.id === servicoId);
    if (!servico) {
      return;
    }

    definirServicosDoItem(indice, [
      ...atuais,
      { servicoId, valor: Number(servico.precoBase || 0) },
    ]);
  };

  const atualizarValorServico = (indice: number, servicoId: string, valor: string) => {
    const valorNumerico = Number(valor.replace(",", "."));
    definirServicosDoItem(
      indice,
      servicosDoItem(indice).map((item) =>
        item.servicoId === servicoId
          ? { ...item, valor: Number.isFinite(valorNumerico) ? valorNumerico : 0 }
          : item,
      ),
    );
  };

  const removerServico = (indice: number, servicoId: string) => {
    definirServicosDoItem(
      indice,
      servicosDoItem(indice).filter((item) => item.servicoId !== servicoId),
    );
  };

  const adicionarNovoItem = () => {
    if (itensFields.length >= LIMITE_ITENS_POR_OS) return;
    adicionarItem(criarItemVazio());
  };

  const removerItem = (indice: number) => {
    if (itensFields.length <= 1) return;
    const item = itensAtuais?.[indice];
    const clientKey = itensFields[indice]?.clientKey ?? item?.clientKey ?? "";
    const temConteudo =
      (item?.servicos?.length ?? 0) > 0 || (fotosPorItem[clientKey]?.fotos.length ?? 0) > 0;
    if (temConteudo && !window.confirm(`Remover o item ${indice + 1}? Os serviços e as fotos dele serão descartados.`)) {
      return;
    }
    removerItemDoFormulario(indice);
    setFotosPorItem((atual) => {
      if (!(clientKey in atual)) return atual;
      const { [clientKey]: _removida, ...restantes } = atual;
      return restantes;
    });
  };

  const onSubmit = handleSubmit(async (values) => {
    if (ordemPendenteFoto) {
      setSubmitError("Esta OS já foi criada. Reenvie as fotos ou abra o detalhe para continuar.");
      return;
    }
    if (fotoProcessando) {
      setSubmitError("Aguarde a otimização das fotos terminar.");
      return;
    }
    setSubmitError(null);

    const response = await fetch("/api/ordens-servico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = await response.json();
      setSubmitError(
        payload.message ?? "Não foi possível criar a ordem de serviço.",
      );
      return;
    }

    // Só chega aqui com a criação confirmada (201): a sugestão de WhatsApp
    // nunca aparece antes disso, e fechar a sugestão não afeta a OS.
    const criada = (await response.json()) as {
      id: string;
      numero: string;
      caminhoAcompanhamento?: string;
      itens: Array<{ id: string; clientKey?: string }>;
    };
    // A OS já existe, mesmo se algum upload falhar. Atualiza a lista sem
    // depender da conclusão das fotos e mantém o formulário para reenvio.
    startTransition(() => router.refresh());
    const cliente = clientesDisponiveis.find((item) => item.id === values.clienteId);
    const criadaComCliente: OrdemCriadaComCliente = {
      id: criada.id,
      numero: criada.numero,
      caminhoAcompanhamento: criada.caminhoAcompanhamento,
      nomeCliente: cliente?.nome ?? "",
      telefone: cliente?.telefone,
    };

    // Associa cada foto ao item persistido pela clientKey devolvida pela API.
    // Sem clientKey na resposta (API antiga), cai na posição do item.
    const uploads: UploadFotoItem[] = [];
    values.itens.forEach((item, indice) => {
      const clientKey = item.clientKey ?? "";
      const fotos = fotosPorItem[clientKey]?.fotos ?? [];
      if (fotos.length === 0) return;
      const persistido =
        criada.itens.find((candidato) => candidato.clientKey && candidato.clientKey === clientKey) ??
        criada.itens[indice];
      if (!persistido) return;
      fotos.forEach((foto) => uploads.push({
        clientKey,
        itemId: persistido.id,
        chaveIdempotencia: foto.chaveIdempotencia,
        arquivo: foto.arquivo,
        status: "pendente",
      }));
    });

    if (uploads.length > 0) {
      const resultado = await enviarFotosDosItens(criada.id, uploads);
      const comErro = resultado.filter((upload) => upload.status === "erro");
      if (comErro.length > 0) {
        setOrdemPendenteFoto({ ...criadaComCliente, uploads: resultado });
        setSubmitError(montarMensagemFotosComErro(comErro.length));
        return;
      }
    }

    concluirCriacao(criadaComCliente);
  });

  const statusUploadPorClientKey = new Map<string, { status: StatusUploadFotoItem; erro?: string }>();
  for (const upload of ordemPendenteFoto?.uploads ?? []) {
    const atual = statusUploadPorClientKey.get(upload.clientKey);
    if (upload.status === "erro") statusUploadPorClientKey.set(upload.clientKey, { status: "erro", erro: upload.erro });
    else if (!atual) statusUploadPorClientKey.set(upload.clientKey, { status: upload.status });
  }

  return (
    <section id="nova-ordem" className="flex min-h-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border)] px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--accent)]">Cadastro</p>
            <h2 id="cadastro-os-titulo" className="text-2xl font-extrabold text-[color:var(--text)]">
              Nova ordem de serviço
            </h2>
            <p className="text-[13px] text-[color:var(--text-soft)]">
              Campos com * são obrigatórios. A OS nasce como <span className="font-bold text-[color:var(--text)]">Aberta</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar cadastro de OS"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border-strong)] bg-white text-[color:var(--text-soft)] transition hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
          >
            <IconeFechar className="h-[18px] w-[18px]" />
          </button>
        </div>

        <form className="flex flex-1 flex-col" onSubmit={onSubmit} noValidate>
          <div className="grid gap-6 px-6 py-6 sm:px-8">
          {/* 1. Cliente */}
          <FormSection
            titulo="1. Cliente"
            obrigatorio
            acao={
              <button
                type="button"
                aria-expanded={mostrarNovoCliente}
                aria-controls="cadastro-rapido-cliente"
                onClick={() => {
                  setClienteError(null);
                  setMostrarNovoCliente((atual) => !atual);
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-[color:var(--accent)] transition hover:bg-[color:var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
              >
                {mostrarNovoCliente ? <IconeFechar /> : <IconeMais />}
                {mostrarNovoCliente ? "Fechar cadastro rápido" : "Cadastrar novo cliente"}
              </button>
            }
          >
            <div className="grid gap-2">
              <Label htmlFor="clienteId" className="sr-only">
                Cliente <CampoObrigatorio />
              </Label>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Combobox
                    id="clienteId"
                    aria-invalid={Boolean(errors.clienteId)}
                    aria-describedby={errors.clienteId ? "clienteId-error" : undefined}
                    options={clientesDisponiveis.map((c) => ({
                      value: c.id,
                      label: c.nome,
                      subLabel: c.telefone,
                    }))}
                    value={watch("clienteId")}
                    onChange={(val) =>
                      setValue("clienteId", val, { shouldValidate: true })
                    }
                    placeholder="Selecione um cliente..."
                    emptyText="Cliente não encontrado"
                  />
                </div>
              </div>
              <ErroCampo id="clienteId-error" mensagem={errors.clienteId?.message} />
            </div>

            {mostrarNovoCliente ? (
              <div
                id="cadastro-rapido-cliente"
                className="grid gap-4 rounded-2xl border border-[color:var(--accent-soft)] bg-[color:var(--surface-muted)] p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text)]">
                    Cadastro rápido de cliente
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    O cliente será selecionado automaticamente após o cadastro.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="novoClienteNome">Nome e sobrenome</Label>
                    <Input
                      id="novoClienteNome"
                      {...registerCliente("nome")}
                      placeholder="Ex.: Maria Silva"
                      aria-invalid={Boolean(clienteErrors.nome)}
                      aria-describedby={clienteErrors.nome ? "novoClienteNome-error" : undefined}
                    />
                    <ErroCampo id="novoClienteNome-error" mensagem={clienteErrors.nome?.message} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="novoClienteTelefone">Telefone</Label>
                    <Input
                      id="novoClienteTelefone"
                      {...registerCliente("telefone")}
                      aria-invalid={Boolean(clienteErrors.telefone)}
                      aria-describedby={clienteErrors.telefone ? "novoClienteTelefone-error" : undefined}
                      onChange={(e) => {
                        e.target.value = maskPhone(e.target.value);
                        registerCliente("telefone").onChange(e);
                      }}
                      placeholder="(11) 99999-9999"
                    />
                    <ErroCampo id="novoClienteTelefone-error" mensagem={clienteErrors.telefone?.message} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="novoClienteEmail">E-mail (opcional)</Label>
                    <Input
                      id="novoClienteEmail"
                      {...registerCliente("email")}
                      aria-invalid={Boolean(clienteErrors.email)}
                      aria-describedby={clienteErrors.email ? "novoClienteEmail-error" : undefined}
                      placeholder="cliente@exemplo.com"
                    />
                    <ErroCampo id="novoClienteEmail-error" mensagem={clienteErrors.email?.message} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="novoClienteCpfCnpj">
                      CPF ou CNPJ (opcional)
                    </Label>
                    <Input
                      id="novoClienteCpfCnpj"
                      {...registerCliente("cpfCnpj")}
                      aria-invalid={Boolean(clienteErrors.cpfCnpj)}
                      aria-describedby={clienteErrors.cpfCnpj ? "novoClienteCpfCnpj-error" : undefined}
                      onChange={(e) => {
                        e.target.value = maskCPFCNPJ(e.target.value);
                        registerCliente("cpfCnpj").onChange(e);
                      }}
                      placeholder="Opcional"
                    />
                    <ErroCampo id="novoClienteCpfCnpj-error" mensagem={clienteErrors.cpfCnpj?.message} />
                  </div>
                </div>

                <ErroCampo id="cliente-error" mensagem={clienteError} />

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    isLoading={clienteSubmitting}
                    onClick={onSubmitCliente}
                    className="w-full sm:w-auto"
                  >
                    Salvar cliente
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={cancelarNovoCliente}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : null}
          </FormSection>

          {/* 2. Dados da Ordem de Serviço */}
          <FormSection titulo="2. Identificação">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid content-start gap-2">
                <Label htmlFor="dataEntrada">Data de entrada</Label>
                <Input
                  id="dataEntrada"
                  type="date"
                  aria-invalid={Boolean(errors.dataEntrada)}
                  aria-describedby={errors.dataEntrada ? "dataEntrada-error" : undefined}
                  defaultValue={hojeOperacional}
                  max={hojeOperacional}
                  {...register("dataEntrada")}
                />
                <ErroCampo id="dataEntrada-error" mensagem={errors.dataEntrada?.message} />
                {exigeJustificativaDataEntrada ? (
                  <p className="text-xs text-slate-500">
                    Registro retroativo — o número da OS usa a data de entrada
                    informada.
                  </p>
                ) : null}
              </div>

              <div className="grid content-start gap-2">
                <Label htmlFor="numeroOS">
                  Número da OS <CampoObrigatorio />
                </Label>
                <Input
                  id="numeroOS"
                  type="text"
                  aria-invalid={Boolean(errors.numeroOS)}
                  aria-describedby={errors.numeroOS ? "numeroOS-error" : undefined}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ex.: 0124"
                  {...register("numeroOS")}
                />
                <ErroCampo id="numeroOS-error" mensagem={errors.numeroOS?.message} />
                {previaNumero ? (
                  <p className="text-xs text-slate-500">
                    Identificador: <span className="font-semibold text-[color:var(--text)]">{previaNumero}</span>
                  </p>
                ) : null}
              </div>

              <div className="grid content-start gap-2">
                <Label htmlFor="prazoPrevisto">
                  Prazo previsto <CampoObrigatorio />
                </Label>
                <Input
                  id="prazoPrevisto"
                  type="date"
                  aria-invalid={Boolean(errors.prazoPrevisto)}
                  aria-describedby={errors.prazoPrevisto ? "prazoPrevisto-error" : undefined}
                  defaultValue={calcularPrazoPrevistoPadrao(hojeOperacional)}
                  {...register("prazoPrevisto")}
                />
                <ErroCampo id="prazoPrevisto-error" mensagem={errors.prazoPrevisto?.message} />
              </div>

              {exigeJustificativaDataEntrada ? (
                <div className="grid gap-2 md:col-span-3">
                  <Label htmlFor="justificativaDataEntrada">
                    Justificativa da data retroativa <CampoObrigatorio />
                  </Label>
                  <Textarea
                    id="justificativaDataEntrada"
                    rows={2}
                    aria-invalid={Boolean(errors.justificativaDataEntrada)}
                    aria-describedby={errors.justificativaDataEntrada ? "justificativaDataEntrada-error" : undefined}
                    {...register("justificativaDataEntrada")}
                  />
                  <ErroCampo id="justificativaDataEntrada-error" mensagem={errors.justificativaDataEntrada?.message} />
                </div>
              ) : null}
            </div>
          </FormSection>

          {/* 3. Itens recebidos (issue #205): um card por objeto entregue */}
          <FormSection
            titulo="3. Itens recebidos"
            obrigatorio
            descricao="Cada objeto entregue pelo cliente é um item, com a própria foto e os próprios serviços."
          >
            <div className="grid gap-4">
              {itensFields.map((campo, indice) => {
                const upload = statusUploadPorClientKey.get(campo.clientKey ?? "");
                return (
                  <ItemRecebidoFormCard
                    key={campo.fieldId}
                    indice={indice}
                    clientKey={campo.clientKey ?? campo.fieldId}
                    descricaoField={register(`itens.${indice}.descricao`)}
                    erroDescricao={errors.itens?.[indice]?.descricao?.message}
                    erroServicos={errors.itens?.[indice]?.servicos?.message}
                    servicos={servicosDoItem(indice)}
                    catalogo={servicos}
                    onAdicionarServico={(servicoId) => adicionarServico(indice, servicoId)}
                    onAtualizarValorServico={(servicoId, valor) => atualizarValorServico(indice, servicoId, valor)}
                    onRemoverServico={(servicoId) => removerServico(indice, servicoId)}
                    onFotoChange={registrarFotoDoItem}
                    statusUpload={upload?.status}
                    erroUpload={upload?.erro}
                    onRemoverItem={() => removerItem(indice)}
                    podeRemover={itensFields.length > 1}
                    bloqueado={Boolean(ordemPendenteFoto)}
                  />
                );
              })}
              <ErroCampo id="itens-error" mensagem={errors.itens?.message ?? errors.itens?.root?.message} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={adicionarNovoItem}
                  disabled={Boolean(ordemPendenteFoto) || itensFields.length >= LIMITE_ITENS_POR_OS}
                >
                  + Adicionar outro item
                </Button>
                <p className="text-xs text-slate-500">
                  {itensFields.length} de {LIMITE_ITENS_POR_OS} itens
                </p>
              </div>
            </div>

            <div className="grid gap-2 rounded-[14px] border border-[color:var(--accent-soft)] bg-[color:var(--accent-tint)] px-4 py-3.5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[color:var(--accent-strong)]">
                  Valor total dos serviços
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-soft)]">
                  Calculado a partir dos serviços de todos os itens.
                </p>
              </div>
              <p
                data-testid="total-ordem"
                className="text-right text-xl font-extrabold text-[color:var(--accent-strong)] sm:w-56"
              >
                {formatCurrency(totalOrdem)}
              </p>
            </div>
          </FormSection>

          {/* 4. Observações */}
          <FormSection titulo="4. Observações">
            <div className="grid gap-2">
              <Label htmlFor="observacoes" className="sr-only">Observações</Label>
              <Textarea
                id="observacoes"
                rows={4}
                {...register("observacoes")}
                placeholder="Detalhes adicionais do atendimento"
              />
            </div>
          </FormSection>

          {submitError ? (
            <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-red-600">
              <p role="alert">{submitError}</p>
              {ordemPendenteFoto ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" isLoading={reenviandoFoto} onClick={() => void reenviarFoto()}>Reenviar fotos com falha</Button>
                  <Button href={`/ordens-servico/${ordemPendenteFoto.id}`} variant="secondary">Abrir OS já criada</Button>
                </div>
              ) : null}
            </div>
          ) : null}

          </div>

          {/* Ações */}
          <div className="sticky bottom-0 mt-auto flex flex-col-reverse gap-3 border-t border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <p className="text-xs text-[color:var(--text-soft)]">Sinal e pagamentos são registrados no detalhe da OS.</p>
              <Button
                type="submit"
                isLoading={isPending || isSubmitting}
                disabled={Boolean(ordemPendenteFoto) || fotoProcessando}
                className="w-full sm:w-auto sm:min-w-[192px]"
              >
                Cadastrar ordem
              </Button>
            </div>
          </div>
        </form>
    </section>
  );
}

