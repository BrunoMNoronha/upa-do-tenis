import { AppShell } from "@/components/app-shell";
import { exigirSessao } from "@/lib/auth-server";
import {
  obterDadosEmpresaComCache as obterDadosEmpresa,
  obterLinkAvaliacaoGoogleComCache as obterLinkAvaliacaoGoogle,
} from "@/lib/dados-cache";
import { obterStatusChaveClaude } from "@/lib/insights-config";
import { ConfiguracaoClaudeClient } from "./configuracao-claude-client";
import { ConfiguracoesClient } from "./configuracoes-client";
import { DadosEmpresaForm } from "./dados-empresa-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Configurações",
  description: "Parâmetros operacionais e preferências do sistema.",
};

export default async function ConfiguracoesPage() {
  const sessao = await exigirSessao();

  const [linkAvaliacaoGoogle, dadosEmpresa, statusChaveClaude] = await Promise.all([
    obterLinkAvaliacaoGoogle(),
    obterDadosEmpresa(),
    obterStatusChaveClaude(),
  ]);

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      usuario={sessao}
      eyebrow="Administração"
      title="Configurações"
      description="Gerencie os parâmetros operacionais e integrações da sapataria."
    >
      <div className="space-y-6">
        <DadosEmpresaForm dadosIniciais={dadosEmpresa} />
        <ConfiguracoesClient linkInicial={linkAvaliacaoGoogle} nomeEmpresa={dadosEmpresa.nomeFantasia} />
        <ConfiguracaoClaudeClient statusInicial={statusChaveClaude} />
      </div>
    </AppShell>
  );
}
