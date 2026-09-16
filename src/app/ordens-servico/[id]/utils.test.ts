import { describe, expect, it } from "vitest";

import { deveExibirReceberPagamento } from "./utils";

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
});
