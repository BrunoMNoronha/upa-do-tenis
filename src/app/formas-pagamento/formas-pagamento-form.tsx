"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button, Input, Label } from "@/components/ui";
import { formaPagamentoFormSchema, type FormaPagamentoFormValues } from "@/lib/formas-pagamento-schema";

const defaultValues: FormaPagamentoFormValues = {
  nome: "",
  tipo: "",
};

export function FormasPagamentoForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormaPagamentoFormValues>({
    resolver: zodResolver(formaPagamentoFormSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const response = await fetch("/api/formas-pagamento", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setSubmitError(payload.message ?? "Não foi possível salvar a forma de pagamento.");
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
          placeholder="Ex: Cartão de Crédito Visa"
        />
        {errors.nome ? <p className="text-sm text-red-600">{errors.nome.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="tipo">Tipo Interno (Opcional)</Label>
        <Input
          id="tipo"
          {...register("tipo")}
          placeholder="Ex: CARTAO_CREDITO"
        />
        {errors.tipo ? <p className="text-sm text-red-600">{errors.tipo.message}</p> : null}
      </div>

      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <Button
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Salvando..." : "Cadastrar"}
      </Button>
    </form>
  );
}
