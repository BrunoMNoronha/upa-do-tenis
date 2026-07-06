import { describe, it, expect } from "vitest";
import { formaPagamentoFormSchema } from "./formas-pagamento-schema";

describe("formaPagamentoFormSchema", () => {
  it("aceita tipo DINHEIRO e mantém o valor", () => {
    const result = formaPagamentoFormSchema.safeParse({ nome: "Dinheiro", tipo: "DINHEIRO" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tipo).toBe("DINHEIRO");
    }
  });

  it("normaliza tipo em minúsculas ou misto para maiúsculas", () => {
    const result = formaPagamentoFormSchema.safeParse({ nome: "Dinheiro", tipo: "dinheiro" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tipo).toBe("DINHEIRO");
    }
  });

  it("rejeita tipo vazio (string vazia)", () => {
    const result = formaPagamentoFormSchema.safeParse({ nome: "Dinheiro", tipo: "" });

    expect(result.success).toBe(false);
  });

  it("rejeita tipo composto apenas por espaços", () => {
    const result = formaPagamentoFormSchema.safeParse({ nome: "Dinheiro", tipo: "   " });

    expect(result.success).toBe(false);
  });

  it("rejeita ausência do campo tipo", () => {
    const result = formaPagamentoFormSchema.safeParse({ nome: "Dinheiro" });

    expect(result.success).toBe(false);
  });

  it("remove espaços nas bordas do tipo antes de normalizar", () => {
    const result = formaPagamentoFormSchema.safeParse({ nome: "PIX", tipo: "  pix  " });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tipo).toBe("PIX");
    }
  });
});
