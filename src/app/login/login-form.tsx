"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button, Card, Input, Label } from "@/components/ui";
import { loginSchema, type LoginFormValues } from "@/lib/auth-schema";
import { CAPTCHA_ACAO_LOGIN } from "@/lib/captcha";

const defaultValues: LoginFormValues = {
  email: "",
  senha: "",
};

type LoginFormProps = {
  /** Site key do reCAPTCHA v3; `null` desliga o captcha no cliente. */
  captchaSiteKey: string | null;
};

/**
 * Obtém o token do reCAPTCHA v3 para a ação de login.
 *
 * Retorna `undefined` quando o script não carregou ou o Google falhou: o
 * envio segue sem token e o servidor decide (recusa com 403 se o captcha
 * estiver ativo). Travar o formulário aqui só esconderia o erro real.
 */
async function obterTokenCaptcha(siteKey: string): Promise<string | undefined> {
  const grecaptcha = window.grecaptcha;

  if (!grecaptcha) {
    return undefined;
  }

  try {
    await new Promise<void>((resolve) => grecaptcha.ready(resolve));

    return await grecaptcha.execute(siteKey, { action: CAPTCHA_ACAO_LOGIN });
  } catch {
    return undefined;
  }
}

export function LoginForm({ captchaSiteKey }: LoginFormProps) {
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

    const captchaToken = captchaSiteKey ? await obterTokenCaptcha(captchaSiteKey) : undefined;

    let response: Response;

    try {
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...values, captchaToken }),
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
      {captchaSiteKey ? (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(captchaSiteKey)}`}
          strategy="afterInteractive"
        />
      ) : null}

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

        {captchaSiteKey ? (
          // Texto exigido pelos termos do reCAPTCHA quando o badge é ocultado
          // (ver .grecaptcha-badge em globals.css).
          <p className="text-center text-xs text-slate-500">
            Protegido por reCAPTCHA. Aplicam-se a{" "}
            <a
              className="underline"
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
            >
              Política de Privacidade
            </a>{" "}
            e os{" "}
            <a
              className="underline"
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noreferrer"
            >
              Termos de Serviço
            </a>{" "}
            do Google.
          </p>
        ) : null}
      </form>
    </Card>
  );
}
