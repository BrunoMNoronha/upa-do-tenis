"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button, Input, Label, Textarea } from "@/components/ui";
import { clienteFormSchema, type ClienteFormValues } from "@/lib/clientes-schema";
import { formatPhone, formatCPFCNPJ } from "@/lib/formatters";

const defaultValues: ClienteFormValues = {
  nome: "",
  telefone: "",
  email: "",
  cpfCnpj: "",
  observacoes: "",
};

export function ClientesForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const response = await fetch("/api/clientes", {
      method: "POST",
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
          placeholder="Nome do cliente"
        />
        {errors.nome ? <p className="text-sm text-red-600">{errors.nome.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="telefone">Telefone</Label>
        <Input
          id="telefone"
          {...register("telefone")}
          onChange={(e) => {
            e.target.value = formatPhone(e.target.value);
            register("telefone").onChange(e);
          }}
          placeholder="(11) 99999-9999"
        />
        {errors.telefone ? <p className="text-sm text-red-600">{errors.telefone.message}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            {...register("email")}
            placeholder="cliente@exemplo.com"
          />
          {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
          <Input
            id="cpfCnpj"
            {...register("cpfCnpj")}
            onChange={(e) => {
              e.target.value = formatCPFCNPJ(e.target.value);
              register("cpfCnpj").onChange(e);
            }}
            placeholder="Opcional"
          />
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

      <Button
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Salvando..." : "Cadastrar cliente"}
      </Button>
    </form>
  );
}