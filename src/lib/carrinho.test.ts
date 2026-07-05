import { describe, it, expect } from "vitest";

import {
  adicionarItem,
  ajustarQuantidade,
  removerItem,
  subtotalItem,
  totalCarrinho,
  validarCarrinho,
  type ItemCarrinho,
} from "./carrinho";

const produtoA = { id: "prod-a", nome: "Cadarço 120cm", precoVenda: 15.9 };
const produtoB = { id: "prod-b", nome: "Palmilha Gel", precoVenda: 10.0 };

describe("adicionarItem", () => {
  it("adiciona item novo ao carrinho vazio", () => {
    const resultado = adicionarItem([], produtoA);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].produtoId).toBe("prod-a");
    expect(resultado[0].quantidade).toBe(1);
    expect(resultado[0].precoUnitario).toBe(15.9);
  });

  it("incrementa quantidade se produto já estiver no carrinho", () => {
    const base = adicionarItem([], produtoA);
    const resultado = adicionarItem(base, produtoA);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].quantidade).toBe(2);
  });

  it("adiciona produto diferente como novo item", () => {
    const base = adicionarItem([], produtoA);
    const resultado = adicionarItem(base, produtoB);

    expect(resultado).toHaveLength(2);
  });

  it("respeita quantidade personalizada ao adicionar", () => {
    const resultado = adicionarItem([], produtoA, 3);

    expect(resultado[0].quantidade).toBe(3);
  });
});

describe("ajustarQuantidade", () => {
  it("ajusta a quantidade de um item existente", () => {
    const itens = adicionarItem([], produtoA);
    const resultado = ajustarQuantidade(itens, "prod-a", 5);

    expect(resultado[0].quantidade).toBe(5);
  });

  it("não permite quantidade menor que 1", () => {
    const itens = adicionarItem([], produtoA);
    const resultado = ajustarQuantidade(itens, "prod-a", 0);

    expect(resultado[0].quantidade).toBe(1);
  });

  it("retorna lista inalterada se produtoId não existir", () => {
    const itens = adicionarItem([], produtoA);
    const resultado = ajustarQuantidade(itens, "inexistente", 5);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].quantidade).toBe(1);
  });
});

describe("removerItem", () => {
  it("remove item do carrinho", () => {
    let itens = adicionarItem([], produtoA);
    itens = adicionarItem(itens, produtoB);
    const resultado = removerItem(itens, "prod-a");

    expect(resultado).toHaveLength(1);
    expect(resultado[0].produtoId).toBe("prod-b");
  });

  it("retorna lista vazia ao remover único item", () => {
    const itens = adicionarItem([], produtoA);
    const resultado = removerItem(itens, "prod-a");

    expect(resultado).toHaveLength(0);
  });
});

describe("subtotalItem", () => {
  it("calcula subtotal arredondado corretamente", () => {
    const item: ItemCarrinho = {
      produtoId: "x",
      nome: "X",
      precoUnitario: 15.9,
      quantidade: 2,
    };

    expect(subtotalItem(item)).toBe(31.8);
  });

  it("lida com arredondamento de ponto flutuante", () => {
    const item: ItemCarrinho = {
      produtoId: "x",
      nome: "X",
      precoUnitario: 0.1,
      quantidade: 3,
    };

    // 0.1 + 0.1 + 0.1 = 0.30000000000000004 em float; esperamos 0.30
    expect(subtotalItem(item)).toBe(0.3);
  });
});

describe("totalCarrinho", () => {
  it("retorna zero para carrinho vazio", () => {
    expect(totalCarrinho([])).toBe(0);
  });

  it("soma subtotais de todos os itens", () => {
    let itens = adicionarItem([], produtoA, 2); // 31.80
    itens = adicionarItem(itens, produtoB, 3);  // 30.00

    expect(totalCarrinho(itens)).toBe(61.8);
  });
});

describe("validarCarrinho", () => {
  it("retorna null para carrinho válido", () => {
    const itens = adicionarItem([], produtoA);

    expect(validarCarrinho(itens)).toBeNull();
  });

  it("retorna erro para carrinho vazio", () => {
    expect(validarCarrinho([])).not.toBeNull();
  });

  it("retorna erro se item tiver preço zero", () => {
    const itens: ItemCarrinho[] = [
      { produtoId: "x", nome: "Sem Preço", precoUnitario: 0, quantidade: 1 },
    ];

    expect(validarCarrinho(itens)).not.toBeNull();
  });

  it("retorna erro se item tiver quantidade zero (estado inválido injetado)", () => {
    const itens: ItemCarrinho[] = [
      { produtoId: "x", nome: "X", precoUnitario: 10, quantidade: 0 },
    ];

    expect(validarCarrinho(itens)).not.toBeNull();
  });
});
