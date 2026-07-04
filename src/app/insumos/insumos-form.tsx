"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button, Input, Label, Textarea } from "@/components/ui";
import { insumoFormSchema, type InsumoFormValues } from "@/lib/insumos-schema";

const defaultValues: InsumoFormValues = {
  nome: "",
  descricao: "",
  unidadeMedida: "",
  quantidadeEstoque: 0,
  estoqueMinimo: 0,
  custoUnitario: 0,
};

export function InsumosForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InsumoFormValues>({
    resolver: zodResolver(insumoFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

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

    reset(defaultValues);

    startTransition(() => {
      router.refresh();
    });
  });

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          {...register("nome")}
          placeholder="Nome do produto ou material"
        />
        {errors.nome ? <p className="text-sm text-red-600">{errors.nome.message}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="unidadeMedida">Unidade de Medida</Label>
          <Input
            id="unidadeMedida"
            {...register("unidadeMedida")}
            placeholder="Ex: un, par, ml, kg"
          />
          {errors.unidadeMedida ? <p className="text-sm text-red-600">{errors.unidadeMedida.message}</p> : null}
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="custoUnitario">Custo Unitário (R$)</Label>
          <Input
            id="custoUnitario"
            type="number"
            step="0.01"
            min="0"
            {...register("custoUnitario")}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="quantidadeEstoque">Quantidade Atual</Label>
          <Input
            id="quantidadeEstoque"
            type="number"
            step="0.01"
            min="0"
            {...register("quantidadeEstoque")}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="estoqueMinimo">Estoque Mínimo</Label>
          <Input
            id="estoqueMinimo"
            type="number"
            step="0.01"
            min="0"
            {...register("estoqueMinimo")}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          {...register("descricao")}
          rows={3}
          placeholder="Detalhes adicionais"
        />
      </div>

      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <Button
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Salvando..." : "Cadastrar Insumo"}
      </Button>
    </form>
  );
}
