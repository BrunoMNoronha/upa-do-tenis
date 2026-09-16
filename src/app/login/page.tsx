import { redirect } from "next/navigation";

import { obterUsuarioSessao } from "@/lib/auth-server";
import { obterConfigCaptcha } from "@/lib/captcha";
import { obterDadosEmpresa } from "@/lib/configuracoes";
import { nomeExibicaoEmpresa } from "@/lib/dados-empresa";
import { LoginForm } from "./login-form";

export async function generateMetadata() {
  const dados = await obterDadosEmpresa();
  return { title: `Login | ${dados.nomeFantasia}`, description: `Acesso ao sistema de ${nomeExibicaoEmpresa(dados)}.` };
}

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const usuario = await obterUsuarioSessao();

  if (usuario) {
    redirect("/dashboard");
  }

  // A site key é pública por natureza, mas chega como prop desta página
  // (force-dynamic) em vez de NEXT_PUBLIC_*: Preview e Production podem usar
  // chaves diferentes sem rebuild, e o projeto segue sem variáveis inlinadas.
  const [{ ativo, siteKey }, dadosEmpresa] = await Promise.all([
    Promise.resolve(obterConfigCaptcha()),
    obterDadosEmpresa(),
  ]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[color:var(--background)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-strong)]">
            {dadosEmpresa.nomeFantasia}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--text)]">
            {dadosEmpresa.nomeComplementar ?? dadosEmpresa.nomeFantasia}
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Informe suas credenciais para acessar o sistema.
          </p>
        </div>

        <LoginForm captchaSiteKey={ativo ? siteKey : null} />
      </div>
    </main>
  );
}
