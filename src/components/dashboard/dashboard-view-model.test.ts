import { describe, expect, it } from "vitest";
import type { DashboardMetrics } from "@/lib/dashboard-service";
import { montarDashboardViewModel, percentualInteiro } from "./dashboard-view-model";

const base: DashboardMetrics = {
  totalRecebido: 1864,
  totalPendente: 421.5,
  osAbertas: 3,
  osEmAndamento: 5,
  osConcluidas: 4,
  osEntregues: 8,
  osPendentesPagamento: 3,
  osParcialmentePagas: 4,
  osPagas: 13,
  ticketMedio: 86.3,
  topServicos: [
    { id: "s2", nome: "Lavagem", quantidade: 8 },
    { id: "s1", nome: "Troca de sola", quantidade: 16 },
    { id: "s3", nome: "Colagem", quantidade: 4 },
  ],
  topInsumos: [{ id: "i1", nome: "Cola (ml)", quantidade: 250 }],
  recebimentosPorDia: [],
};

const zerado: DashboardMetrics = {
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
  recebimentosPorDia: [],
};

describe("dashboard-view-model", () => {
  describe("percentualInteiro", () => {
    it("arredonda para inteiro", () => {
      expect(percentualInteiro(1, 3)).toBe(33);
      expect(percentualInteiro(2, 3)).toBe(67);
      expect(percentualInteiro(5, 5)).toBe(100);
    });

    it("retorna zero com total zero, negativo ou inválido", () => {
      expect(percentualInteiro(3, 0)).toBe(0);
      expect(percentualInteiro(3, -1)).toBe(0);
      expect(percentualInteiro(3, Number.NaN)).toBe(0);
      expect(percentualInteiro(Number.NaN, 3)).toBe(0);
    });
  });

  describe("montarDashboardViewModel", () => {
    it("soma apenas os quatro status operacionais em OS ativas", () => {
      const vm = montarDashboardViewModel(base);
      expect(vm.totalOrdensAtivas).toBe(20);
    });

    it("monta a fila com percentuais e links preservados", () => {
      const vm = montarDashboardViewModel(base);

      expect(vm.fila.map((item) => item.id)).toEqual(["ABERTA", "EM_ANDAMENTO", "CONCLUIDA", "ENTREGUE"]);
      expect(vm.fila.map((item) => item.quantidade)).toEqual([3, 5, 4, 8]);
      expect(vm.fila.map((item) => item.percentual)).toEqual([15, 25, 20, 40]);
      expect(vm.fila.map((item) => item.href)).toEqual([
        "/ordens-servico?statusOp=ABERTA",
        "/ordens-servico?statusOp=EM_ANDAMENTO",
        "/ordens-servico?statusOp=CONCLUIDA",
        "/ordens-servico?statusOp=ENTREGUE",
      ]);
    });

    it("calcula situação financeira, percentual de pagas e OS com saldo", () => {
      const vm = montarDashboardViewModel(base);

      expect(vm.totalOrdensFinanceiras).toBe(20);
      expect(vm.percentualPagas).toBe(65);
      expect(vm.ordensComSaldo).toBe(7);
      expect(vm.situacaoFinanceira.map((item) => [item.id, item.quantidade, item.percentual])).toEqual([
        ["PAGAS", 13, 65],
        ["PARCIAIS", 4, 20],
        ["PENDENTES", 3, 15],
      ]);
      expect(vm.situacaoFinanceira.map((item) => item.href)).toEqual([
        "/ordens-servico?statusFin=PAGAS",
        "/ordens-servico?statusFin=PARCIAIS",
        "/ordens-servico?statusFin=PENDENTES",
      ]);
    });

    it("ordena rankings e normaliza a barra pelo maior item", () => {
      const vm = montarDashboardViewModel(base);

      expect(vm.servicos.map((item) => item.nome)).toEqual(["Troca de sola", "Lavagem", "Colagem"]);
      expect(vm.servicos.map((item) => item.proporcao)).toEqual([100, 50, 25]);
      expect(vm.insumos[0]).toMatchObject({ nome: "Cola (ml)", quantidade: 250, proporcao: 100 });
    });

    it("não altera os valores financeiros recebidos da API", () => {
      const vm = montarDashboardViewModel(base);

      expect(vm.totalRecebido).toBe(1864);
      expect(vm.totalPendente).toBe(421.5);
      expect(vm.ticketMedio).toBe(86.3);
    });

    it("período sem dados → percentuais zero e estado vazio", () => {
      const vm = montarDashboardViewModel(zerado);

      expect(vm.vazio).toBe(true);
      expect(vm.totalOrdensAtivas).toBe(0);
      expect(vm.percentualPagas).toBe(0);
      expect(vm.fila.every((item) => item.percentual === 0)).toBe(true);
      expect(vm.situacaoFinanceira.every((item) => item.percentual === 0)).toBe(true);
      expect(vm.servicos).toEqual([]);
    });

    it("não é vazio quando existe qualquer métrica", () => {
      expect(montarDashboardViewModel({ ...zerado, totalRecebido: 10 }).vazio).toBe(false);
      expect(montarDashboardViewModel({ ...zerado, osAbertas: 1 }).vazio).toBe(false);
    });
  });
});
