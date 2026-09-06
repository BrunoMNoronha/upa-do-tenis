import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import {
  baixarEstoqueProdutoVenda,
  BaixarEstoqueProdutoParams,
  TipoMovimentacaoProduto,
  OrigemMovimentacaoProduto
} from "./movimentacao-estoque-produto-service";

describe("movimentacao-estoque-produto-service", () => {
  describe("baixarEstoqueProdutoVenda", () => {
    it("deve lançar erro se quantidade for <= 0", async () => {
      const tx = {} as Prisma.TransactionClient;
      const params: BaixarEstoqueProdutoParams = { produtoId: "1", quantidade: 0 };

      await expect(baixarEstoqueProdutoVenda(params, tx)).rejects.toMatchObject({
        name: "MovimentacaoEstoqueProdutoError",
        message: "A quantidade da baixa deve ser maior que zero.",
        status: 400
      });
    });

    it("deve lançar erro se produto não for encontrado", async () => {
      const tx = {
        produto: {
          findUnique: vi.fn().mockResolvedValue(null)
        }
      } as unknown as Prisma.TransactionClient;

      const params: BaixarEstoqueProdutoParams = { produtoId: "1", quantidade: 1 };

      await expect(baixarEstoqueProdutoVenda(params, tx)).rejects.toMatchObject({
        name: "MovimentacaoEstoqueProdutoError",
        message: "Produto não encontrado.",
        status: 404
      });
      expect(tx.produto.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
        select: { id: true, ativo: true, quantidadeEstoque: true }
      });
    });

    it("deve lançar erro se produto for inativo", async () => {
      const tx = {
        produto: {
          findUnique: vi.fn().mockResolvedValue({ id: "1", ativo: false, quantidadeEstoque: 10 })
        }
      } as unknown as Prisma.TransactionClient;

      const params: BaixarEstoqueProdutoParams = { produtoId: "1", quantidade: 1 };

      await expect(baixarEstoqueProdutoVenda(params, tx)).rejects.toMatchObject({
        name: "MovimentacaoEstoqueProdutoError",
        message: "Produto inativo não pode ser vendido.",
        status: 400
      });
    });

    it("deve lançar erro se estoque for insuficiente", async () => {
      const tx = {
        produto: {
          findUnique: vi.fn().mockResolvedValue({ id: "1", ativo: true, quantidadeEstoque: 10 }),
          updateMany: vi.fn().mockResolvedValue({ count: 0 })
        }
      } as unknown as Prisma.TransactionClient;

      const params: BaixarEstoqueProdutoParams = { produtoId: "1", quantidade: 15 };

      await expect(baixarEstoqueProdutoVenda(params, tx)).rejects.toMatchObject({
        name: "MovimentacaoEstoqueProdutoError",
        message: "Estoque insuficiente para a venda.",
        status: 409
      });
      expect(tx.produto.updateMany).toHaveBeenCalledWith({
        where: {
          id: "1",
          ativo: true,
          quantidadeEstoque: { gte: 15 },
        },
        data: {
          quantidadeEstoque: { decrement: 15 },
        },
      });
    });

    it("deve baixar estoque com sucesso", async () => {
      const tx = {
        produto: {
          findUnique: vi.fn().mockResolvedValue({ id: "1", ativo: true, quantidadeEstoque: 10 }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 })
        },
        movimentacaoEstoqueProduto: {
          create: vi.fn().mockResolvedValue({ id: "mov1" })
        }
      } as unknown as Prisma.TransactionClient;

      const params: BaixarEstoqueProdutoParams = {
        produtoId: "1",
        quantidade: 2,
        vendaId: "v1",
        itemVendaId: "iv1",
        observacao: "obs"
      };

      const res = await baixarEstoqueProdutoVenda(params, tx);

      expect(res).toEqual({ id: "mov1" });
      expect(tx.movimentacaoEstoqueProduto.create).toHaveBeenCalledWith({
        data: {
          produtoId: "1",
          tipo: TipoMovimentacaoProduto.VENDA,
          quantidade: 2,
          saldoAnterior: 10,
          saldoPosterior: 8,
          origem: OrigemMovimentacaoProduto.VENDA_BALCAO,
          vendaId: "v1",
          itemVendaId: "iv1",
          observacao: "obs",
        }
      });
    });
  });
});
