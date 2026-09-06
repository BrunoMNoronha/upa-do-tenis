import { describe, expect, it } from "vitest";

import { clienteAtualizarSchema } from "./clientes-schema";
import { formaPagamentoAtualizarSchema } from "./formas-pagamento-schema";
import { insumoAtualizarSchema } from "./insumos-schema";
import { servicoAtualizarSchema } from "./servicos-schema";

describe("servicoAtualizarSchema", () => {
  it("aceita atualização parcial", () => {
    const result = servicoAtualizarSchema.safeParse({ nome: "Troca de sola" });

    expect(result.success).toBe(true);
  });

  it("aceita o campo ativo", () => {
    const result = servicoAtualizarSchema.safeParse({ ativo: false });

    expect(result.success).toBe(true);
    expect(result.success && result.data.ativo).toBe(false);
  });

  it("rejeita nome curto demais", () => {
    const result = servicoAtualizarSchema.safeParse({ nome: "a" });

    expect(result.success).toBe(false);
  });

  it("rejeita preço negativo", () => {
    const result = servicoAtualizarSchema.safeParse({ precoBase: -10 });

    expect(result.success).toBe(false);
  });
});

describe("insumoAtualizarSchema", () => {
  it("aceita atualização parcial do cadastro", () => {
    const result = insumoAtualizarSchema.safeParse({ unidadeMedida: "par", ativo: true });

    expect(result.success).toBe(true);
  });

  it("descarta quantidadeEstoque: o saldo só muda por movimentação", () => {
    const result = insumoAtualizarSchema.safeParse({ nome: "Cola", quantidadeEstoque: 999 });

    expect(result.success).toBe(true);
    expect(result.success && "quantidadeEstoque" in result.data).toBe(false);
  });

  it("rejeita unidade de medida vazia", () => {
    const result = insumoAtualizarSchema.safeParse({ unidadeMedida: "" });

    expect(result.success).toBe(false);
  });
});

describe("formaPagamentoAtualizarSchema", () => {
  it("aceita atualização só do nome", () => {
    const result = formaPagamentoAtualizarSchema.safeParse({ nome: "PIX Loja" });

    expect(result.success).toBe(true);
  });

  it("aceita o campo ativo", () => {
    const result = formaPagamentoAtualizarSchema.safeParse({ ativo: false });

    expect(result.success).toBe(true);
  });

  it("rejeita tipo fora do enum", () => {
    const result = formaPagamentoAtualizarSchema.safeParse({ tipo: "BOLETO" });

    expect(result.success).toBe(false);
  });
});

describe("clienteAtualizarSchema", () => {
  it("aceita atualização só do nome", () => {
    const result = clienteAtualizarSchema.safeParse({ nome: "Maria" });

    expect(result.success).toBe(true);
  });

  it("sanitiza o telefone informado", () => {
    const result = clienteAtualizarSchema.safeParse({ telefone: "(11) 98888-7777" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.telefone).toBe("11988887777");
  });

  it("aceita o campo ativo", () => {
    const result = clienteAtualizarSchema.safeParse({ ativo: false });

    expect(result.success).toBe(true);
  });

  it("rejeita telefone inválido", () => {
    const result = clienteAtualizarSchema.safeParse({ telefone: "123" });

    expect(result.success).toBe(false);
  });
});
