import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  calcularResumoFinanceiroOS,
  calcularSaldo,
  calcularStatusFinanceiroDerivado,
  calcularValorPago,
  calcularValorTotalOS,
  normalizarDecimalParaNumero,
  normalizarValoresDecimalParaClient,
} from "@/lib/ordens-servico-financeiro";

describe("ordens-servico-financeiro", () => {
  describe("normalizarDecimalParaNumero", () => {
    it("normaliza Decimal, number e string com fallback", () => {
      expect(normalizarDecimalParaNumero(new Prisma.Decimal("10.239"))).toBe(10.24);
      expect(normalizarDecimalParaNumero(9.999)).toBe(10);
      expect(normalizarDecimalParaNumero("7,50")).toBe(7.5);
      expect(normalizarDecimalParaNumero("invalido", 2)).toBe(2);
      expect(normalizarDecimalParaNumero(undefined, 3)).toBe(3);
    });
  });

  describe("calcularValorTotalOS", () => {
    it("prioriza valorTotal persistido", () => {
      expect(
        calcularValorTotalOS({
          valorTotal: new Prisma.Decimal("120.50"),
          itens: [{ valor: new Prisma.Decimal("30") }],
        })
      ).toBe(120.5);
    });

    it("usa soma de servicos dos itens quando valorTotal e zero", () => {
      expect(
        calcularValorTotalOS({
          valorTotal: 0,
          itens: [
            {
              servicos: [
                { valor: new Prisma.Decimal("40") },
                { valor: 0, servico: { precoBase: new Prisma.Decimal("15") } },
              ],
            },
          ],
        })
      ).toBe(55);
    });

    it("usa soma dos itens quando nao ha servicos", () => {
      expect(
        calcularValorTotalOS({
          valorTotal: 0,
          itens: [{ valor: 12.3 }, { valor: 7.7 }],
        })
      ).toBe(20);
    });
  });

  describe("calcularValorPago", () => {
    it("retorna zero para OS sem pagamento", () => {
      expect(calcularValorPago({ valorPago: 0, valorSinal: 0, pagamentos: [] })).toBe(0);
    });

    it("considera valorSinal", () => {
      expect(calcularValorPago({ valorSinal: new Prisma.Decimal("25") })).toBe(25);
    });

    it("considera pagamentos registrados", () => {
      expect(
        calcularValorPago({
          pagamentos: [{ valor: new Prisma.Decimal("30") }, { valor: 20 }],
        })
      ).toBe(50);
    });

    it("mantem compatibilidade com valorPago legado", () => {
      expect(
        calcularValorPago({
          valorPago: new Prisma.Decimal("90"),
          valorSinal: 10,
          pagamentos: [{ valor: 15 }],
        })
      ).toBe(90);
    });
  });

  describe("calcularSaldo", () => {
    it("calcula saldo e zera sobrepagamento", () => {
      expect(calcularSaldo(100, 40)).toBe(60);
      expect(calcularSaldo(100, 140)).toBe(0);
    });
  });

  describe("calcularStatusFinanceiroDerivado", () => {
    it("retorna status por regra financeira", () => {
      expect(calcularStatusFinanceiroDerivado({ valorTotal: 100, valorPago: 0 })).toBe("PENDENTE");
      expect(calcularStatusFinanceiroDerivado({ valorTotal: 100, valorPago: 40 })).toBe("PARCIAL");
      expect(calcularStatusFinanceiroDerivado({ valorTotal: 100, valorPago: 100 })).toBe("PAGO");
      expect(calcularStatusFinanceiroDerivado({ valorTotal: 100, valorPago: 140 })).toBe("PAGO");
    });

    it("prioriza cancelamento operacional", () => {
      expect(
        calcularStatusFinanceiroDerivado({
          statusOperacional: "CANCELADA",
          valorTotal: 100,
          valorPago: 0,
        })
      ).toBe("CANCELADO");
    });
  });

  describe("calcularResumoFinanceiroOS", () => {
    it("resume OS sem pagamento", () => {
      const resumo = calcularResumoFinanceiroOS({
        valorTotal: 100,
        valorDesconto: 10,
        valorSinal: 0,
        valorPago: 0,
      });

      expect(resumo).toEqual({
        valorTotal: 100,
        valorDesconto: 10,
        valorSinal: 0,
        valorPago: 0,
        saldo: 100,
        statusFinanceiro: "PENDENTE",
      });
    });

    it("resume OS com pagamento parcial", () => {
      const resumo = calcularResumoFinanceiroOS({
        valorTotal: 100,
        valorSinal: 10,
        pagamentos: [{ valor: 20 }],
      });

      expect(resumo.valorPago).toBe(30);
      expect(resumo.saldo).toBe(70);
      expect(resumo.statusFinanceiro).toBe("PARCIAL");
    });

    it("resume OS totalmente paga", () => {
      const resumo = calcularResumoFinanceiroOS({
        valorTotal: 100,
        pagamentos: [{ valor: 100 }],
      });

      expect(resumo.valorPago).toBe(100);
      expect(resumo.saldo).toBe(0);
      expect(resumo.statusFinanceiro).toBe("PAGO");
    });

    it("resume OS com sobrepagamento sem credito nesta etapa", () => {
      const resumo = calcularResumoFinanceiroOS({
        valorTotal: 100,
        pagamentos: [{ valor: 120 }],
      });

      expect(resumo.valorPago).toBe(120);
      expect(resumo.saldo).toBe(0);
      expect(resumo.statusFinanceiro).toBe("PAGO");
    });

    it("resume OS cancelada", () => {
      const resumo = calcularResumoFinanceiroOS({
        statusOperacional: "CANCELADO",
        valorTotal: 100,
        pagamentos: [{ valor: 100 }],
      });

      expect(resumo.statusFinanceiro).toBe("CANCELADO");
    });

    it("mantem compatibilidade com OS antiga usando valorPago legado", () => {
      const resumo = calcularResumoFinanceiroOS({
        valorTotal: 100,
        valorPago: 80,
        pagamentos: [],
      });

      expect(resumo.valorPago).toBe(80);
      expect(resumo.saldo).toBe(20);
      expect(resumo.statusFinanceiro).toBe("PARCIAL");
    });
  });

  describe("normalizarValoresDecimalParaClient", () => {
    it("normaliza Date e Decimal para payload seguro no client", () => {
      const dataEntrada = new Date("2026-07-03T12:30:00.000Z");
      const payload = {
        valorTotal: new Prisma.Decimal("123.45"),
        createdAt: dataEntrada,
        itens: [{ valor: new Prisma.Decimal("10.00") }],
      };

      const normalizado = normalizarValoresDecimalParaClient(payload);

      expect(normalizado).toEqual({
        valorTotal: 123.45,
        createdAt: "2026-07-03T12:30:00.000Z",
        itens: [{ valor: 10 }],
      });
    });
  });
});
