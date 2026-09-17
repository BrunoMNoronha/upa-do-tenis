import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { DashboardMetrics } from "@/lib/dashboard-service";
import { DashboardFilaOrdens } from "./DashboardFilaOrdens";
import { DashboardInsumosMaisUtilizados } from "./DashboardInsumosMaisUtilizados";
import { DashboardServicosMaisExecutados } from "./DashboardServicosMaisExecutados";
import { DashboardSituacaoFinanceira } from "./DashboardSituacaoFinanceira";
import { montarDashboardViewModel } from "./dashboard-view-model";

const metrics: DashboardMetrics = {
  totalRecebido: 360,
  totalPendente: 210,
  osAbertas: 1,
  osEmAndamento: 2,
  osConcluidas: 1,
  osEntregues: 2,
  osPendentesPagamento: 2,
  osParcialmentePagas: 1,
  osPagas: 3,
  ticketMedio: 95,
  topServicos: [
    { id: "s1", nome: "Troca de sola", quantidade: 4 },
    { id: "s2", nome: "Lavagem de tênis", quantidade: 2 },
  ],
  topInsumos: [{ id: "i1", nome: "Cola de sapateiro (ml)", quantidade: 85.5 }],
  recebimentosPorDia: [],
};

const zerado: DashboardMetrics = {
  ...metrics,
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
};

const vm = montarDashboardViewModel(metrics);
const vmVazio = montarDashboardViewModel(zerado);

describe("DashboardFilaOrdens", () => {
  const html = renderToStaticMarkup(createElement(DashboardFilaOrdens, { fila: vm.fila, total: vm.totalOrdensAtivas }));

  it("preserva os links filtrados por status e o link de atrasadas sem número", () => {
    expect(html).toContain('href="/ordens-servico?statusOp=ABERTA"');
    expect(html).toContain('href="/ordens-servico?statusOp=EM_ANDAMENTO"');
    expect(html).toContain('href="/ordens-servico?statusOp=CONCLUIDA"');
    expect(html).toContain('href="/ordens-servico?statusOp=ENTREGUE"');
    expect(html).toContain('href="/ordens-servico?atrasadas=true"');
    expect(html).toContain('href="/ordens-servico"');
    expect(html).toContain("Ver OS atrasadas");
    expect(html).not.toMatch(/\d+ OS atrasadas/);
  });

  it("expõe resumo textual acessível da barra segmentada", () => {
    expect(html).toContain('role="img"');
    expect(html).toContain("Abertas: 1 (17%)");
    expect(html).toContain("Entregues: 2 (33%)");
  });

  it("período vazio → barra sem segmentos e mensagem curta", () => {
    const vazio = renderToStaticMarkup(createElement(DashboardFilaOrdens, { fila: vmVazio.fila, total: 0 }));
    expect(vazio).toContain("Nenhuma ordem de serviço entrou no período.");
    expect(vazio).not.toContain("width:");
  });
});

describe("DashboardSituacaoFinanceira", () => {
  const html = renderToStaticMarkup(
    createElement(DashboardSituacaoFinanceira, {
      itens: vm.situacaoFinanceira,
      total: vm.totalOrdensFinanceiras,
      percentualPagas: vm.percentualPagas,
      totalPendente: vm.totalPendente,
    })
  );

  it("mostra percentual de pagas, legenda com quantidades e saldo em aberto", () => {
    expect(html).toContain("50%");
    expect(html).toContain("Pagas");
    expect(html).toContain("Parcialmente pagas");
    expect(html).toContain("Sem pagamento");
    expect(html).toContain("Saldo em aberto");
    expect(html).toContain("210,00");
  });

  it("legenda continua sendo link para a lista filtrada", () => {
    expect(html).toContain('href="/ordens-servico?statusFin=PAGAS"');
    expect(html).toContain('href="/ordens-servico?statusFin=PARCIAIS"');
    expect(html).toContain('href="/ordens-servico?statusFin=PENDENTES"');
    expect(html).toContain('href="/relatorios/financeiro-os"');
  });

  it("donut tem resumo textual e um segmento por status com quantidade", () => {
    expect(html).toContain("50% pagas. Pagas: 3, Parcialmente pagas: 1, Sem pagamento: 2.");
    expect((html.match(/stroke-dasharray/g) ?? []).length).toBe(3);
  });

  it("sem OS → nenhum segmento e mensagem de vazio", () => {
    const vazio = renderToStaticMarkup(
      createElement(DashboardSituacaoFinanceira, {
        itens: vmVazio.situacaoFinanceira,
        total: 0,
        percentualPagas: 0,
        totalPendente: 0,
      })
    );
    expect(vazio).not.toContain("stroke-dasharray");
    expect(vazio).toContain("Nenhuma OS com valor no período.");
    expect(vazio).toContain("0%");
  });
});

describe("DashboardServicosMaisExecutados", () => {
  it("usa o maior item como 100% e os demais proporcionais", () => {
    const html = renderToStaticMarkup(createElement(DashboardServicosMaisExecutados, { servicos: vm.servicos }));
    expect(html).toContain("Troca de sola");
    expect(html).toContain("width:100%");
    expect(html).toContain("width:50%");
  });

  it("estado vazio", () => {
    const html = renderToStaticMarkup(createElement(DashboardServicosMaisExecutados, { servicos: [] }));
    expect(html).toContain("Nenhum serviço registrado no período.");
  });
});

describe("DashboardInsumosMaisUtilizados", () => {
  it("mostra posição, nome com unidade, quantidade formatada e link do relatório", () => {
    const html = renderToStaticMarkup(createElement(DashboardInsumosMaisUtilizados, { insumos: vm.insumos }));
    expect(html).toContain("Cola de sapateiro (ml)");
    expect(html).toContain("85,5");
    expect(html).toContain('href="/relatorios/estoque"');
    expect(html).not.toContain("baixo");
  });

  it("estado vazio", () => {
    const html = renderToStaticMarkup(createElement(DashboardInsumosMaisUtilizados, { insumos: [] }));
    expect(html).toContain("Nenhum insumo registrado no período.");
  });
});
