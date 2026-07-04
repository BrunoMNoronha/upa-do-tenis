"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Badge, Button, Card, Input, Label, SectionTitle } from "@/components/ui";
import {
  usuarioCriarSchema,
  usuarioEditarFormSchema,
  type UsuarioFormValues,
} from "@/lib/usuarios-schema";

type UsuarioListado = {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  criadoEm: string;
};

type UsuariosClientProps = {
  usuarios: UsuarioListado[];
};

const defaultValues: UsuarioFormValues = {
  nome: "",
  email: "",
  senha: "",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

export function UsuariosClient({ usuarios }: UsuariosClientProps) {
  const router = useRouter();
  const [editando, setEditando] = useState<UsuarioListado | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UsuarioFormValues>({
    resolver: zodResolver(editando ? usuarioEditarFormSchema : usuarioCriarSchema),
    defaultValues,
    mode: "onChange",
  });

  const iniciarEdicao = (usuario: UsuarioListado) => {
    setEditando(usuario);
    setSubmitError(null);
    reset({ nome: usuario.nome, email: usuario.email, senha: "" });
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setSubmitError(null);
    reset(defaultValues);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const url = editando ? `/api/usuarios/${editando.id}` : "/api/usuarios";
    const payload: Record<string, unknown> = {
      nome: values.nome,
      email: values.email,
    };

    if (!editando || values.senha !== "") {
      payload.senha = values.senha;
    }

    const response = await fetch(url, {
      method: editando ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      setSubmitError(body.message ?? "Não foi possível salvar o usuário.");
      return;
    }

    setEditando(null);
    reset(defaultValues);

    startTransition(() => {
      router.refresh();
    });
  });

  const alternarStatus = async (usuario: UsuarioListado) => {
    setStatusError(null);

    const response = await fetch(`/api/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ativo: !usuario.ativo }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      setStatusError(body.message ?? "Não foi possível alterar o status do usuário.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
            {editando ? "Editar Usuário" : "Novo Cadastro"}
          </p>
          <SectionTitle className="mt-2 text-2xl">
            {editando ? `Editando ${editando.nome}` : "Preencha os dados do usuário"}
          </SectionTitle>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" {...register("nome")} placeholder="Nome do usuário" />
            {errors.nome ? <p className="text-sm text-red-600">{errors.nome.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" {...register("email")} placeholder="usuario@exemplo.com" />
            {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="new-password"
              {...register("senha")}
              placeholder={editando ? "Deixe em branco para manter a senha atual" : "Mínimo de 6 caracteres"}
            />
            {errors.senha ? <p className="text-sm text-red-600">{errors.senha.message}</p> : null}
          </div>

          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting || isPending}>
              {isSubmitting || isPending
                ? "Salvando..."
                : editando
                  ? "Salvar alterações"
                  : "Cadastrar usuário"}
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
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-soft)]">
              Lista de Usuários
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Usuários Cadastrados</h2>
          </div>
          <Badge tone="accent">Total: {usuarios.length}</Badge>
        </div>

        {statusError ? (
          <p className="mb-4 rounded-2xl border border-rose-500/50 bg-rose-950/20 p-4 text-sm text-rose-200">
            {statusError}
          </p>
        ) : null}

        {usuarios.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-200">
            Nenhum usuário cadastrado ainda. Use o formulário ao lado para criar o primeiro registro.
          </div>
        ) : (
          <div className="space-y-4">
            {usuarios.map((usuario) => (
              <article
                key={usuario.id}
                className={`rounded-3xl border p-5 ${
                  usuario.ativo ? "border-white/10 bg-white/5" : "border-rose-500/50 bg-rose-950/20"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{usuario.nome}</h3>
                    <p className="mt-1 text-sm text-slate-300">{usuario.email}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.1em] text-slate-400">
                      Criado em {dateFormatter.format(new Date(usuario.criadoEm))}
                    </p>
                  </div>
                  <Badge tone={usuario.ativo ? "success" : "danger"}>
                    {usuario.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => iniciarEdicao(usuario)}
                    className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => alternarStatus(usuario)}
                    disabled={isPending}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      usuario.ativo
                        ? "border-rose-400/40 text-rose-200 hover:bg-rose-950/40"
                        : "border-emerald-400/40 text-emerald-200 hover:bg-emerald-950/40"
                    }`}
                  >
                    {usuario.ativo ? "Inativar" : "Reativar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
