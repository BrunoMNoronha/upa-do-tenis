import { DashboardAlertaCaixaView } from "@/components/dashboard/DashboardAlertaCaixa";
import { DashboardAlertasEstoqueView } from "@/components/dashboard/DashboardAlertasEstoque";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { Periodo } from "@/components/dashboard/dashboard-period-presets";
import { obterResumoCaixaAberto } from "@/lib/caixa";
import { classificarEstadoCaixa } from "@/lib/caixa-alerta";
import { getDashboardMetrics } from "@/lib/dashboard-service";
import { dataOperacionalHoje } from "@/lib/date-range";
import { getResumoAlertasEstoque } from "@/lib/relatorio-estoque-service";

/**
 * Período da primeira renderização: mês atual no fuso da operação, do dia 1
 * até hoje. É o mesmo padrão de GET /api/dashboard sem parâmetros.
 */
export function periodoInicialDashboard(referencia: Date = new Date()): Periodo {
  const hoje = dataOperacionalHoje(referencia);
  return { inicio: `${hoje.slice(0, 7)}-01`, fim: hoje };
}

// Os blocos abaixo consultam no servidor o que antes era buscado no cliente
// após a hidratação. Cada um trata a própria falha para manter o estado de
// erro local do bloco, sem derrubar a página inteira.

export async function AlertaCaixaInicial() {
  try {
    const alerta = classificarEstadoCaixa(await obterResumoCaixaAberto());
    return <DashboardAlertaCaixaView situacao={{ tipo: "pronto", alerta }} />;
  } catch (error) {
    console.error("Erro ao obter alerta de caixa:", error);
    return <DashboardAlertaCaixaView situacao={{ tipo: "erro" }} />;
  }
}

export async function AlertasEstoqueInicial() {
  try {
    const alertas = await getResumoAlertasEstoque();
    return <DashboardAlertasEstoqueView situacao={{ tipo: "pronto", alertas }} />;
  } catch (error) {
    console.error("Erro ao buscar alertas de estoque:", error);
    return <DashboardAlertasEstoqueView situacao={{ tipo: "erro" }} />;
  }
}

export async function MetricasIniciais({ periodo }: { periodo: Periodo }) {
  try {
    const metricas = await getDashboardMetrics(periodo.inicio, periodo.fim);
    return <DashboardClient periodoInicial={periodo} metricasIniciais={metricas} />;
  } catch (error) {
    console.error("Erro ao buscar métricas do dashboard:", error);
    return <DashboardClient periodoInicial={periodo} erroInicial="Falha ao buscar dados do dashboard." />;
  }
}
