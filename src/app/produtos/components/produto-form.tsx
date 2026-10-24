"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ErroCampo, PainelCadastroRapido } from "@/components/cadastro-layout";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { produtoFormSchema, type ProdutoFormValues } from "@/lib/produtos-schema";
import { formatCurrency, maskCurrency } from "@/lib/formatters";
import type { ProdutoListado } from "../types";

type ProdutoFormProps = {
  editando: ProdutoListado | null;
  onCancel: () => void;
  onSuccess: () => void;
};

const defaultValues: ProdutoFormValues = {
  nome: "",
  descricao: "",
  precoVenda: 0,
  quantidadeInicial: undefined,
};

const FORM_ID = "form-produto";

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

  const cancelar = () => {
    setSubmitError(null);
    reset(defaultValues);
    onCancel();
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const url = editando ? `/api/produtos/${editando.id}` : "/api/produtos";
    const payload = editando
      ? {
          nome: values.nome,
          descricao: values.descricao,
          precoVenda: values.precoVenda,
        }
      : values;

    const response = await fetch(url, {
      method: editando ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
    <PainelCadastroRapido
      titulo={editando ? "Editar produto" : "Novo produto"}
      dica={editando ? `Editando ${editando.nome}.` : "O estoque inicial é opcional; entradas seguintes vão por Movimentações."}
      rodape={
        <>
          <Button type="button" variant="secondary" onClick={cancelar}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} isLoading={isSubmitting || isPending} className="min-w-[160px]">
            {editando ? "Salvar alterações" : "Cadastrar produto"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="grid gap-3.5" onSubmit={onSubmit} noValidate>
        <div className="grid gap-1">
          <Label htmlFor="nome" obrigatorio>Nome do produto</Label>
          <Input
            id="nome"
            {...register("nome")}
            placeholder="Ex.: Cadarço 120 cm"
            aria-invalid={Boolean(errors.nome)}
            aria-describedby={errors.nome ? "nome-error" : undefined}
          />
          {errors.nome ? <ErroCampo id="nome-error">{errors.nome.message}</ErroCampo> : null}
        </div>

        <div className={`grid gap-3 ${editando ? "" : "sm:grid-cols-2"}`}>
          <div className="grid gap-1">
            <Label htmlFor="precoVenda" obrigatorio>Preço de venda (R$)</Label>
            <Input
              id="precoVenda"
              type="text"
              aria-invalid={Boolean(errors.precoVenda)}
              aria-describedby={errors.precoVenda ? "precoVenda-error" : undefined}
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
            {errors.precoVenda ? <ErroCampo id="precoVenda-error">{errors.precoVenda.message}</ErroCampo> : null}
          </div>

          {!editando ? (
            <div className="grid gap-1">
              <Label htmlFor="quantidadeInicial">Estoque inicial (un)</Label>
              <Input
                id="quantidadeInicial"
                type="number"
                min="0"
                step="1"
                {...register("quantidadeInicial")}
                placeholder="0 (opcional)"
                aria-invalid={Boolean(errors.quantidadeInicial)}
                aria-describedby={errors.quantidadeInicial ? "quantidadeInicial-error quantidadeInicial-hint" : "quantidadeInicial-hint"}
              />
              <p id="quantidadeInicial-hint" className="text-xs text-[color:var(--text-soft)]">
                Se informado, registra uma entrada manual rastreável no estoque.
              </p>
              {errors.quantidadeInicial ? <ErroCampo id="quantidadeInicial-error">{errors.quantidadeInicial.message}</ErroCampo> : null}
            </div>
          ) : null}
        </div>

        <div className="grid gap-1">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea
            id="descricao"
            {...register("descricao")}
            rows={3}
            placeholder="Detalhes adicionais sobre o produto"
            aria-invalid={Boolean(errors.descricao)}
            aria-describedby={errors.descricao ? "descricao-error" : undefined}
          />
          {errors.descricao ? <ErroCampo id="descricao-error">{errors.descricao.message}</ErroCampo> : null}
        </div>

        {submitError ? <ErroCampo id="produto-submit-error">{submitError}</ErroCampo> : null}
      </form>
    </PainelCadastroRapido>
  );
}
