import { describe, expect, it } from "vitest";

import { deveExibirReceberPagamento, formatarStatus, percentualPago } from "./utils";

describe("deveExibirReceberPagamento (detalhe da OS)", () => {
  it("exibe a ação para OS sem pagamentos (saldo integral pendente)", () => {
    expect(deveExibirReceberPagamento({ saldo: 150 })).toBe(true);
  });

  it("exibe a ação para OS parcialmente paga (saldo maior que zero)", () => {
    expect(deveExibirReceberPagamento({ saldo: 50 })).toBe(true);
    expect(deveExibirReceberPagamento({ saldo: 0.01 })).toBe(true);
  });

  it("oculta a ação para OS integralmente quitada (saldo zero)", () => {
    expect(deveExibirReceberPagamento({ saldo: 0 })).toBe(false);
  });

  it("não trata dado ausente ou inválido como saldo quitado", () => {
    expect(deveExibirReceberPagamento(undefined)).toBe(true);
    expect(deveExibirReceberPagamento(null)).toBe(true);
    expect(deveExibirReceberPagamento({ saldo: undefined as unknown as number })).toBe(true);
    expect(deveExibirReceberPagamento({ saldo: Number.NaN })).toBe(true);
    expect(deveExibirReceberPagamento({ saldo: "0" as unknown as number })).toBe(true);
  });

  it("oculta a ação para OS cancelada, mesmo com saldo (#229)", () => {
    expect(deveExibirReceberPagamento({ saldo: 100, statusFinanceiro: "CANCELADO" })).toBe(false);
    expect(deveExibirReceberPagamento({ saldo: 100, statusFinanceiro: "PENDENTE" })).toBe(true);
  });
});

describe("formatarStatus e percentualPago", () => {
  it("rotula status com acentuação", () => {
    expect(formatarStatus("CONCLUIDA")).toBe("Concluída");
    expect(formatarStatus("EM_ANDAMENTO")).toBe("Em andamento");
    expect(formatarStatus("PARCIAL")).toBe("Parcial");
    expect(formatarStatus("OUTRO_VALOR")).toBe("Outro Valor");
  });

  it("calcula o percentual pago limitado a 0–100", () => {
    expect(percentualPago(45, 95)).toBe(47);
    expect(percentualPago(95, 95)).toBe(100);
    expect(percentualPago(120, 95)).toBe(100);
    expect(percentualPago(10, 0)).toBe(0);
    expect(percentualPago(Number.NaN, 95)).toBe(0);
  });
});
