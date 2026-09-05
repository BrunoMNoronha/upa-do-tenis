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
const produtoSemPreco = { id: "prod-sp", nome: "Sem Preço", precoVenda: 0 };
const produtoPrecoNegativo = { id: "prod-pn", nome: "Preço Negativo", precoVenda: -5 };

// ── adicionarItem ─────────────────────────────────────────────────────────────

describe("adicionarItem", () => {
  it("adiciona item novo ao carrinho vazio", () => {
    const res = adicionarItem([], produtoA);

    expect(res.ok).toBe(true);
    expect(res.itens).toHaveLength(1);
    expect(res.itens[0].produtoId).toBe("prod-a");
    expect(res.itens[0].quantidade).toBe(1);
    expect(res.itens[0].precoUnitario).toBe(15.9);
  });

  it("incrementa quantidade se produto já estiver no carrinho", () => {
    const base = adicionarItem([], produtoA);
    expect(base.ok).toBe(true);
    const res = adicionarItem(base.itens, produtoA);

    expect(res.ok).toBe(true);
    expect(res.itens).toHaveLength(1);
    expect(res.itens[0].quantidade).toBe(2);
  });

  it("adiciona produto diferente como novo item", () => {
    const base = adicionarItem([], produtoA);
    const res = adicionarItem(base.itens, produtoB);

    expect(res.ok).toBe(true);
    expect(res.itens).toHaveLength(2);
  });

  it("respeita quantidade personalizada ao adicionar", () => {
    const res = adicionarItem([], produtoA, null, 3);

    expect(res.ok).toBe(true);
    expect(res.itens[0].quantidade).toBe(3);
  });

  // ── Restrições de preço ─────────────────────────────────────────────────

  it("bloqueia produto com preço zero", () => {
    const res = adicionarItem([], produtoSemPreco);

    expect(res.ok).toBe(false);
    expect(res.itens).toHaveLength(0);
    if (res.ok) throw new Error("Esperava falha ao adicionar produto sem preço.");
    expect(res.motivo).toBeTruthy();
  });

  it("bloqueia produto com preço negativo", () => {
    const res = adicionarItem([], produtoPrecoNegativo);

    expect(res.ok).toBe(false);
    expect(res.itens).toHaveLength(0);
  });

  // ── Restrições de estoque ───────────────────────────────────────────────

  it("bloqueia produto com estoque zero (estoqueDisponivel = 0)", () => {
    const res = adicionarItem([], produtoA, 0);

    expect(res.ok).toBe(false);
    expect(res.itens).toHaveLength(0);
    if (res.ok) throw new Error("Esperava falha ao adicionar produto sem estoque.");
    expect(res.motivo).toMatch(/sem estoque/i);
  });

  it("bloqueia produto com estoque negativo", () => {
    const res = adicionarItem([], produtoA, -3);

    expect(res.ok).toBe(false);
  });

  it("permite adicionar quando estoque for null (sem controle)", () => {
    const res = adicionarItem([], produtoA, null);

    expect(res.ok).toBe(true);
    expect(res.itens[0].quantidade).toBe(1);
  });

  it("bloqueia quando quantidade no carrinho já atingiu o estoque máximo", () => {
    // Estoque = 2, já tem 2 no carrinho
    const base = adicionarItem([], produtoA, 2, 2);
    expect(base.ok).toBe(true);
    const res = adicionarItem(base.itens, produtoA, 2);

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("Esperava falha ao atingir o limite de estoque.");
    expect(res.motivo).toBeTruthy();
  });

  it("adiciona até o limite quando não ultrapassa o estoque", () => {
    // Estoque = 5, adiciona 5
    const res = adicionarItem([], produtoA, 5, 5);

    expect(res.ok).toBe(true);
    expect(res.itens[0].quantidade).toBe(5);
  });

  it("adiciona apenas até o limite de estoque quando incremento ultrapassaria", () => {
    // Estoque = 3, já tem 2 no carrinho, tenta adicionar +2 — deve adicionar só +1
    const base = adicionarItem([], produtoA, 3, 2);
    expect(base.ok).toBe(true);
    const res = adicionarItem(base.itens, produtoA, 3, 2);

    expect(res.ok).toBe(true);
    expect(res.itens[0].quantidade).toBe(3);
  });
});

// ── ajustarQuantidade ─────────────────────────────────────────────────────────

describe("ajustarQuantidade", () => {
  it("ajusta a quantidade de um item existente", () => {
    const { itens } = adicionarItem([], produtoA);
    const resultado = ajustarQuantidade(itens, "prod-a", 5);

    expect(resultado[0].quantidade).toBe(5);
  });

  it("não permite quantidade menor que 1", () => {
    const { itens } = adicionarItem([], produtoA);
    const resultado = ajustarQuantidade(itens, "prod-a", 0);

    expect(resultado[0].quantidade).toBe(1);
  });

  it("retorna lista inalterada se produtoId não existir", () => {
    const { itens } = adicionarItem([], produtoA);
    const resultado = ajustarQuantidade(itens, "inexistente", 5);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].quantidade).toBe(1);
  });

  it("limita ao estoque máximo quando fornecido", () => {
    const { itens } = adicionarItem([], produtoA);
    const resultado = ajustarQuantidade(itens, "prod-a", 10, 4);

    expect(resultado[0].quantidade).toBe(4);
  });

  it("permite ajuste dentro do estoque máximo", () => {
    const { itens } = adicionarItem([], produtoA);
    const resultado = ajustarQuantidade(itens, "prod-a", 3, 5);

    expect(resultado[0].quantidade).toBe(3);
  });

  it("ignora o limite se estoqueMaximo for null", () => {
    const { itens } = adicionarItem([], produtoA);
    const resultado = ajustarQuantidade(itens, "prod-a", 999, null);

    expect(resultado[0].quantidade).toBe(999);
  });
});

// ── removerItem ───────────────────────────────────────────────────────────────

describe("removerItem", () => {
  it("remove item do carrinho", () => {
    const { itens: base } = adicionarItem([], produtoA);
    const { itens: comB } = adicionarItem(base, produtoB);
    const resultado = removerItem(comB, "prod-a");

    expect(resultado).toHaveLength(1);
    expect(resultado[0].produtoId).toBe("prod-b");
  });

  it("retorna lista vazia ao remover único item", () => {
    const { itens } = adicionarItem([], produtoA);
    const resultado = removerItem(itens, "prod-a");

    expect(resultado).toHaveLength(0);
  });
});

// ── subtotalItem ──────────────────────────────────────────────────────────────

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

// ── totalCarrinho ─────────────────────────────────────────────────────────────

describe("totalCarrinho", () => {
  it("retorna zero para carrinho vazio", () => {
    expect(totalCarrinho([])).toBe(0);
  });

  it("soma subtotais de todos os itens", () => {
    const { itens: base } = adicionarItem([], produtoA, null, 2); // 31.80
    const { itens } = adicionarItem(base, produtoB, null, 3);      // 30.00

    expect(totalCarrinho(itens)).toBe(61.8);
  });
});

// ── validarCarrinho ───────────────────────────────────────────────────────────

describe("validarCarrinho", () => {
  it("retorna null para carrinho válido", () => {
    const { itens } = adicionarItem([], produtoA);

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
