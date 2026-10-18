import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import type { DashboardMetrics } from "@/lib/dashboard-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atendimentoRapido: { aggregate: vi.fn() },
    venda: { aggregate: vi.fn() },
    pagamento: { groupBy: vi.fn() },
    cliente: { count: vi.fn() },
    ordemServico: { aggregate: vi.fn(), count: vi.fn() },
    produto: { count: vi.fn() },
    formaPagamento: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/dashboard-service", () => ({ getDashboardMetrics: vi.fn() }));
vi.mock("@/lib/relatorio-estoque-service", () => ({
  getEstatisticasGlobaisEstoque: vi.fn(),
  getListaInsumosCriticos: vi.fn(),
}));
vi.mock("@/lib/caixa", () => ({ obterResumoCaixaAberto: vi.fn() }));
vi.mock("@/lib/configuracoes", () => ({ obterDadosEmpresa: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getDashboardMetrics } from "@/lib/dashboard-service";
import { getEstatisticasGlobaisEstoque, getListaInsumosCriticos } from "@/lib/relatorio-estoque-service";
import { obterResumoCaixaAberto } from "@/lib/caixa";
import { obterDadosEmpresa } from "@/lib/configuracoes";
import { calcularPeriodoAnterior, montarPayloadInsights } from "./insights-service";

function metricas(parcial: Partial<DashboardMetrics> = {}): DashboardMetrics {
  return {
    totalRecebido: 0,
    totalPendente: 0,
    osAbertas: 0,
    osEmAndamento: 0,
    osConcluidas: 0,
    osEntregues: 0,
    osPendentesPagamento: 0,
    osParcialmentePagas: 0,
    osPagas: 0,
    ticketMedio: 0,
    topServicos: [],
    topInsumos: [],
    recebimentosPorDia: null,
    ...parcial,
  };
}

describe("calcularPeriodoAnterior", () => {
  it("devolve o período imediatamente anterior com a mesma duração", () => {
    expect(calcularPeriodoAnterior("2026-10-01", "2026-10-31")).toEqual({ inicio: "2026-08-31", fim: "2026-09-30" });
    expect(calcularPeriodoAnterior("2026-03-01", "2026-03-01")).toEqual({ inicio: "2026-02-28", fim: "2026-02-28" });
    expect(calcularPeriodoAnterior("2026-01-01", "2026-01-07")).toEqual({ inicio: "2025-12-25", fim: "2025-12-31" });
  });
});

describe("montarPayloadInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(obterDadosEmpresa).mockResolvedValue({ nomeFantasia: "UPA do Tênis" } as never);
    vi.mocked(getDashboardMetrics).mockImplementation(async (inicio: string) =>
      inicio === "2026-10-01"
        ? metricas({
            totalRecebido: 1500.456,
            ticketMedio: 80,
            osAbertas: 3,
            topServicos: [{ id: "s1", nome: "Troca de sola", quantidade: 7 }],
            recebimentosPorDia: [{ dia: "2026-10-01", valor: 100 }],
          })
        : metricas({ totalRecebido: 1000 }),
    );
    vi.mocked(prisma.atendimentoRapido.aggregate).mockResolvedValue({
      _count: { id: 2 },
      _sum: { valorTotal: new Prisma.Decimal("70.5") },
    } as never);
    vi.mocked(prisma.venda.aggregate).mockResolvedValue({
      _count: { id: 1 },
      _sum: { valorTotal: null },
    } as never);
    vi.mocked(prisma.pagamento.groupBy).mockResolvedValue([
      { formaPagamentoId: "f1", _sum: { valor: new Prisma.Decimal(200) } },
      { formaPagamentoId: "f2", _sum: { valor: new Prisma.Decimal(900) } },
    ] as never);
    vi.mocked(prisma.cliente.count).mockResolvedValue(4);
    vi.mocked(prisma.formaPagamento.findMany).mockResolvedValue([
      { id: "f1", nome: "Dinheiro" },
      { id: "f2", nome: "Pix" },
    ] as never);
    vi.mocked(prisma.ordemServico.aggregate).mockResolvedValue({
      _count: { id: 5 },
      _sum: { saldo: new Prisma.Decimal("320.10") },
    } as never);
    vi.mocked(prisma.ordemServico.count).mockResolvedValue(6);
    vi.mocked(prisma.produto.count).mockResolvedValue(1);
    vi.mocked(obterResumoCaixaAberto).mockResolvedValue({
      id: "c1",
      dataAbertura: new Date("2026-10-18T11:00:00Z"),
    });
    vi.mocked(getEstatisticasGlobaisEstoque).mockResolvedValue({
      totalInsumosAtivos: 30,
      totalInsumosZerados: 2,
      totalInsumosAbaixoMinimo: 3,
      valorTotalEstimado: 1234.5,
    });
    vi.mocked(getListaInsumosCriticos).mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({
        id: `i${i}`,
        nome: `Insumo ${i}`,
        unidadeMedida: "un",
        quantidadeEstoque: 0,
        estoqueMinimo: 5,
        status: "ZERADO" as const,
      })),
    );
  });

  it("monta o payload com período atual, anterior e situação atual", async () => {
    const payload = await montarPayloadInsights(
      { inicio: "2026-10-01", fim: "2026-10-31" },
      new Date("2026-10-18T15:00:00Z"),
    );

    expect(getDashboardMetrics).toHaveBeenCalledWith("2026-10-01", "2026-10-31");
    expect(getDashboardMetrics).toHaveBeenCalledWith("2026-08-31", "2026-09-30");
    expect(payload.periodo).toEqual({ inicio: "2026-10-01", fim: "2026-10-31", dias: 31 });
    expect(payload.periodoAnterior).toEqual({ inicio: "2026-08-31", fim: "2026-09-30" });
    expect(payload.contexto).toMatchObject({ empresa: "UPA do Tênis", moeda: "BRL", dataReferencia: "2026-10-18" });

    expect(payload.atual.recebidoLiquido).toBe(1500.46);
    expect(payload.anterior.recebidoLiquido).toBe(1000);
    expect(payload.atual.servicosMaisExecutados).toEqual([{ nome: "Troca de sola", quantidade: 7 }]);
    expect(payload.atual.atendimentosRapidos).toEqual({ quantidade: 2, valorTotal: 70.5 });
    expect(payload.atual.vendasBalcao).toEqual({ quantidade: 1, valorTotal: 0 });
    expect(payload.atual.recebimentosPorFormaPagamento).toEqual([
      { forma: "Pix", valor: 900 },
      { forma: "Dinheiro", valor: 200 },
    ]);
    expect(payload.atual.novosClientes).toBe(4);
    expect(payload.recebimentosPorDia).toEqual([{ dia: "2026-10-01", valor: 100 }]);

    expect(payload.situacaoAtual.osAtrasadas).toEqual({ quantidade: 5, saldoEmAberto: 320.1 });
    expect(payload.situacaoAtual.osAguardandoRetirada).toBe(6);
    expect(payload.situacaoAtual.caixaAberto).toEqual({ aberto: true, abertoDesde: "2026-10-18" });
    expect(payload.situacaoAtual.estoqueInsumos.criticos).toHaveLength(10);
    expect(payload.situacaoAtual.produtosSemEstoque).toBe(1);
  });

  it("não envia identificadores internos", async () => {
    const payload = await montarPayloadInsights({ inicio: "2026-10-01", fim: "2026-10-31" });
    const json = JSON.stringify(payload);

    expect(json).not.toMatch(/"id"\s*:/);
    expect(json).not.toContain("formaPagamentoId");
  });
});
