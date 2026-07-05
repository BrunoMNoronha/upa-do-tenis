import { describe, expect, it } from "vitest";

import { produtoAtualizarSchema, produtoFormSchema } from "./produtos-schema";

describe("produtoFormSchema", () => {
  it("aceita produto válido com preço numérico", () => {
    const result = produtoFormSchema.safeParse({
      nome: "Cadarço 120cm",
      descricao: "Par de cadarços",
      precoVenda: 15.9,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.precoVenda).toBe(15.9);
    }
  });

  it("sanitiza preço mascarado em BRL vindo do formulário", () => {
    const result = produtoFormSchema.safeParse({
      nome: "Palmilha Gel",
      precoVenda: "R$ 1.150,50",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.precoVenda).toBe(1150.5);
    }
  });

  it("converte preço vazio em zero", () => {
    const result = produtoFormSchema.safeParse({
      nome: "Graxa Incolor",
      precoVenda: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.precoVenda).toBe(0);
    }
  });

  it("rejeita preço negativo", () => {
    const result = produtoFormSchema.safeParse({
      nome: "Produto Inválido",
      precoVenda: -10,
    });

    expect(result.success).toBe(false);
  });

  it("rejeita nome muito curto", () => {
    const result = produtoFormSchema.safeParse({
      nome: "A",
      precoVenda: 10,
    });

    expect(result.success).toBe(false);
  });
});

describe("produtoAtualizarSchema", () => {
  it("aceita atualização parcial apenas com ativo", () => {
    const result = produtoAtualizarSchema.safeParse({ ativo: false });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ativo).toBe(false);
      expect(result.data.nome).toBeUndefined();
    }
  });

  it("sanitiza preço mascarado na atualização", () => {
    const result = produtoAtualizarSchema.safeParse({ precoVenda: "R$ 89,90" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.precoVenda).toBe(89.9);
    }
  });

  it("rejeita nome inválido na atualização", () => {
    const result = produtoAtualizarSchema.safeParse({ nome: "X" });

    expect(result.success).toBe(false);
  });
});
