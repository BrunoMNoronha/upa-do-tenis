import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({ exigirSessao: vi.fn().mockResolvedValue({ nome: "Ana" }) }));
vi.mock("@/lib/dados-cache", () => ({
  obterDadosEmpresaComCache: vi.fn().mockResolvedValue({ nomeFantasia: "UPA do Tênis", nomeComplementar: null }),
}));
vi.mock("@/lib/dashboard-service", () => ({ getDashboardMetrics: vi.fn() }));
vi.mock("@/lib/caixa", () => ({ obterResumoCaixaAberto: vi.fn() }));
vi.mock("@/lib/relatorio-estoque-service", () => ({ getResumoAlertasEstoque: vi.fn() }));
vi.mock("@/components/app-shell", () => ({ AppShell: () => null }));
vi.mock("@/components/dashboard/DashboardClient", () => ({ DashboardClient: () => null }));

import Page from "./page";
import {
  AlertaCaixaInicial,
  AlertasEstoqueInicial,
  MetricasIniciais,
  periodoInicialDashboard,
} from "./dashboard-dados-iniciais";
import { obterResumoCaixaAberto } from "@/lib/caixa";
import { getDashboardMetrics } from "@/lib/dashboard-service";
import { getResumoAlertasEstoque } from "@/lib/relatorio-estoque-service";

const PERIODO = { inicio: "2026-10-01", fim: "2026-10-05" };

describe("dados iniciais do Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("calcula o mês atual no fuso da operação, e não no do processo", () => {
    // 01:30 UTC do dia 1º de novembro ainda é 31 de outubro em São Paulo.
    expect(periodoInicialDashboard(new Date("2026-11-01T01:30:00Z"))).toEqual({
      inicio: "2026-10-01",
      fim: "2026-10-31",
    });
    expect(periodoInicialDashboard(new Date("2026-11-01T03:00:00Z"))).toEqual({
      inicio: "2026-11-01",
      fim: "2026-11-01",
    });
  });

  it("a página entrega o shell sem aguardar as consultas do Dashboard", async () => {
    const pagina = await Page();

    expect(pagina.props.dadosEmpresa).toEqual({ nomeFantasia: "UPA do Tênis", nomeComplementar: null });
    expect(vi.mocked(getDashboardMetrics)).not.toHaveBeenCalled();
    expect(vi.mocked(obterResumoCaixaAberto)).not.toHaveBeenCalled();
    expect(vi.mocked(getResumoAlertasEstoque)).not.toHaveBeenCalled();
  });

  it("envia ao cliente as métricas do período inicial já consultadas", async () => {
    const metricas = { totalRecebido: 100 };
    vi.mocked(getDashboardMetrics).mockResolvedValue(metricas as never);

    const cliente = (await MetricasIniciais({ periodo: PERIODO })) as ReactElement;

    expect(vi.mocked(getDashboardMetrics)).toHaveBeenCalledExactlyOnceWith("2026-10-01", "2026-10-05");
    expect(cliente.props).toEqual({ periodoInicial: PERIODO, metricasIniciais: metricas });
  });

  it("falha nas métricas vira erro do bloco, com o período preservado para nova tentativa", async () => {
    vi.mocked(getDashboardMetrics).mockRejectedValue(new Error("banco fora"));

    const cliente = (await MetricasIniciais({ periodo: PERIODO })) as ReactElement;

    expect(cliente.props).toEqual({ periodoInicial: PERIODO, erroInicial: "Falha ao buscar dados do dashboard." });
  });

  it("alerta de caixa sai pronto do servidor e degrada para erro local", async () => {
    vi.mocked(obterResumoCaixaAberto).mockResolvedValue(null);
    const pronto = (await AlertaCaixaInicial()) as ReactElement;
    expect(pronto.props.situacao).toMatchObject({ tipo: "pronto", alerta: { estado: "FECHADO" } });

    vi.mocked(obterResumoCaixaAberto).mockRejectedValue(new Error("banco fora"));
    const erro = (await AlertaCaixaInicial()) as ReactElement;
    expect(erro.props.situacao).toEqual({ tipo: "erro" });
  });

  it("alertas de estoque saem prontos do servidor e degradam para erro local", async () => {
    const alertas = { totalInsumosZerados: 1, totalInsumosAbaixoMinimo: 2, totalCriticos: 3 };
    vi.mocked(getResumoAlertasEstoque).mockResolvedValue(alertas);
    const pronto = (await AlertasEstoqueInicial()) as ReactElement;
    expect(pronto.props.situacao).toEqual({ tipo: "pronto", alertas });

    vi.mocked(getResumoAlertasEstoque).mockRejectedValue(new Error("banco fora"));
    const erro = (await AlertasEstoqueInicial()) as ReactElement;
    expect(erro.props.situacao).toEqual({ tipo: "erro" });
  });
});
