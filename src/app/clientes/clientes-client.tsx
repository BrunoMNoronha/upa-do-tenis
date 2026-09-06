"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Badge, Button, Card, Input, Label, SectionTitle, Textarea } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCadastroAcoes } from "@/components/use-cadastro-acoes";
import { clienteFormSchema, type ClienteFormValues } from "@/lib/clientes-schema";
import { formatCPFCNPJ, formatPhone, maskCPFCNPJ, maskPhone, whatsappLink } from "@/lib/formatters";

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
};

const defaultValues: ClienteFormValues = {
  nome: "",
  telefone: "",
  email: "",
  cpfCnpj: "",
  observacoes: "",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function ClientesClient({ clientes, busca }: ClientesClientProps) {
  const router = useRouter();
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

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
            {editando ? "Editar cliente" : "Novo cliente"}
          </p>
          <SectionTitle className="mt-2 text-2xl">
            {editando ? `Editando ${editando.nome}` : "Preencha os dados básicos"}
          </SectionTitle>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" {...register("nome")} placeholder="Nome do cliente" />
            {errors.nome ? <p className="text-sm text-red-600">{errors.nome.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              {...register("telefone")}
              onChange={(e) => {
                e.target.value = maskPhone(e.target.value);
                register("telefone").onChange(e);
              }}
              placeholder="(11) 99999-9999"
            />
            {errors.telefone ? <p className="text-sm text-red-600">{errors.telefone.message}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" {...register("email")} placeholder="cliente@exemplo.com" />
              {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
              <Input
                id="cpfCnpj"
                {...register("cpfCnpj")}
                onChange={(e) => {
                  e.target.value = maskCPFCNPJ(e.target.value);
                  register("cpfCnpj").onChange(e);
                }}
                placeholder="Opcional"
              />
              {errors.cpfCnpj ? <p className="text-sm text-red-600">{errors.cpfCnpj.message}</p> : null}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              {...register("observacoes")}
              rows={4}
              placeholder="Informações adicionais sobre o cliente"
            />
          </div>

          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting || isPending}>
              {isSubmitting || isPending ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar cliente"}
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
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-soft)]">
              Lista de clientes
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Clientes cadastrados</h2>
          </div>
          <Badge tone="accent">Total: {clientes.length}</Badge>
        </div>

        <form className="mb-6 flex gap-2">
          <Input
            name="busca"
            defaultValue={busca}
            placeholder="Buscar por nome ou telefone..."
            className="!border-white/20 !bg-white/10 !text-white placeholder:text-slate-400"
          />
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
          {busca ? (
            <Button href="/clientes" variant="ghost" className="!border-white/20 !text-white hover:!bg-white/10">
              Limpar
            </Button>
          ) : null}
        </form>

        {listaError ? (
          <p className="mb-4 rounded-2xl border border-rose-500/50 bg-rose-950/20 p-4 text-sm text-rose-200">
            {listaError}
          </p>
        ) : null}

        {clientes.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-200">
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div className="space-y-4">
            {clientes.map((cliente) => {
              const telefoneMascarado = formatPhone(cliente.telefone);
              const link = whatsappLink(cliente.telefone);

              return (
                <article
                  key={cliente.id}
                  className={`rounded-3xl border p-5 ${
                    cliente.ativo ? "border-white/10 bg-white/5" : "border-rose-500/50 bg-rose-950/20"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{cliente.nome}</h3>
                      {cliente.telefone ? (
                        link ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-sm text-[color:var(--accent-soft)] hover:underline"
                          >
                            {telefoneMascarado}
                          </a>
                        ) : (
                          <p className="mt-1 text-sm text-slate-200">{telefoneMascarado}</p>
                        )
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge tone="neutral">{dateFormatter.format(new Date(cliente.criadoEm))}</Badge>
                      <Badge tone={cliente.ativo ? "success" : "danger"}>
                        {cliente.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-slate-200">
                    {cliente.email ? <p>E-mail: {cliente.email}</p> : null}
                    {cliente.cpfCnpj ? <p>CPF/CNPJ: {formatCPFCNPJ(cliente.cpfCnpj)}</p> : null}
                    {cliente.observacoes ? <p>Observações: {cliente.observacoes}</p> : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => iniciarEdicao(cliente)}
                      className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => alternarStatus(cliente)}
                      disabled={isPending}
                      className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        cliente.ativo
                          ? "border-amber-400/40 text-amber-200 hover:bg-amber-950/40"
                          : "border-emerald-400/40 text-emerald-200 hover:bg-emerald-950/40"
                      }`}
                    >
                      {cliente.ativo ? "Inativar" : "Reativar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => pedirExclusao(cliente)}
                      disabled={isPending}
                      className="rounded-full border border-rose-400/40 px-4 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

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
      />
    </section>
  );
}
