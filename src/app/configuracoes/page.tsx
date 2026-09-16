import { AppShell } from "@/components/app-shell";
import { exigirSessao } from "@/lib/auth-server";
import { obterLinkAvaliacaoGoogle } from "@/lib/configuracoes";
import { ConfiguracoesClient } from "./configuracoes-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Configurações | UPA do Tênis",
  description: "Parâmetros operacionais e preferências do sistema.",
};

export default async function ConfiguracoesPage() {
  await exigirSessao();

  const linkAvaliacaoGoogle = await obterLinkAvaliacaoGoogle();

  return (
    <AppShell
      eyebrow="Administração"
      title="Configurações"
      description="Gerencie os parâmetros operacionais e integrações da sapataria."
    >
      <ConfiguracoesClient linkInicial={linkAvaliacaoGoogle} />
    </AppShell>
  );
}
