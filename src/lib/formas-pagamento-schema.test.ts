import { describe, it, expect } from "vitest";
import { formaPagamentoFormSchema } from "./formas-pagamento-schema";
import { TIPOS_FORMA_PAGAMENTO } from "./formas-pagamento-tipos";

describe("formaPagamentoFormSchema", () => {
  it.each(TIPOS_FORMA_PAGAMENTO)("aceita o tipo válido %s", (tipo) => {
    const result = formaPagamentoFormSchema.safeParse({ nome: "Forma de Teste", tipo });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tipo).toBe(tipo);
    }
  });

  it("rejeita string desconhecida (ex: 'Cash')", () => {
    const result = formaPagamentoFormSchema.safeParse({ nome: "Dinheiro", tipo: "Cash" });

    expect(result.success).toBe(false);
  });

  it("rejeita string desconhecida com grafia divergente (ex: 'dinheiro' minúsculo)", () => {
    const result = formaPagamentoFormSchema.safeParse({ nome: "Dinheiro", tipo: "dinheiro" });

    expect(result.success).toBe(false);
  });

  it("rejeita tipo vazio (string vazia)", () => {
    const result = formaPagamentoFormSchema.safeParse({ nome: "Dinheiro", tipo: "" });

    expect(result.success).toBe(false);
  });

  it("rejeita ausência do campo tipo", () => {
    const result = formaPagamentoFormSchema.safeParse({ nome: "Dinheiro" });

    expect(result.success).toBe(false);
  });
});
