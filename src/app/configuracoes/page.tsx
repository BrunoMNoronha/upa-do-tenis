import { AppShell } from "@/components/app-shell";
import { exigirSessao } from "@/lib/auth-server";
import { obterDadosEmpresa, obterLinkAvaliacaoGoogle } from "@/lib/configuracoes";
import { ConfiguracoesClient } from "./configuracoes-client";
import { DadosEmpresaForm } from "./dados-empresa-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Configurações",
  description: "Parâmetros operacionais e preferências do sistema.",
};

export default async function ConfiguracoesPage() {
  await exigirSessao();

  const [linkAvaliacaoGoogle, dadosEmpresa] = await Promise.all([
    obterLinkAvaliacaoGoogle(),
    obterDadosEmpresa(),
  ]);

  return (
    <AppShell
      eyebrow="Administração"
      title="Configurações"
      description="Gerencie os parâmetros operacionais e integrações da sapataria."
    >
      <div className="space-y-6">
        <DadosEmpresaForm dadosIniciais={dadosEmpresa} />
        <ConfiguracoesClient linkInicial={linkAvaliacaoGoogle} nomeEmpresa={dadosEmpresa.nomeFantasia} />
      </div>
    </AppShell>
  );
}
