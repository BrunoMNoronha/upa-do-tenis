import { redirect } from "next/navigation";

import { obterUsuarioSessao } from "@/lib/auth-server";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Login | UPA do Tênis",
  description: "Acesso ao sistema da Sapataria Alves.",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const usuario = await obterUsuarioSessao();

  if (usuario) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[color:var(--background)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-strong)]">
            UPA do Tênis
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--text)]">
            Sapataria Alves
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Informe suas credenciais para acessar o sistema.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
