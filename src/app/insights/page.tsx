import { AppShell } from "@/components/app-shell";
import { exigirSessao } from "@/lib/auth-server";
import { obterDadosEmpresaComCache as obterDadosEmpresa } from "@/lib/dados-cache";
import { dataOperacionalHoje } from "@/lib/date-range";
import { obterStatusChaveClaude } from "@/lib/insights-config";
import { InsightsClient } from "./insights-client";

export const metadata = {
  title: "Insights de Negócio",
  description: "Análises de negócio geradas por IA a partir dos dados do sistema.",
};

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const sessao = await exigirSessao();

  const [dadosEmpresa, statusChave] = await Promise.all([obterDadosEmpresa(), obterStatusChaveClaude()]);
  const hoje = dataOperacionalHoje();

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      usuario={sessao}
      eyebrow="Visão geral"
      title="Insights de Negócio"
      description={`Análises geradas por IA sobre o desempenho financeiro, operacional e de estoque de ${dadosEmpresa.nomeFantasia}.`}
    >
      <InsightsClient
        periodoInicial={{ inicio: `${hoje.slice(0, 7)}-01`, fim: hoje }}
        chaveConfigurada={statusChave.configurada}
      />
    </AppShell>
  );
}
