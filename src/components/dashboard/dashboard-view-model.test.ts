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

  describe("recebimentosPorDia", () => {
    const serie = [
      { dia: "2026-09-15", valor: 0 },
      { dia: "2026-09-16", valor: 200 },
      { dia: "2026-09-17", valor: 50 },
    ];

    it("gera rótulos, proporção pelo maior dia e melhor dia", () => {
      const vm = montarDashboardViewModel({ ...base, recebimentosPorDia: serie }).recebimentosPorDia;
      expect(vm.disponivel).toBe(true);
      if (!vm.disponivel) return;
      expect(vm.dias.map((d) => [d.rotuloCurto, d.rotuloCompleto, d.proporcao])).toEqual([
        ["15/09", "ter., 15/09", 0],
        ["16/09", "qua., 16/09", 100],
        ["17/09", "qui., 17/09", 25],
      ]);
      expect(vm.melhorDia?.dia).toBe("2026-09-16");
      expect(vm.diasComRecebimento).toBe(2);
    });

    it("dias da semana não dependem do fuso do processo", () => {
      const tzOriginal = process.env.TZ;
      try {
        for (const tz of ["UTC", "America/Sao_Paulo", "Asia/Tokyo"]) {
          process.env.TZ = tz;
          const vm = montarDashboardViewModel({ ...base, recebimentosPorDia: serie }).recebimentosPorDia;
          expect(vm.disponivel && vm.dias[1].rotuloCompleto).toBe("qua., 16/09");
        }
      } finally {
        if (tzOriginal === undefined) delete process.env.TZ;
        else process.env.TZ = tzOriginal;
      }
    });

    it("sem recebimentos → melhor dia nulo e proporções zeradas", () => {
      const vm = montarDashboardViewModel({ ...zerado, recebimentosPorDia: [{ dia: "2026-09-16", valor: 0 }] }).recebimentosPorDia;
      expect(vm).toMatchObject({ disponivel: true, melhorDia: null, diasComRecebimento: 0 });
      expect(vm.disponivel && vm.dias[0].proporcao).toBe(0);
    });

    it("dia negativo (estorno, #230): mesma escala para as duas áreas e melhor dia só entre positivos", () => {
      const vm = montarDashboardViewModel({
        ...base,
        recebimentosPorDia: [
          { dia: "2026-09-10", valor: 300 },
          { dia: "2026-09-11", valor: 0 },
          { dia: "2026-09-12", valor: -100 },
        ],
      }).recebimentosPorDia;
      expect(vm.disponivel).toBe(true);
      if (!vm.disponivel) return;
      expect(vm.dias.map((d) => d.proporcao)).toEqual([75, 0, 25]);
      expect(vm.alturaAreaPositiva).toBe(75);
      expect(vm.melhorDia?.dia).toBe("2026-09-10");
      expect(vm.diasComRecebimento).toBe(1);
    });

    it("valor muito menor de um lado ainda reserva a altura mínima da área (sem transbordar)", () => {
      const pequenoPositivo = montarDashboardViewModel({
        ...base,
        recebimentosPorDia: [
          { dia: "2026-09-10", valor: 0.01 },
          { dia: "2026-09-11", valor: -100 },
        ],
      }).recebimentosPorDia;
      expect(pequenoPositivo.disponivel && pequenoPositivo.alturaAreaPositiva).toBe(2);

      const pequenoNegativo = montarDashboardViewModel({
        ...base,
        recebimentosPorDia: [
          { dia: "2026-09-10", valor: 100 },
          { dia: "2026-09-11", valor: -0.01 },
        ],
      }).recebimentosPorDia;
      expect(pequenoNegativo.disponivel && pequenoNegativo.alturaAreaPositiva).toBe(98);

      const soNegativo = montarDashboardViewModel({ ...base, recebimentosPorDia: [{ dia: "2026-09-11", valor: -50 }] })
        .recebimentosPorDia;
      expect(soNegativo.disponivel && soNegativo.alturaAreaPositiva).toBe(0);
    });

    it("sem dia negativo a área positiva ocupa o gráfico inteiro", () => {
      const vm = montarDashboardViewModel({ ...base, recebimentosPorDia: serie }).recebimentosPorDia;
      expect(vm.disponivel && vm.alturaAreaPositiva).toBe(100);
    });

    it("null (período acima do limite) ou campo ausente → indisponível", () => {
      expect(montarDashboardViewModel({ ...base, recebimentosPorDia: null }).recebimentosPorDia).toEqual({ disponivel: false });
      const { recebimentosPorDia: _omitido, ...semCampo } = base;
      expect(montarDashboardViewModel(semCampo as DashboardMetrics).recebimentosPorDia).toEqual({ disponivel: false });
    });
  });
});
