"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button, Input, Label, Textarea } from "@/components/ui";
import { servicoFormSchema, type ServicoFormValues } from "@/lib/servicos-schema";
import { formatCurrency, maskCurrency } from "@/lib/formatters";

const defaultValues: ServicoFormValues = {
  nome: "",
  descricao: "",
  precoBase: 0,
};

export function ServicosForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServicoFormValues>({
    resolver: zodResolver(servicoFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const response = await fetch("/api/servicos", {
      method: "POST",
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

    reset(defaultValues);

    startTransition(() => {
      router.refresh();
    });
  });

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="nome">Nome do Serviço</Label>
        <Input
          id="nome"
          {...register("nome")}
          placeholder="Ex: Troca de Sola"
        />
        {errors.nome ? <p className="text-sm text-red-600">{errors.nome.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="precoBase">Preço Base (R$)</Label>
        <Input
          id="precoBase"
          type="text"
          {...register("precoBase")}
          onChange={(e) => {
            e.target.value = maskCurrency(e.target.value);
            register("precoBase").onChange(e);
          }}
          onBlur={(e) => {
            if (e.target.value) {
              e.target.value = formatCurrency(e.target.value);
              register("precoBase").onChange(e);
            }
            register("precoBase").onBlur(e);
          }}
          placeholder="R$ 0,00"
        />
        {errors.precoBase ? <p className="text-sm text-red-600">{errors.precoBase.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          {...register("descricao")}
          rows={3}
          placeholder="Detalhes adicionais sobre o serviço"
        />
      </div>

      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <Button
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Salvando..." : "Cadastrar Serviço"}
      </Button>
    </form>
  );
}
