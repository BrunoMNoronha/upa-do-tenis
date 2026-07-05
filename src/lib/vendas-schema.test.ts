import { describe, expect, it } from "vitest";

import { registrarVendaBalcaoSchema } from "./vendas-schema";

describe("registrarVendaBalcaoSchema", () => {
  it("aceita venda válida com um item", () => {
    const result = registrarVendaBalcaoSchema.safeParse({
      formaPagamentoId: "fp-1",
      itens: [{ produtoId: "prod-1", quantidade: 2 }],
    });

    expect(result.success).toBe(true);
  });

  it("aceita cliente e observações opcionais", () => {
    const result = registrarVendaBalcaoSchema.safeParse({
      formaPagamentoId: "fp-1",
      clienteId: "cli-1",
      observacoes: "Venda para cliente conhecido",
      itens: [{ produtoId: "prod-1", quantidade: 1 }],
    });

    expect(result.success).toBe(true);
  });

  it("rejeita venda sem forma de pagamento", () => {
    const result = registrarVendaBalcaoSchema.safeParse({
      formaPagamentoId: "",
      itens: [{ produtoId: "prod-1", quantidade: 1 }],
    });

    expect(result.success).toBe(false);
  });

  it("rejeita venda sem itens", () => {
    const result = registrarVendaBalcaoSchema.safeParse({
      formaPagamentoId: "fp-1",
      itens: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejeita quantidade zero ou negativa", () => {
    const zero = registrarVendaBalcaoSchema.safeParse({
      formaPagamentoId: "fp-1",
      itens: [{ produtoId: "prod-1", quantidade: 0 }],
    });
    const negativo = registrarVendaBalcaoSchema.safeParse({
      formaPagamentoId: "fp-1",
      itens: [{ produtoId: "prod-1", quantidade: -3 }],
    });

    expect(zero.success).toBe(false);
    expect(negativo.success).toBe(false);
  });

  it("rejeita produto duplicado no mesmo payload", () => {
    const result = registrarVendaBalcaoSchema.safeParse({
      formaPagamentoId: "fp-1",
      itens: [
        { produtoId: "prod-1", quantidade: 1 },
        { produtoId: "prod-1", quantidade: 2 },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const mensagens = result.error.issues.map((i) => i.message);
      expect(mensagens.some((m) => m.includes("repetido"))).toBe(true);
    }
  });

  it("não aceita precoUnitario vindo do payload (campo ignorado)", () => {
    const result = registrarVendaBalcaoSchema.safeParse({
      formaPagamentoId: "fp-1",
      itens: [{ produtoId: "prod-1", quantidade: 1, precoUnitario: 999 }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // O preço nunca é confiado ao frontend: o schema descarta o campo.
      expect((result.data.itens[0] as Record<string, unknown>).precoUnitario).toBeUndefined();
    }
  });
});
