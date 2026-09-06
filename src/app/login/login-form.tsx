"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button, Card, Input, Label } from "@/components/ui";
import { loginSchema, type LoginFormValues } from "@/lib/auth-schema";

const defaultValues: LoginFormValues = {
  email: "",
  senha: "",
};

export function LoginForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    let response: Response;

    try {
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
    } catch {
      setSubmitError("Não foi possível conectar ao servidor. Tente novamente.");
      return;
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setSubmitError(body?.message ?? "Não foi possível entrar. Tente novamente.");
      return;
    }

    startTransition(() => {
      router.replace("/dashboard");
      router.refresh();
    });
  });

  const carregando = isSubmitting || isPending;

  return (
    <Card className="p-6 sm:p-8">
      <form className="grid gap-4" onSubmit={onSubmit} noValidate>
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            {...register("email")}
            placeholder="usuario@exemplo.com"
          />
          {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            type="password"
            autoComplete="current-password"
            {...register("senha")}
            placeholder="Sua senha"
          />
          {errors.senha ? <p className="text-sm text-red-600">{errors.senha.message}</p> : null}
        </div>

        {submitError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </p>
        ) : null}

        <Button type="submit" isLoading={carregando}>
          Entrar
        </Button>
      </form>
    </Card>
  );
}
