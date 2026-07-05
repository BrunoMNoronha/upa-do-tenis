import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

import { registrarVendaBalcao, VendaBalcaoError } from "./vendas";

const prisma = new PrismaClient();

// IDs criados por teste, para limpeza isolada no banco de teste.
let formaPagamentoId: string;
let caixaId: string;
let produtoAId: string; // estoque 10, preço 15.90
let produtoBId: string; // estoque 3,  preço 10.00
let produtoInativoId: string; // estoque 5, inativo

async function limpar() {
  // Ordem segura de FKs (onDelete Restrict em Produto/Caixa).
  await prisma.movimentacaoEstoqueProduto.deleteMany();
  await prisma.movimentacaoCaixa.deleteMany();
  await prisma.itemVenda.deleteMany();
  await prisma.venda.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.caixa.deleteMany();
  await prisma.formaPagamento.deleteMany();
}

beforeEach(async () => {
  await limpar();

  const forma = await prisma.formaPagamento.create({
    data: { nome: "Dinheiro", tipo: "DINHEIRO", ativo: true },
  });
  formaPagamentoId = forma.id;

  const caixa = await prisma.caixa.create({
    data: { saldoInicial: 100, status: "ABERTO" },
  });
  caixaId = caixa.id;

  const produtoA = await prisma.produto.create({
    data: { nome: "Cadarço 120cm", precoVenda: 15.9, quantidadeEstoque: 10, ativo: true },
  });
  produtoAId = produtoA.id;

  const produtoB = await prisma.produto.create({
    data: { nome: "Palmilha Gel", precoVenda: 10, quantidadeEstoque: 3, ativo: true },
  });
  produtoBId = produtoB.id;

  const produtoInativo = await prisma.produto.create({
    data: { nome: "Graxa Descontinuada", precoVenda: 8, quantidadeEstoque: 5, ativo: false },
  });
  produtoInativoId = produtoInativo.id;
});

