"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button, Card, Input, Label, SectionTitle, Textarea } from "@/components/ui";
import { produtoFormSchema, type ProdutoFormValues } from "@/lib/produtos-schema";
import { formatCurrency, maskCurrency } from "@/lib/formatters";

type ProdutoListado = {
  id: string;
  nome: string;
  descricao: string | null;
  precoVenda: number;
  ativo: boolean;
  criadoEm: string;
};

type ProdutoFormProps = {
  editando: ProdutoListado | null;
  onCancel: () => void;
  onSuccess: () => void;
};

const defaultValues: ProdutoFormValues = {
  nome: "",
  descricao: "",
  precoVenda: 0,
};

export function ProdutoForm({ editando, onCancel, onSuccess }: ProdutoFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoFormSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    if (editando) {
      setSubmitError(null);
      reset({
        nome: editando.nome,
        descricao: editando.descricao ?? "",
        precoVenda: formatCurrency(editando.precoVenda) as unknown as number,
      });
    } else {
      setSubmitError(null);
      reset(defaultValues);
    }
  }, [editando, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const url = editando ? `/api/produtos/${editando.id}` : "/api/produtos";

    const response = await fetch(url, {
      method: editando ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setSubmitError(payload.message ?? "Não foi possível salvar o produto.");
      return;
    }

    onSuccess();
    reset(defaultValues);

    startTransition(() => {
      router.refresh();
    });
  });

  return (
    <Card className="p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
          {editando ? "Editar Produto" : "Novo Cadastro"}
        </p>
        <SectionTitle className="mt-2 text-2xl">
          {editando ? `Editando ${editando.nome}` : "Dados do produto"}
        </SectionTitle>
      </div>

      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="nome">Nome do Produto</Label>
          <Input
            id="nome"
            {...register("nome")}
            placeholder="Ex: Cadarço 120cm"
          />
          {errors.nome ? <p className="text-sm text-red-600">{errors.nome.message}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="precoVenda">Preço de Venda (R$)</Label>
          <Input
            id="precoVenda"
            type="text"
            {...register("precoVenda")}
            onChange={(e) => {
              e.target.value = maskCurrency(e.target.value);
              register("precoVenda").onChange(e);
            }}
            onBlur={(e) => {
              if (e.target.value) {
                e.target.value = formatCurrency(e.target.value);
                register("precoVenda").onChange(e);
              }
              register("precoVenda").onBlur(e);
            }}
            placeholder="R$ 0,00"
          />
          {errors.precoVenda ? <p className="text-sm text-red-600">{errors.precoVenda.message}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea
            id="descricao"
            {...register("descricao")}
            rows={3}
            placeholder="Detalhes adicionais sobre o produto"
          />
        </div>

        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isSubmitting || isPending}>
            {isSubmitting || isPending
              ? "Salvando..."
              : editando
                ? "Salvar alterações"
                : "Cadastrar Produto"}
          </Button>
          {editando ? (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar edição
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