afterEach(async () => {
  await limpar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("registrarVendaBalcao", () => {
  it("cria Venda, ItemVenda, baixa estoque e MovimentacaoCaixa com estoque suficiente", async () => {
    const pagamentosAntes = await prisma.pagamento.count();

    const venda = await registrarVendaBalcao({
      formaPagamentoId,
      itens: [{ produtoId: produtoAId, quantidade: 2 }],
    });

    // Venda persistida com total calculado no backend (15.90 * 2 = 31.80).
    expect(venda).toBeTruthy();
    expect(Number(venda!.valorTotal)).toBe(31.8);
    expect(venda!.numero).toMatch(/^VD-\d{8}-\d{4}$/);

    // Item da venda.
    const itens = await prisma.itemVenda.findMany({ where: { vendaId: venda!.id } });
    expect(itens).toHaveLength(1);
    expect(Number(itens[0].precoUnitario)).toBe(15.9);
    expect(Number(itens[0].precoTotal)).toBe(31.8);

    // Estoque baixado: 10 - 2 = 8.
    const produto = await prisma.produto.findUnique({ where: { id: produtoAId } });
    expect(Number(produto!.quantidadeEstoque)).toBe(8);

    // Movimentação de estoque rastreável.
    const movEstoque = await prisma.movimentacaoEstoqueProduto.findMany({
      where: { vendaId: venda!.id },
    });
    expect(movEstoque).toHaveLength(1);
    expect(Number(movEstoque[0].saldoAnterior)).toBe(10);
    expect(Number(movEstoque[0].saldoPosterior)).toBe(8);
    expect(movEstoque[0].origem).toBe("VENDA_BALCAO");

    // Entrada de caixa com origem própria e vínculo à venda.
    const movCaixa = await prisma.movimentacaoCaixa.findMany({ where: { vendaId: venda!.id } });
    expect(movCaixa).toHaveLength(1);
    expect(movCaixa[0].tipo).toBe("ENTRADA");
    expect(movCaixa[0].origem).toBe("VENDA_BALCAO");
    expect(Number(movCaixa[0].valor)).toBe(31.8);

    // Não cria registro em Pagamento (fluxo de OS intocado).
    const pagamentosDepois = await prisma.pagamento.count();
    expect(pagamentosDepois).toBe(pagamentosAntes);
  });

  it("calcula total no backend a partir de Produto.precoVenda com múltiplos itens", async () => {
    const venda = await registrarVendaBalcao({
      formaPagamentoId,
      itens: [
        { produtoId: produtoAId, quantidade: 2 }, // 31.80
        { produtoId: produtoBId, quantidade: 3 }, // 30.00
      ],
    });

    expect(Number(venda!.valorTotal)).toBe(61.8);

    const produtoA = await prisma.produto.findUnique({ where: { id: produtoAId } });
    const produtoB = await prisma.produto.findUnique({ where: { id: produtoBId } });
    expect(Number(produtoA!.quantidadeEstoque)).toBe(8);
    expect(Number(produtoB!.quantidadeEstoque)).toBe(0);
  });

  it("rejeita venda sem caixa aberto sem persistir nada", async () => {
    await prisma.caixa.update({ where: { id: caixaId }, data: { status: "FECHADO" } });

    await expect(
      registrarVendaBalcao({
        formaPagamentoId,
        itens: [{ produtoId: produtoAId, quantidade: 1 }],
      })
    ).rejects.toBeInstanceOf(VendaBalcaoError);

    expect(await prisma.venda.count()).toBe(0);
    expect(await prisma.movimentacaoCaixa.count()).toBe(0);
    const produto = await prisma.produto.findUnique({ where: { id: produtoAId } });
    expect(Number(produto!.quantidadeEstoque)).toBe(10);
  });

  it("rejeita venda com estoque insuficiente sem persistir nada", async () => {
    await expect(
      registrarVendaBalcao({
        formaPagamentoId,
        itens: [{ produtoId: produtoBId, quantidade: 999 }],
      })
    ).rejects.toBeInstanceOf(VendaBalcaoError);

    expect(await prisma.venda.count()).toBe(0);
    expect(await prisma.movimentacaoCaixa.count()).toBe(0);
    expect(await prisma.movimentacaoEstoqueProduto.count()).toBe(0);
    const produto = await prisma.produto.findUnique({ where: { id: produtoBId } });
    expect(Number(produto!.quantidadeEstoque)).toBe(3);
  });

  it("reverte tudo quando um item entre vários tem estoque insuficiente", async () => {
    await expect(
      registrarVendaBalcao({
        formaPagamentoId,
        itens: [
          { produtoId: produtoAId, quantidade: 2 }, // ok
          { produtoId: produtoBId, quantidade: 999 }, // estoura
        ],
      })
    ).rejects.toBeInstanceOf(VendaBalcaoError);

    // Atomicidade: o produto A não pode ter sido baixado.
    const produtoA = await prisma.produto.findUnique({ where: { id: produtoAId } });
    expect(Number(produtoA!.quantidadeEstoque)).toBe(10);
    expect(await prisma.venda.count()).toBe(0);
    expect(await prisma.itemVenda.count()).toBe(0);
    expect(await prisma.movimentacaoEstoqueProduto.count()).toBe(0);
    expect(await prisma.movimentacaoCaixa.count()).toBe(0);
  });

  it("rejeita venda de produto inativo sem persistir nada", async () => {
    await expect(
      registrarVendaBalcao({
        formaPagamentoId,
        itens: [{ produtoId: produtoInativoId, quantidade: 1 }],
      })
    ).rejects.toBeInstanceOf(VendaBalcaoError);

    expect(await prisma.venda.count()).toBe(0);
    const produto = await prisma.produto.findUnique({ where: { id: produtoInativoId } });
    expect(Number(produto!.quantidadeEstoque)).toBe(5);
  });

  it("rejeita forma de pagamento inexistente", async () => {
    await expect(
      registrarVendaBalcao({
        formaPagamentoId: "forma-inexistente",
        itens: [{ produtoId: produtoAId, quantidade: 1 }],
      })
    ).rejects.toBeInstanceOf(VendaBalcaoError);

    expect(await prisma.venda.count()).toBe(0);
  });
});
